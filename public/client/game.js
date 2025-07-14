// public/client/game.js
import { Network } from './network.js';
import { Input } from './input.js';
import { Renderer } from './rendering.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.network = new Network(this);
        this.input = new Input(this.canvas);
        this.renderer = new Renderer(this.canvas, this.context);
        this.state = {
            players: {},
            bullets: {},
            selfId: null,
        };
    }

    start(username) {
        this.network.connect();
        this.network.joinGame(username);
        this.input.startListening();
        requestAnimationFrame(() => this.gameLoop());
    }

    gameLoop() {
        const self = this.state.players[this.state.selfId];
        if (self && this.input.state.mousePos) {
            this.input.state.angle = Math.atan2(
                this.input.state.mousePos.y - self.y,
                this.input.state.mousePos.x - self.x
            );
        }
        
        this.network.sendInput(this.input.getState());
        this.renderer.draw(this.state);
        requestAnimationFrame(() => this.gameLoop());
    }

    setInitialState(state) {
        this.state.selfId = this.network.socket.id;
        this.state.players = state.players;
        this.state.bullets = state.bullets;
    }
    
    updateState(state) {
        this.state.players = state.players;
        this.state.bullets = state.bullets;
    }

    addPlayer(player) {
        this.state.players[player.id] = player;
    }

    removePlayer(id) {
        delete this.state.players[id];
    }
}
