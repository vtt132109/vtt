// server/game.js -> trong class Game

handlePlayerInput(id, input) {
    const player = this.players[id];
    if (!player) return;

    // ... (logic di chuyển giữ nguyên)

    player.angle = input.angle;

    // SỬA LẠI LOGIC BẮN
    if (input.isShooting) {
        const weapon = WEAPONS[player.weapon];
        // Kiểm tra cả weapon và cooldown
        if (weapon && Date.now() - player.lastShotTime > weapon.fireRate) {
            // Cập nhật thời gian bắn cuối cùng
            player.lastShotTime = Date.now();

            const bulletCount = weapon.bulletCount || 1;
            const spread = weapon.spread || 0;

            for (let i = 0; i < bulletCount; i++) {
                const angle = player.angle + (Math.random() - 0.5) * spread;
                const bulletId = `bullet-${this.bulletIdCounter++}`;
                this.bullets[bulletId] = {
                    ownerId: player.id,
                    x: player.x + Math.cos(angle) * (player.radius + 5),
                    y: player.y + Math.sin(angle) * (player.radius + 5),
                    velocityX: Math.cos(angle) * weapon.speed,
                    velocityY: Math.sin(angle) * weapon.speed,
                    radius: 5,
                    color: player.color,
                };
            }
        }
    }
}
