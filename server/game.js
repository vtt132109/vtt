// server/game.js
const CONSTANTS = require('./constants');
const WEAPONS = require('./weapon');
const { createPlayer } = require('./player');

class Game {
    constructor(io) {
        this.io = io;
        this.players = {};
        this.bullets = {};
        this.bulletIdCounter = 0;
    }

    addPlayer(socket, data) {
        const newPlayer = createPlayer(socket.id, data.username);
        this.players[socket.id] = newPlayer;
        socket.emit('initialState', { players: this.players, bullets: this.bullets });
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
        if (!player) return;

        // Di chuyển
        if (input.keys.a) player.x -= player.speed;
        if (input.keys.d) player.x += player.speed;
        if (input.keys.w) player.y -= player.speed;
        if (input.keys.s) player.y += player.speed;

        // Giới hạn trong bản đồ
        player.x = Math.max(player.radius, Math.min(CONSTANTS.MAP_WIDTH - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(CONSTANTS.MAP_HEIGHT - player.radius, player.y));

        // Hướng
        player.angle = input.angle;

        // Bắn
        if (input.isShooting) {
            const weapon = WEAPONS[player.weapon];
            if (weapon) {
                const bulletId = `bullet-${this.bulletIdCounter++}`;
                this.bullets[bulletId] = {
                    ownerId: player.id,
                    x: player.x + Math.cos(player.angle) * (player.radius + 5),
                    y: player.y + Math.sin(player.angle) * (player.radius + 5),
                    velocityX: Math.cos(player.angle) * weapon.speed,
                    velocityY: Math.sin(player.angle) * weapon.speed,
                    radius: 5,
                    color: player.color,
                };
            }
        }
    }

    update() {
        // Cập nhật đạn
        for (const id in this.bullets) {
            const bullet = this.bullets[id];
            bullet.x += bullet.velocityX;
            bullet.y += bullet.velocityY;

            if (bullet.x < 0 || bullet.x > CONSTANTS.MAP_WIDTH || bullet.y < 0 || bullet.y > CONSTANTS.MAP_HEIGHT) {
                delete this.bullets[id];
            }
        }
    }

    getState() {
        return {
            players: this.players,
            bullets: this.bullets,
        };
    }
}

module.exports = Game;
