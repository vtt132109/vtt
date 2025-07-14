// public/client/rendering.js
export class Renderer {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.context = context;
    }

    draw(state) {
        const { players, bullets } = state;
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const id in players) {
            const player = players[id];
            this.context.beginPath();
            this.context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
            this.context.fillStyle = player.color;
            this.context.fill();

            this.context.save();
            this.context.translate(player.x, player.y);
            this.context.rotate(player.angle);
            this.context.fillStyle = '#999';
            this.context.fillRect(player.radius - 5, -4, 20, 8);
            this.context.restore();

            this.context.fillStyle = 'white';
            this.context.font = '12px sans-serif';
            this.context.textAlign = 'center';
            this.context.fillText(player.username, player.x, player.y - player.radius - 5);
        }

        for (const id in bullets) {
            const bullet = bullets[id];
            this.context.fillStyle = bullet.color;
            this.context.beginPath();
            this.context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.context.fill();
        }
    }
}
