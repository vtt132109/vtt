// public/client/network.js
export class Network {
    constructor(game) {
        this.socket = io();
        this.game = game;
    }

    connect() {
        this.socket.on('initialState', (state) => this.game.setInitialState(state));
        this.socket.on('gameState', (state) => this.game.updateState(state));
        this.socket.on('newPlayer', (player) => this.game.addPlayer(player));
        this.socket.on('playerDisconnected', (id) => this.game.removePlayer(id));
        this.socket.on('playerDied', (data) => this.game.onPlayerDied(data));
        this.socket.on('explosion', (pos) => this.game.onExplosion(pos));
        this.socket.on('bulletImpact', (pos) => this.game.onBulletImpact(pos));
    }

    joinGame(username) { this.socket.emit('joinGame', username); }
    sendInput(input) { this.socket.emit('playerInput', input); }
    sendThrowGrenade() { this.socket.emit('throwGrenade'); }
}
