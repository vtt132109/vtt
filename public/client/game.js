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
            walls: [],
            items: {},
            selfId: null,
        };
        this.INTERPOLATION_FACTOR = 0.15;
    }

    start(username) {
        this.network.connect();
        this.network.joinGame(username);
        this.input.startListening();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        requestAnimationFrame(() => this.gameLoop());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    gameLoop() {
        const self = this.state.players[this.state.selfId];
        if (self) {
            this.input.state.angle = Math.atan2(
                this.input.state.mousePos.y - this.canvas.height / 2,
                this.input.state.mousePos.x - this.canvas.width / 2
            );
        }
        
        this.network.sendInput(this.input.getState());
        this.interpolateEntities();
        this.renderer.draw(this.state);
        requestAnimationFrame(() => this.gameLoop());
    }

    interpolateEntities() {
        for (const id in this.state.players) {
            const player = this.state.players[id];
            if (player.renderX) {
                player.renderX += (player.x - player.renderX) * this.INTERPOLATION_FACTOR;
                player.renderY += (player.y - player.renderY) * this.INTERPOLATION_FACTOR;
            }
        }
    }

    setInitialState(state) {
        this.state.selfId = this.network.socket.id;
        this.state.walls = state.walls;
        this.state.items = state.items;
        this.state.bullets = state.bullets;
        for (const id in state.players) {
            const player = state.players[id];
            player.renderX = player.x;
            player.renderY = player.y;
            this.state.players[id] = player;
        }
    }
    
    updateState(state) {
        for (const id in state.players) {
            if (this.state.players[id]) {
                Object.assign(this.state.players[id], state.players[id]);
            } else {
                const player = state.players[id];
                player.renderX = player.x;
                player.renderY = player.y;
                this.state.players[id] = player;
            }
        }
        this.state.bullets = state.bullets;
    }

    addPlayer(player) {
        player.renderX = player.x;
        player.renderY = player.y;
        this.state.players[player.id] = player;
    }

    removePlayer(id) {
        delete this.state.players[id];
    }

    updateItem(id, isActive) {
        if (this.state.items[id]) this.state.items[id].active = isActive;
    }

    addItem(item) {
        if (item) this.state.items[item.id] = item;
    }
}
