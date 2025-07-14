// public/client/rendering.js
export class Renderer {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.context = context;
        this.camera = { x: 0, y: 0 };
    }

    draw(state) {
        const { players, bullets, walls, items, selfId } = state;
        const self = players[selfId];
        if (!self) return;

        this.updateCamera(self);

        this.context.save();
        this.context.translate(-this.camera.x, -this.camera.y);

        this.context.fillStyle = '#EAEAEA';
        this.context.fillRect(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);

        this.drawWalls(walls);
        this.drawItems(items);
        this.drawPlayers(players);
        this.drawBullets(bullets);

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

    drawItems(items) {
        for (const id in items) {
            const item = items[id];
            if (item.active) {
                this.context.fillStyle = item.color;
                this.context.beginPath();
                this.context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
                this.context.fill();
            }
        }
    }

    drawPlayers(players) {
        for (const id in players) {
            const player = players[id];
            if (player.health <= 0) continue;

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
            this.context.fillText(player.username, player.renderX, player.renderY - player.radius - 15);
        }
    }

    drawBullets(bullets) {
        for (const id in bullets) {
            const bullet = bullets[id];
            if (bullet.isHoming) {
                this.context.fillStyle = 'rgba(255, 0, 255, 0.5)';
                this.context.beginPath();
                this.context.arc(bullet.x, bullet.y, bullet.radius + 5, 0, Math.PI * 2);
                this.context.fill();
            }
            this.context.fillStyle = bullet.color;
            this.context.beginPath();
            this.context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
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

        if (player.homingShotsActive) {
            const remainingTime = Math.max(0, (player.homingShotsEndTime - Date.now()) / 1000).toFixed(1);
            this.context.fillStyle = 'magenta';
            this.context.fillText(`Homing: ${remainingTime}s`, 10, 120);
        }
    }
}
