// server/game.js
const CONSTANTS = require('./constants');
const WEAPONS = require('./weapon');
const { createPlayer } = require('./player');

function isCollidingRectCircle(rect, circle) {
    const distX = Math.abs(circle.x - rect.x - rect.width / 2);
    const distY = Math.abs(circle.y - rect.y - rect.height / 2);
    if (distX > (rect.width / 2 + circle.radius)) { return false; }
    if (distY > (rect.height / 2 + circle.radius)) { return false; }
    if (distX <= (rect.width / 2)) { return true; }
    if (distY <= (rect.height / 2)) { return true; }
    const dx = distX - rect.width / 2;
    const dy = distY - rect.height / 2;
    return (dx * dx + dy * dy <= (circle.radius * circle.radius));
}

function isCollidingCircleCircle(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < circle1.radius + circle2.radius;
}

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

    removePlayer(socket) {
        if (this.players[socket.id]) {
            delete this.players[socket.id];
            this.io.emit('playerDisconnected', socket.id);
        }
    }

    handlePlayerInput(id, input) {
        const player = this.players[id];
        if (!player || player.isDead) return;

        const potentialPosition = { x: player.x, y: player.y, radius: player.radius };
        if (input.keys.a) potentialPosition.x -= player.speed;
        if (input.keys.d) potentialPosition.x += player.speed;
        if (input.keys.w) potentialPosition.y -= player.speed;
        if (input.keys.s) potentialPosition.y += player.speed;

        potentialPosition.x = Math.max(player.radius, Math.min(CONSTANTS.MAP_WIDTH - player.radius, potentialPosition.x));
        potentialPosition.y = Math.max(player.radius, Math.min(CONSTANTS.MAP_HEIGHT - player.radius, potentialPosition.y));

        let collision = false;
        for (const wall of this.walls) {
            if (isCollidingRectCircle(wall, potentialPosition)) {
                collision = true;
                break;
            }
        }
        if (!collision) {
            player.x = potentialPosition.x;
            player.y = potentialPosition.y;
        }

        player.angle = input.angle;

        if (input.isShooting) {
            const weapon = WEAPONS[player.weapon];
            if (weapon && Date.now() - player.lastShotTime > weapon.fireRate) {
                player.lastShotTime = Date.now();

                if (weapon.burstCount > 1) {
                    for (let i = 0; i < weapon.burstCount; i++) {
                        setTimeout(() => {
                            if (this.players[id] && !this.players[id].isDead) {
                                this.createBullet(player, weapon);
                            }
                        }, i * weapon.burstDelay);
                    }
                } else {
                    const bulletCount = weapon.bulletCount || 1;
                    for (let i = 0; i < bulletCount; i++) {
                        this.createBullet(player, weapon);
                    }
                }
            }
        }
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

    createBullet(player, weapon) {
        const spread = weapon.spread || 0;
        const angle = player.angle + (Math.random() - 0.5) * spread;
        const bulletId = `bullet-${this.bulletIdCounter++}`;
        
        this.bullets[bulletId] = {
            ownerId: player.id,
            x: player.x + Math.cos(angle) * (player.radius + 5),
            y: player.y + Math.sin(angle) * (player.radius + 5),
            velocityX: Math.cos(angle) * weapon.speed,
            velocityY: Math.sin(angle) * weapon.speed,
            radius: 5,
            color: player.color,
            damage: weapon.damage,
            ricochetsLeft: CONSTANTS.BULLET_MAX_RICOCHETS,
        };
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
        for (const id in this.grenades) {
            const grenade = this.grenades[id];
            grenade.x += grenade.velocityX;
            grenade.y += grenade.velocityY;
            grenade.velocityX *= 0.98;
            grenade.velocityY *= 0.98;
        }

        for (const id in this.bullets) {
            const bullet = this.bullets[id];
            bullet.x += bullet.velocityX;
            bullet.y += bullet.velocityY;

            let bulletRemoved = false;
            for (const wall of this.walls) {
                if (isCollidingRectCircle(wall, bullet)) {
                    if (bullet.ricochetsLeft > 0) {
                        bullet.ricochetsLeft--;
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

            if (bullet.x < 0 || bullet.x > CONSTANTS.MAP_WIDTH || bullet.y < 0 || bullet.y > CONSTANTS.MAP_HEIGHT) {
                delete this.bullets[id];
            }
        }

        for (const id in this.players) {
            const player = this.players[id];
            if (player.isDead && Date.now() > player.respawnTime) {
                player.isDead = false;
                player.health = CONSTANTS.PLAYER_HEALTH;
                player.x = Math.floor(Math.random() * (CONSTANTS.MAP_WIDTH - 200)) + 100;
                player.y = Math.floor(Math.random() * (CONSTANTS.MAP_HEIGHT - 200)) + 100;
                player.weapon = 'pistol';
                player.grenades = 2;
            }
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
    
    createMazeWalls(mapWidth, mapHeight, cols, rows, wallThickness) {
        const mazeWalls = [];
        mazeWalls.push({ x: 0, y: 0, width: mapWidth, height: wallThickness });
        mazeWalls.push({ x: 0, y: mapHeight - wallThickness, width: mapWidth, height: wallThickness });
        mazeWalls.push({ x: 0, y: 0, width: wallThickness, height: mapHeight });
        mazeWalls.push({ x: mapWidth - wallThickness, y: 0, width: wallThickness, height: mapHeight });
        const cellWidth = mapWidth / cols;
        const cellHeight = mapHeight / rows;
        for (let i = 0; i < 40; i++) {
            const x = Math.floor(Math.random() * cols) * cellWidth;
            const y = Math.floor(Math.random() * rows) * cellHeight;
            if (Math.random() > 0.5) {
                mazeWalls.push({ x, y, width: cellWidth * (Math.floor(Math.random() * 3) + 1), height: wallThickness });
            } else {
                mazeWalls.push({ x, y, width: wallThickness, height: cellHeight * (Math.floor(Math.random() * 2) + 1) });
            }
        }
        return mazeWalls;
    }
}

module.exports = Game;
