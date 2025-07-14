// public/client/network.js
export class Network {
    constructor(game) {
        this.socket = io(); // Thay đổi URL khi deploy
        this.game = game;
    }

    connect() {
        this.socket.on('initialState', (state) => this.game.setInitialState(state));
        this.socket.on('gameState', (state) => this.game.updateState(state));
        this.socket.on('newPlayer', (player) => this.game.addPlayer(player));
        this.socket.on('playerDisconnected', (id) => this.game.removePlayer(id));
        this.socket.on('destructibleDestroyed', (id) => this.game.updateDestructible(id, false));
        this.socket.on('destructibleRespawned', (id) => this.game.updateDestructible(id, true));
        this.socket.on('itemPickedUp', (id) => this.game.updateItem(id, false));
        this.socket.on('newItem', (item) => this.game.addItem(item));
        this.socket.on('chatMessage', (data) => this.game.renderer.ui.addChatMessage(data));
    }

    joinGame(username) { this.socket.emit('joinGame', { username }); }
    sendInput(input) { this.socket.emit('playerInput', input); }
    sendDash() { this.socket.emit('dash'); }
    sendChatMessage(msg) { this.socket.emit('chatMessage', msg); }
}