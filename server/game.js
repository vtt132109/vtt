// server/game.js
const CONSTANTS = require('./constants');
const WEAPONS = require('./weapon');
const { createPlayer } = require('./player');

// ... (Các hàm isColliding giữ nguyên)
function isCollidingRectCircle(rect, circle) { /* ... */ }
function isCollidingCircleCircle(circle1, circle2) { /* ... */ }


class Game {
    constructor(io) {
        // ... (constructor giữ nguyên)
        this.io = io;
        this.players = {};
        this.bullets = {};
        this.items = {};
        this.destructibles = {};
        this.walls = [
            { x: 300, y: 200, width: 50, height: 800 },
            { x: 1250, y: 200, width: 50, height: 800 },
            { x: 600, y: 575, width: 400, height: 50 }
        ];
        this.bulletIdCounter = 0;
        this.itemIdCounter = 0;
        this.init();
    }

    init() {
        // ... (init giữ nguyên)
        for (let i = 0; i < 5; i++) this.spawnItem();
        this.destructibles = {
            'barrel1': { id: 'barrel1', x: 800, y: 600, radius: 20, health: 50, maxHealth: 50, active: true },
            'barrel2': { id: 'barrel2', x: 400, y: 800, radius: 20, health: 50, maxHealth: 50, active: true },
            'barrel3': { id: 'barrel3', x: 1200, y: 400, radius: 20, health: 50, maxHealth: 50, active: true },
        };
    }

    addPlayer(socket, data) {
        // ... (addPlayer giữ nguyên)
        const newPlayer = createPlayer(socket.id, data.username);
        this.players[socket.id] = newPlayer;
        socket.emit('initialState', {
            players: this.players,
            walls: this.walls,
            items: this.items,
            destructibles: this.destructibles
        });
        socket.broadcast.emit('newPlayer', newPlayer);
    }

    removePlayer(socket) {
        // ... (removePlayer giữ nguyên)
        if (this.players[socket.id]) {
            console.log(`${this.players[socket.id].username} đã ngắt kết nối.`);
            delete this.players[socket.id];
            this.io.emit('playerDisconnected', socket.id);
        }
    }

    // ==================================================================
    // HÀM QUAN TRỌNG NHẤT - ĐÃ THÊM LOG GỠ LỖI
    // ==================================================================
    handlePlayerInput(id, input) {
        const player = this.players[id];
        if (!player || player.health <= 0 || player.isDashing) return;

        // --- XỬ LÝ DI CHUYỂN ---
        // (Logic di chuyển giữ nguyên)
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

        // --- XỬ LÝ HƯỚNG ---
        player.angle = input.angle;

        // --- XỬ LÝ BẮN ---
        if (input.mouseDown) {
            const weapon = WEAPONS[player.weapon];
            
            // Log chi tiết để gỡ lỗi
            console.log(`--- SHOOT ATTEMPT by ${player.username} ---`);
            if (!weapon) {
                console.log(`ERROR: Weapon "${player.weapon}" not found!`);
                return; // Dừng lại nếu vũ khí không hợp lệ
            }
            
            const timeSinceLastShot = Date.now() - player.lastShotTime;
            const canShoot = timeSinceLastShot > weapon.fireRate;

            console.log(`Weapon: ${player.weapon} | MouseDown: ${input.mouseDown}`);
            console.log(`Time since last shot: ${timeSinceLastShot}ms | Fire rate: ${weapon.fireRate}ms`);
            console.log(`Can shoot: ${canShoot}`);

            if (canShoot) {
                console.log(`   >>> SUCCESS! Firing ${weapon.name}.`);
                player.lastShotTime = Date.now();
                for (let i = 0; i < weapon.bulletCount; i++) {
                    const angle = player.angle + (Math.random() - 0.5) * weapon.spread;
                    const bulletId = `bullet-${this.bulletIdCounter++}`;
                    this.bullets[bulletId] = {
                        id: bulletId,
                        ownerId: player.id,
                        x: player.x + Math.cos(angle) * (player.radius + 5),
                        y: player.y + Math.sin(angle) * (player.radius + 5),
                        velocityX: Math.cos(angle) * weapon.speed,
                        velocityY: Math.sin(angle) * weapon.speed,
                        damage: weapon.damage,
                        color: player.color,
                        radius: 5,
                    };
                }
            }
            console.log('--- END SHOOT ATTEMPT ---');
        }
    }

    handleDash(id) {
        // ... (handleDash giữ nguyên)
        const player = this.players[id];
        if (!player || player.health <= 0 || Date.now() - player.lastDashTime < CONSTANTS.DASH_COOLDOWN) return;
        
        player.lastShotTime = Date.now();
        player.isDashing = true;
        const dashSpeed = player.speed * CONSTANTS.DASH_SPEED_MULTIPLIER;
        player.dashVelocityX = Math.cos(player.angle) * dashSpeed;
        player.dashVelocityY = Math.sin(player.angle) * dashSpeed;

        setTimeout(() => {
            if (this.players[id]) this.players[id].isDashing = false;
        }, CONSTANTS.DASH_DURATION);
    }

    handleChatMessage(id, msg) {
        // ... (handleChatMessage giữ nguyên)
        const player = this.players[id];
        if (msg && msg.trim().length > 0 && player) {
            this.io.emit('chatMessage', {
                username: player.username,
                message: msg.substring(0, 100),
                color: player.color
            });
        }
    }

    update() {
        // ... (update giữ nguyên)
        for (const id in this.players) {
            const player = this.players[id];
            if (player.isDashing) {
                player.x += player.dashVelocityX;
                player.y += player.dashVelocityY;
                player.x = Math.max(player.radius, Math.min(CONSTANTS.MAP_WIDTH - player.radius, player.x));
                player.y = Math.max(player.radius, Math.min(CONSTANTS.MAP_HEIGHT - player.radius, player.y));
            }
        }

        for (const id in this.bullets) {
            const bullet = this.bullets[id];
            bullet.x += bullet.velocityX;
            bullet.y += bullet.velocityY;

            let bulletRemoved = false;

            for (const destId in this.destructibles) {
                const destructible = this.destructibles[destId];
                if (destructible.active && isCollidingCircleCircle(bullet, destructible)) {
                    destructible.health -= bullet.damage;
                    delete this.bullets[id];
                    bulletRemoved = true;
                    if (destructible.health <= 0) {
                        destructible.active = false;
                        this.io.emit('destructibleDestroyed', destId);
                        setTimeout(() => {
                            destructible.active = true;
                            destructible.health = destructible.maxHealth;
                            this.io.emit('destructibleRespawned', destId);
                        }, 20000);
                    }
                    break;
                }
            }
            if (bulletRemoved) continue;

            for (const wall of this.walls) {
                if (isCollidingRectCircle(wall, bullet)) {
                    delete this.bullets[id];
                    bulletRemoved = true;
                    break;
                }
            }
            if (bulletRemoved) continue;

            for (const playerId in this.players) {
                const player = this.players[playerId];
                if (bullet.ownerId !== playerId && player.health > 0 && isCollidingCircleCircle(bullet, player)) {
                    player.health -= bullet.damage;
                    delete this.bullets[id];
                    bulletRemoved = true;
                    if (player.health <= 0) {
                        player.health = 0;
                        const killer = this.players[bullet.ownerId];
                        if (killer) killer.score += 1;
                        setTimeout(() => {
                            if (this.players[playerId]) {
                                this.players[playerId].x = Math.floor(Math.random() * (CONSTANTS.MAP_WIDTH - 200)) + 100;
                                this.players[playerId].y = Math.floor(Math.random() * (CONSTANTS.MAP_HEIGHT - 200)) + 100;
                                this.players[playerId].health = CONSTANTS.PLAYER_HEALTH;
                                this.players[playerId].weapon = 'pistol';
                                this.players[playerId].speed = CONSTANTS.PLAYER_SPEED;
                            }
                        }, 3000);
                    }
                    break;
                }
            }
            if (bulletRemoved) continue;

            if (bullet.x < -50 || bullet.x > CONSTANTS.MAP_WIDTH + 50 || bullet.y < -50 || bullet.y > CONSTANTS.MAP_HEIGHT + 50) {
                delete this.bullets[id];
            }
        }

        for (const playerId in this.players) {
            const player = this.players[playerId];
            if (player.health <= 0) continue;
            for (const itemId in this.items) {
                const item = this.items[itemId];
                if (item.active && isCollidingCircleCircle(player, item)) {
                    if (item.type === 'health') {
                        player.health = Math.min(CONSTANTS.PLAYER_HEALTH, player.health + CONSTANTS.HEALTH_PACK_AMOUNT);
                    } else if (item.type === 'speed') {
                        player.speed *= CONSTANTS.SPEED_BOOST_AMOUNT;
                        setTimeout(() => { if (this.players[playerId]) this.players[playerId].speed = CONSTANTS.PLAYER_SPEED; }, CONSTANTS.SPEED_BOOST_DURATION);
                    } else if (item.type === 'shotgun' || item.type === 'machinegun') {
                        player.weapon = item.type;
                    }
                    item.active = false;
                    this.io.emit('itemPickedUp', itemId);
                    setTimeout(() => {
                        delete this.items[itemId];
                        this.spawnItem();
                    }, 10000);
                }
            }
        }
    }

    getState() {
        // ... (getState giữ nguyên)
        return {
            players: this.players,
            bullets: this.bullets,
            destructibles: this.destructibles,
        };
    }

    spawnItem() {
        // ... (spawnItem giữ nguyên)
        const id = `item-${this.itemIdCounter++}`;
        const typeRoll = Math.random();
        let type, color;
        if (typeRoll < 0.2) { type = 'health'; color = 'lime'; }
        else if (typeRoll < 0.4) { type = 'speed'; color = 'yellow'; }
        else if (typeRoll < 0.7) { type = 'shotgun'; color = 'orange'; }
        else { type = 'machinegun'; color = 'cyan'; }

        const newItem = {
            id,
            x: Math.floor(Math.random() * (CONSTANTS.MAP_WIDTH - 100)) + 50,
            y: Math.floor(Math.random() * (CONSTANTS.MAP_HEIGHT - 100)) + 50,
            radius: 10,
            type,
            color,
            active: true
        };
        this.items[id] = newItem;
        this.io.emit('newItem', newItem);
    }
}

module.exports = Game;
