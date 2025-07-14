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
        for (let i = 0; i < 8; i++) this.spawnItem();
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
                const bulletCount = weapon.bulletCount || 1;
                const spread = weapon.spread || 0;
                for (let i = 0; i < bulletCount; i++) {
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
                    };
                }
            }
        }
    }

    update() {
        for (const id in this.bullets) {
            const bullet = this.bullets[id];
            bullet.x += bullet.velocityX;
            bullet.y += bullet.velocityY;

            let bulletRemoved = false;
            for (const wall of this.walls) {
                if (isCollidingRectCircle(wall, { ...bullet, radius: bullet.radius })) {
                    delete this.bullets[id];
                    bulletRemoved = true;
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
                    }
                    item.active = false;
                    this.io.emit('itemPickedUp', itemId);
                    setTimeout(() => {
                        delete this.items[itemId];
                        this.spawnItem();
                    }, 15000);
                }
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
        if (typeRoll < 0.5) { type = 'health'; color = 'lime'; }
        else if (typeRoll < 0.75) { type = 'shotgun'; color = 'orange'; }
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
