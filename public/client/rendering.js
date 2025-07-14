// public/client/rendering.js
export class Renderer {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.context = context;
        this.camera = { x: 0, y: 0 };
        this.ui = {
            chatMessages: document.getElementById('chat-messages'),
            addChatMessage: (data) => {
                const msgElement = document.createElement('div');
                msgElement.innerHTML = `<strong style="color: ${data.color};">${data.username}:</strong> ${data.message}`;
                this.ui.chatMessages.appendChild(msgElement);
                this.ui.chatMessages.scrollTop = this.ui.chatMessages.scrollHeight;
            }
        };
    }

    draw(state) {
        const { players, bullets, walls, items, destructibles, selfId } = state;
        const self = players[selfId];
        if (!self) return;

        this.camera.x = self.renderX - this.canvas.width / 2;
        this.camera.y = self.renderY - this.canvas.height / 2;

        this.context.save();
        this.context.translate(-this.camera.x, -this.camera.y);

        this.context.fillStyle = '#000';
        this.context.fillRect(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);

        this.drawWalls(walls);
        this.drawItems(items);
        this.drawDestructibles(destructibles);
        this.drawPlayers(players);
        this.drawBullets(bullets);

        this.context.restore();
        this.drawUI(state);
    }

    drawWalls(walls) {
        this.context.fillStyle = '#555';
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
                this.context.strokeStyle = 'white';
                this.context.lineWidth = 2;
                this.context.stroke();
            }
        }
    }

    drawDestructibles(destructibles) {
        for (const id in destructibles) {
            const d = destructibles[id];
            if (d.active) {
                this.context.beginPath();
                this.context.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
                this.context.fillStyle = '#8B4513';
                this.context.fill();
                this.context.strokeStyle = '#4d260a';
                this.context.lineWidth = 3;
                this.context.stroke();
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
            this.context.strokeStyle = 'white';
            this.context.lineWidth = 2;
            this.context.stroke();

            if (player.isDashing) {
                this.context.beginPath();
                this.context.arc(player.renderX, player.renderY, player.radius + 5, 0, Math.PI * 2);
                this.context.strokeStyle = 'cyan';
                this.context.lineWidth = 3;
                this.context.stroke();
            }

            this.context.fillStyle = 'white';
            this.context.font = '12px sans-serif';
            this.context.textAlign = 'center';
            this.context.fillText(player.username, player.renderX, player.renderY - player.radius - 15);
            
            const healthPercentage = player.health / 100;
            this.context.fillStyle = 'red';
            this.context.fillRect(player.renderX - player.radius, player.renderY - player.radius - 10, player.radius * 2, 8);
            this.context.fillStyle = 'green';
            this.context.fillRect(player.renderX - player.radius, player.renderY - player.radius - 10, player.radius * 2 * healthPercentage, 8);
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

    drawUI(state) {
        const { players, selfId } = state;
        const self = players[selfId];
        if (!self) return;

        this.context.fillStyle = 'white';
        this.context.font = '20px sans-serif';
        this.context.textAlign = 'left';
        this.context.fillText(`Weapon: ${self.weapon}`, 10, 30);

        const dashCooldownRemaining = (self.lastDashTime + 5000 - Date.now());
        this.context.fillStyle = 'rgba(0,0,0,0.7)';
        this.context.fillRect(10, this.canvas.height - 70, 60, 60);
        if (dashCooldownRemaining > 0) {
            this.context.fillStyle = 'rgba(0, 200, 255, 0.5)';
            this.context.fillRect(10, this.canvas.height - 70, 60, 60 * (dashCooldownRemaining / 5000));
        }
        this.context.strokeStyle = 'cyan';
        this.context.strokeRect(10, this.canvas.height - 70, 60, 60);
        this.context.fillStyle = 'white';
        this.context.font = '30px sans-serif';
        this.context.textAlign = 'center';
        this.context.fillText('E', 40, this.canvas.height - 35);

        this.drawMinimap(state);
        this.drawLeaderboard(state);
    }

    drawMinimap({ players, walls, selfId }) {
        const mapX = this.canvas.width - 210;
        const mapY = this.canvas.height - 210;
        const mapSize = 200;
        const scale = mapSize / 1600;

        this.context.fillStyle = 'rgba(0,0,0,0.7)';
        this.context.fillRect(mapX, mapY, mapSize, mapSize);
        this.context.strokeStyle = 'white';
        this.context.strokeRect(mapX, mapY, mapSize, mapSize);

        this.context.fillStyle = '#888';
        for (const wall of walls) {
            this.context.fillRect(mapX + wall.x * scale, mapY + wall.y * scale, wall.width * scale, wall.height * scale);
        }

        for (const id in players) {
            const p = players[id];
            if (p.health > 0) {
                this.context.fillStyle = (id === selfId) ? 'yellow' : p.color;
                this.context.beginPath();
                this.context.arc(mapX + p.x * scale, mapY + p.y * scale, 3, 0, Math.PI * 2);
                this.context.fill();
            }
        }
    }

    drawLeaderboard({ players, selfId }) {
        const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
        const boardX = this.canvas.width - 210;
        const boardY = 10;
        const boardWidth = 200;
        const boardHeight = 30 + sortedPlayers.length * 20;

        this.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.context.fillRect(boardX, boardY, boardWidth, boardHeight);
        
        this.context.fillStyle = 'white';
        this.context.font = '16px sans-serif';
        this.context.textAlign = 'left';
        this.context.fillText('Leaderboard', boardX + 10, boardY + 20);

        sortedPlayers.forEach((player, index) => {
            this.context.fillStyle = player.color;
            this.context.fillText(
                `${index + 1}. ${player.username}: ${player.score}`,
                boardX + 10,
                boardY + 45 + index * 20
            );
        });
    }
}