// public/client/game.js
import { Network } from './network.js';
import { Input } from './input.js';
import { Renderer } from './rendering.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.network = new Network(this);
        this.input = new Input(this.canvas, this.network);
        this.renderer = new Renderer(this.canvas, this.context);
        this.state = {
            players: {},
            bullets: {},
            walls: [],
            jumpPads: [],
            grenades: {},
            particles: [],
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
        this.updateParticles();
        this.renderer.draw(this.state);
        requestAnimationFrame(() => this.gameLoop());
    }

    interpolateEntities() {
        for (const id in this.state.players) {
            const player = this.state.players[id];
            if (player.renderX !== undefined) {
                player.renderX += (player.x - player.renderX) * this.INTERPOLATION_FACTOR;
                player.renderY += (player.y - player.renderY) * this.INTERPOLATION_FACTOR;
            } else {
                player.renderX = player.x;
                player.renderY = player.y;
            }
        }
    }

    updateParticles() {
        for (let i = this.state.particles.length - 1; i >= 0; i--) {
            const p = this.state.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.alpha -= 0.02;
            p.color = `rgba(${p.rgb.r}, ${p.rgb.g}, ${p.rgb.b}, ${p.alpha})`;
            if (p.alpha <= 0) {
                this.state.particles.splice(i, 1);
            }
        }
    }

    createParticles(x, y, count, hexColor, speed) {
        const rgb = { r: parseInt(hexColor.slice(1,3), 16), g: parseInt(hexColor.slice(3,5), 16), b: parseInt(hexColor.slice(5,7), 16) };
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.state.particles.push({
                x, y,
                vx: Math.cos(angle) * Math.random() * speed,
                vy: Math.sin(angle) * Math.random() * speed,
                radius: Math.random() * 2 + 1,
                color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
                rgb,
                alpha: 1,
            });
        }
    }

    setInitialState(state) {
        this.state.selfId = this.network.socket.id;
        this.state.walls = state.walls;
        this.state.jumpPads = state.jumpPads;
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
                const clientPlayer = this.state.players[id];
                Object.assign(clientPlayer, state.players[id]);
            } else {
                const player = state.players[id];
                player.renderX = player.x;
                player.renderY = player.y;
                this.state.players[id] = player;
            }
        }
        for (const id in this.state.players) {
            if (!state.players[id]) {
                delete this.state.players[id];
            }
        }
        this.state.bullets = state.bullets;
        this.state.grenades = state.grenades;
    }

    addPlayer(player) {
        player.renderX = player.x;
        player.renderY = player.y;
        this.state.players[player.id] = player;
    }

    removePlayer(id) {
        delete this.state.players[id];
    }

    onPlayerDied(data) {
        const killFeedEl = document.getElementById('kill-feed');
        const messageEl = document.createElement('div');
        messageEl.classList.add('kill-message');
        const killerHtml = data.killer ? `<span style="color: ${data.killer.color};">${data.killer.username}</span>` : 'Themselves';
        const victimHtml = `<span style="color: ${data.victim.color};">${data.victim.username}</span>`;
        messageEl.innerHTML = `${killerHtml} 🔫 ${victimHtml}`;
        killFeedEl.prepend(messageEl);
        setTimeout(() => {
            messageEl.classList.add('fade-out');
            setTimeout(() => messageEl.remove(), 500);
        }, 4000);
    }

    onExplosion(pos) {
        this.createParticles(pos.x, pos.y, 50, '#FFA500', 8);
    }

    onBulletImpact(pos) {
        this.createParticles(pos.x, pos.y, 5, '#CCCCCC', 2);
    }
}
