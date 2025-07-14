// server/game.js
const CONSTANTS = require('./constants');
const WEAPONS = require('./weapon');
const { createPlayer } = require('./player');

function isCollidingRectCircle(rect, circle) { /* ... (giữ nguyên) */ }
function isCollidingCircleCircle(circle1, circle2) { /* ... (giữ nguyên) */ }

class Game {
    constructor(io) {
        this.io = io;
        this.players = {};
        this.bullets = {};
        this.grenades = {};
        this.walls = this.createMazeWalls(CONSTANTS.MAP_WIDTH, CONSTANTS.MAP_HEIGHT, 16, 12, 20);
        this.jumpPads = [
            { x: 200, y: 200, width: 50, height: 50, force: { x: 0, y: -CONSTANTS.JUMP_PAD_POWER } },
            { x: 1350, y: 950, width: 50, height: 50, force: { x: 0, y: CONSTANTS.JUMP_PAD_POWER } },
        ];
        this.bulletIdCounter = 0;
        this.grenadeIdCounter = 0;
    }

    addPlayer(socket, username) {
        const newPlayer = createPlayer(socket.id, username);
        this.players[socket.id] = newPlayer;
        socket.emit('initialState', {
            players: this.players,
            walls: this.walls,
            jumpPads: this.jumpPads,
        });
        socket.broadcast.emit('newPlayer', newPlayer);
    }

    removePlayer(socket) { /* ... (giữ nguyên) */ }

    handlePlayerInput(id, input) {
        const player = this.players[id];
        if (!player || player.isDead) return;
        // ... (logic di chuyển và va chạm tường giữ nguyên)
        player.angle = input.angle;
        // ... (logic bắn súng theo đợt giữ nguyên)
    }

    handleThrowGrenade(id) {
        const player = this.players[id];
        if (!player || player.isDead || player.grenades <= 0 || Date.now() - player.lastGrenadeTime < CONSTANTS.GRENADE_COOLDOWN) return;

        player.grenades--;
        player.lastGrenadeTime = Date.now();
        const grenadeId = `grenade-${this.grenadeIdCounter++}`;
        const angle = player.angle;
        const grenade = {
            id: grenadeId,
            ownerId: player.id,
            x: player.x + Math.cos(angle) * (player.radius + 5),
            y: player.y + Math.sin(angle) * (player.radius + 5),
            velocityX: Math.cos(angle) * CONSTANTS.GRENADE_SPEED,
            velocityY: Math.sin(angle) * CONSTANTS.GRENADE_SPEED,
            radius: 8,
        };
        this.grenades[grenadeId] = grenade;

        setTimeout(() => {
            this.explodeGrenade(grenadeId);
        }, CONSTANTS.GRENADE_FUSE_TIME);
    }

    explodeGrenade(grenadeId) {
        const grenade = this.grenades[grenadeId];
        if (!grenade) return;

        this.io.emit('explosion', { x: grenade.x, y: grenade.y, radius: CONSTANTS.GRENADE_RADIUS });

        for (const id in this.players) {
            const player = this.players[id];
            if (player.isDead) continue;
            const distance = Math.sqrt((player.x - grenade.x) ** 2 + (player.y - grenade.y) ** 2);
            if (distance < CONSTANTS.GRENADE_RADIUS + player.radius) {
                this.damagePlayer(player, CONSTANTS.GRENADE_DAMAGE, this.players[grenade.ownerId]);
            }
        }
        delete this.grenades[grenadeId];
    }

    damagePlayer(victim, damage, killer) {
        if (victim.isDead) return;
        victim.health -= damage;
        if (victim.health <= 0) {
            victim.health = 0;
            victim.isDead = true;
            victim.respawnTime = Date.now() + CONSTANTS.PLAYER_RESPAWN_TIME;
            this.io.emit('playerDied', {
                victim: { username: victim.username, color: victim.color },
                killer: killer ? { username: killer.username, color: killer.color } : null,
            });
            if (killer && killer.id !== victim.id) {
                killer.score = (killer.score || 0) + 1;
            }
        }
    }

    update() {
        // Cập nhật lựu đạn
        for (const id in this.grenades) {
            const grenade = this.grenades[id];
            grenade.x += grenade.velocityX;
            grenade.y += grenade.velocityY;
            grenade.velocityX *= 0.98; // Ma sát
            grenade.velocityY *= 0.98;
        }

        // Cập nhật đạn
        for (const id in this.bullets) {
            const bullet = this.bullets[id];
            bullet.x += bullet.velocityX;
            bullet.y += bullet.velocityY;

            let bulletRemoved = false;
            // Va chạm tường (Ricochet)
            for (const wall of this.walls) {
                if (isCollidingRectCircle(wall, bullet)) {
                    if (bullet.ricochetsLeft > 0) {
                        bullet.ricochetsLeft--;
                        // Xác định va chạm ngang hay dọc để đảo ngược vận tốc
                        const overlapX = (bullet.x > wall.x && bullet.x < wall.x + wall.width);
                        const overlapY = (bullet.y > wall.y && bullet.y < wall.y + wall.height);
                        if (overlapX) bullet.velocityY *= -1;
                        if (overlapY) bullet.velocityX *= -1;
                    } else {
                        delete this.bullets[id];
                        bulletRemoved = true;
                    }
                    this.io.emit('bulletImpact', { x: bullet.x, y: bullet.y });
                    break;
                }
            }
            if (bulletRemoved) continue;

            // Va chạm người chơi (bao gồm cả tự bắn)
            for (const playerId in this.players) {
                const player = this.players[playerId];
                if (!player.isDead && isCollidingCircleCircle(bullet, player)) {
                    this.damagePlayer(player, bullet.damage, this.players[bullet.ownerId]);
                    delete this.bullets[id];
                    bulletRemoved = true;
                    this.io.emit('bulletImpact', { x: bullet.x, y: bullet.y });
                    break;
                }
            }
            if (bulletRemoved) continue;
            // ... (xóa đạn khi ra khỏi màn hình)
        }

        // Cập nhật người chơi
        for (const id in this.players) {
            const player = this.players[id];
            // Hồi sinh
            if (player.isDead && Date.now() > player.respawnTime) {
                player.isDead = false;
                player.health = CONSTANTS.PLAYER_HEALTH;
                player.x = Math.floor(Math.random() * (CONSTANTS.MAP_WIDTH - 200)) + 100;
                player.y = Math.floor(Math.random() * (CONSTANTS.MAP_HEIGHT - 200)) + 100;
                player.weapon = 'pistol';
                player.grenades = 2;
            }
            // Bệ nhảy
            for (const pad of this.jumpPads) {
                if (!player.isDead && isCollidingRectCircle(pad, player)) {
                    player.x += pad.force.x;
                    player.y += pad.force.y;
                }
            }
        }
    }

    getState() {
        return {
            players: this.players,
            bullets: this.bullets,
            grenades: this.grenades,
        };
    }
    
    // ... (createBullet, createMazeWalls, spawnItem giữ nguyên)
}

module.exports = Game;
