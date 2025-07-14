// public/client/game.js
import { Network } from './network.js';
import { Input } from './input.js';
import { Renderer } from './rendering.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        
        this.renderer = new Renderer(this.canvas, this.context);
        this.network = new Network(this);
        this.input = new Input(this.canvas, document.getElementById('chat-input'), this.network);
        this.sounds = {
            hit: document.getElementById('hit-sound'),
        };

        this.state = {
            players: {},
            bullets: {},
            walls: [],
            items: {},
            destructibles: {},
            selfId: null,
        };
        this.INTERPOLATION_FACTOR = 0.15;
    }

    start(username) {
        this.network.connect();
        this.network.joinGame(username);
        this.input.startListening();
        requestAnimationFrame(() => this.gameLoop());
    }

    gameLoop() {
        const self = this.state.players[this.state.selfId];
        if (self) {
            this.input.state.angle = Math.atan2(
                this.input.state.mouse.y - this.canvas.height / 2,
                this.input.state.mouse.x - this.canvas.width / 2
            );
             if (this.input.getState().mouse.down) {
            console.log("Sending shoot input to server. Mouse is down.");
        }
            this.network.sendInput(this.input.getState());
        }
        
        this.interpolateEntities();
        this.renderer.draw(this.state);
        requestAnimationFrame(() => this.gameLoop());
    }

    interpolateEntities() {
        for (const id in this.state.players) {
            const player = this.state.players[id];
            if (id !== this.state.selfId) {
                if (player.renderX) {
                    player.renderX += (player.x - player.renderX) * this.INTERPOLATION_FACTOR;
                    player.renderY += (player.y - player.renderY) * this.INTERPOLATION_FACTOR;
                }
            } else {
                player.renderX = player.x;
                player.renderY = player.y;
            }
        }
    }

    setInitialState(state) {
        this.state.selfId = this.network.socket.id;
        this.state.walls = state.walls;
        this.state.items = state.items;
        this.state.destructibles = state.destructibles;
        for (const id in state.players) {
            const player = state.players[id];
            player.renderX = player.x;
            player.renderY = player.y;
            this.state.players[id] = player;
        }
    }
    
    updateState(state) {
        const selfBefore = this.state.players[this.state.selfId];
        const selfHealthBefore = selfBefore ? selfBefore.health : 100;

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
        if (state.destructibles) {
            for (const id in state.destructibles) {
                if (this.state.destructibles[id]) {
                    this.state.destructibles[id].health = state.destructibles[id].health;
                }
            }
        }

        const selfAfter = this.state.players[this.state.selfId];
        if (selfAfter && selfAfter.health < selfHealthBefore) {
            this.sounds.hit.currentTime = 0;
            this.sounds.hit.play();
        }
    }

    addPlayer(player) {
        player.renderX = player.x;
        player.renderY = player.y;
        this.state.players[player.id] = player;
    }

    removePlayer(id) {
        delete this.state.players[id];
    }

    updateDestructible(id, isActive) {
        if (this.state.destructibles[id]) this.state.destructibles[id].active = isActive;
    }

    updateItem(id, isActive) {
        if (this.state.items[id]) this.state.items[id].active = isActive;
    }

    addItem(item) {
        if (item) this.state.items[item.id] = item;
    }
}
