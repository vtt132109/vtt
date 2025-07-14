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
        this.items = {};
        this.walls = this.createMazeWalls(CONSTANTS.MAP_WIDTH, CONSTANTS.MAP_HEIGHT, 16, 12, 20);
        this.bulletIdCounter = 0;
        this.itemIdCounter = 0;
        this.init();
    }

    init() {
        for (let i = 0; i < 10; i++) this.spawnItem();
    }

    addPlayer(socket, username) {
        const newPlayer = createPlayer(socket.id, username);
        this.players[socket.id] = newPlayer;
        socket.emit('initialState', {
            players: this.players,
            bullets: this.bullets,
            walls: this.walls,
            items: this.items,
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
        if (!player || player.health <= 0) return;

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
                            if (this.players[id] && this.players[id].health > 0) {
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
            isHoming: player.homingShotsActive,
        };
    }

    update() {
        for (const id in this.bullets) {
            const bullet = this.bullets[id];
            
            if (bullet.isHoming) {
                let closestPlayer = null;
                let minDistance = Infinity;
                for (const playerId in this.players) {
                    if (playerId !== bullet.ownerId && this.players[playerId].health > 0) {
                        const target = this.players[playerId];
                        const dx = target.x - bullet.x;
                        const dy = target.y - bullet.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestPlayer = target;
                        }
                    }
                }
                if (closestPlayer) {
                    const turnRate = 0.1;
                    const targetAngle = Math.atan2(closestPlayer.y - bullet.y, closestPlayer.x - bullet.x);
                    const currentAngle = Math.atan2(bullet.velocityY, bullet.velocityX);
                    let angleDiff = targetAngle - currentAngle;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    const newAngle = currentAngle + Math.max(-turnRate, Math.min(turnRate, angleDiff));
                    const speed = Math.sqrt(bullet.velocityX**2 + bullet.velocityY**2);
                    bullet.velocityX = Math.cos(newAngle) * speed;
                    bullet.velocityY = Math.sin(newAngle) * speed;
                }
            }

            bullet.x += bullet.velocityX;
            bullet.y += bullet.velocityY;

            let bulletRemoved = false;
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
                        if (killer) killer.score = (killer.score || 0) + 1;
                        setTimeout(() => {
                            if (this.players[playerId]) {
                                this.players[playerId].x = Math.floor(Math.random() * (CONSTANTS.MAP_WIDTH - 200)) + 100;
                                this.players[playerId].y = Math.floor(Math.random() * (CONSTANTS.MAP_HEIGHT - 200)) + 100;
                                this.players[playerId].health = CONSTANTS.PLAYER_HEALTH;
                                this.players[playerId].weapon = 'pistol';
                            }
                        }, 3000);
                    }
                    break;
                }
            }
            if (bulletRemoved) continue;

            if (bullet.x < 0 || bullet.x > CONSTANTS.MAP_WIDTH || bullet.y < 0 || bullet.y > CONSTANTS.MAP_HEIGHT) {
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
                    } else if (item.type === 'shotgun' || item.type === 'machinegun') {
                        player.weapon = item.type;
                    } else if (item.type === 'homing') {
                        player.homingShotsActive = true;
                        player.homingShotsEndTime = Date.now() + CONSTANTS.HOMING_DURATION;
                    }
                    item.active = false;
                    this.io.emit('itemPickedUp', itemId);
                    setTimeout(() => {
                        delete this.items[itemId];
                        this.spawnItem();
                    }, 15000);
                }
            }
            if (player.homingShotsActive && Date.now() > player.homingShotsEndTime) {
                player.homingShotsActive = false;
            }
        }
    }

    getState() {
        return {
            players: this.players,
            bullets: this.bullets,
        };
    }

    spawnItem() {
        const id = `item-${this.itemIdCounter++}`;
        const typeRoll = Math.random();
        let type, color;
        if (typeRoll < 0.4) { type = 'health'; color = 'lime'; }
        else if (typeRoll < 0.6) { type = 'shotgun'; color = 'orange'; }
        else if (typeRoll < 0.8) { type = 'machinegun'; color = 'cyan'; }
        else { type = 'homing'; color = 'magenta'; }

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

    createMazeWalls(mapWidth, mapHeight, cols, rows, wallThickness) {
        const mazeWalls = [];
        const cellWidth = mapWidth / cols;
        const cellHeight = mapHeight / rows;
        
        // Viền ngoài
        mazeWalls.push({ x: 0, y: 0, width: mapWidth, height: wallThickness });
        mazeWalls.push({ x: 0, y: mapHeight - wallThickness, width: mapWidth, height: wallThickness });
        mazeWalls.push({ x: 0, y: 0, width: wallThickness, height: mapHeight });
        mazeWalls.push({ x: mapWidth - wallThickness, y: 0, width: wallThickness, height: mapHeight });

        // Tường bên trong (ví dụ)
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
