// public/client/rendering.js
export class Renderer {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.context = context;
        this.camera = { x: 0, y: 0 };
    }

    draw(state) {
        const { players, bullets, walls, jumpPads, grenades, particles, selfId } = state;
        const self = players[selfId];
        if (!self) return;

        this.updateCamera(self);

        this.context.save();
        this.context.translate(-this.camera.x, -this.camera.y);

        this.context.fillStyle = '#EAEAEA';
        this.context.fillRect(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);

        this.drawJumpPads(jumpPads);
        this.drawWalls(walls);
        this.drawGrenades(grenades);
        this.drawPlayers(players);
        this.drawBullets(bullets);
        this.drawParticles(particles);

        this.context.restore();
        this.drawUI(self);
    }

    updateCamera(player) {
        this.camera.x = player.renderX - this.canvas.width / 2;
        this.camera.y = player.renderY - this.canvas.height / 2;
    }

    drawWalls(walls) {
        this.context.fillStyle = '#000000';
        for (const wall of walls) {
            this.context.fillRect(wall.x, wall.y, wall.width, wall.height);
        }
    }

    drawJumpPads(jumpPads) {
        this.context.fillStyle = 'rgba(0, 255, 255, 0.5)';
        for (const pad of jumpPads) {
            this.context.fillRect(pad.x, pad.y, pad.width, pad.height);
        }
    }

    drawGrenades(grenades) {
        this.context.fillStyle = '#333333';
        for (const id in grenades) {
            const g = grenades[id];
            this.context.beginPath();
            this.context.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
            this.context.fill();
        }
    }

    drawPlayers(players) {
        for (const id in players) {
            const player = players[id];
            if (player.isDead) continue;

            this.context.save();
            this.context.translate(player.renderX, player.renderY);
            this.context.rotate(player.angle);
            this.context.fillStyle = '#999';
            this.context.fillRect(player.radius - 5, -4, 20, 8);
            this.context.restore();

            this.context.beginPath();
            this.context.arc(player.renderX, player.renderY, player.radius, 0, Math.PI * 2);
            this.context.fillStyle = player.color;
            this.context.fill();

            this.context.fillStyle = 'black';
            this.context.font = '12px sans-serif';
            this.context.textAlign = 'center';
            this.context.fillText(player.username, player.renderX, player.renderY - player.radius - 28);

            const barWidth = 40;
            const barHeight = 5;
            const x = player.renderX - barWidth / 2;
            const y = player.renderY - player.radius - 20;
            this.context.fillStyle = '#ff4d4d';
            this.context.fillRect(x, y, barWidth, barHeight);
            this.context.fillStyle = '#4dff4d';
            this.context.fillRect(x, y, barWidth * (player.health / 100), barHeight);
        }
    }

    drawBullets(bullets) {
        for (const id in bullets) {
            const bullet = bullets[id];
            this.context.fillStyle = bullet.color;
            this.context.beginPath();
            this.context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.context.fill();
        }
    }

    drawParticles(particles) {
        for (const p of particles) {
            this.context.fillStyle = p.color;
            this.context.beginPath();
            this.context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.context.fill();
        }
    }

    drawUI(player) {
        this.context.fillStyle = 'black';
        this.context.font = '20px sans-serif';
        this.context.textAlign = 'left';
        this.context.fillText(`Weapon: ${player.weapon}`, 10, 30);
        this.context.fillText(`Health: ${player.health}`, 10, 60);
        this.context.fillText(`Score: ${player.score}`, 10, 90);
        this.context.fillText(`Grenades: ${player.grenades}`, 10, 120);

        if (player.isDead) {
            const remaining = ((player.respawnTime - Date.now()) / 1000).toFixed(1);
            this.context.fillStyle = 'rgba(0,0,0,0.5)';
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.fillStyle = 'white';
            this.context.font = '40px sans-serif';
            this.context.textAlign = 'center';
            this.context.fillText(`Respawning in ${remaining}...`, this.canvas.width / 2, this.canvas.height / 2);
        }
    }
}
