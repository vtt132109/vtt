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
    }

    joinGame(username) { this.socket.emit('joinGame', username); }
    sendInput(input) { this.socket.emit('playerInput', input); }
}
