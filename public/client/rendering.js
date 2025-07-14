// public/client/rendering.js -> trong hàm draw() -> trong vòng lặp for (const id in players)

// ... (sau khi vẽ súng)

// Vẽ tên
this.context.fillStyle = 'white';
this.context.font = '12px sans-serif';
this.context.textAlign = 'center';
// Dòng này sẽ vẽ tên người chơi
this.context.fillText(player.username, player.x, player.y - player.radius - 15);
