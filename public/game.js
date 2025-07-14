// public/game.js

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

// THAY ĐỔI DÒNG NÀY KHI DEPLOY
// Ví dụ: const socket = io('https://your-game-name.onrender.com');
const socket = io(); 

// --- TRẠNG THÁI PHÍA CLIENT ---
let players = {};
let walls = [];
let items = {};
let bullets = {};
let selfId = null;
const keys = { w: false, a: false, s: false, d: false };
const mouse = { x: 0, y: 0 };

// --- LẮNG NGHE SỰ KIỆN TỪ SERVER ---
socket.on('initialState', (state) => {
  players = state.players;
  walls = state.walls;
  items = state.items;
  selfId = socket.id;
});

socket.on('newPlayer', (player) => {
  players[player.id] = player;
});

socket.on('playerDisconnected', (id) => {
  delete players[id];
});

socket.on('gameState', (state) => {
  players = state.players;
  bullets = state.bullets;
});

socket.on('itemPickedUp', (itemId) => {
  if (items[itemId]) items[itemId].active = false;
});

socket.on('itemRespawned', (itemId) => {
  if (items[itemId]) items[itemId].active = true;
});

// --- XỬ LÝ INPUT ---
window.addEventListener('keydown', (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) { // Chuột trái
    socket.emit('shoot');
  }
});

// --- HÀM VẼ ---
function draw() {
  // Xóa màn hình
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Vẽ tường
  context.fillStyle = '#555';
  for (const wall of walls) {
    context.fillRect(wall.x, wall.y, wall.width, wall.height);
  }

  // Vẽ item
  for (const id in items) {
    const item = items[id];
    if (item.active) {
      context.fillStyle = 'lime';
      context.fillRect(item.x, item.y, item.width, item.height);
      context.strokeStyle = 'white';
      context.strokeRect(item.x, item.y, item.width, item.height);
    }
  }

  // Vẽ người chơi và súng
  for (const id in players) {
    const player = players[id];
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    context.save();
    context.translate(playerCenterX, playerCenterY);
    context.rotate(player.angle);

    // Vẽ súng (hình chữ nhật)
    context.fillStyle = '#999';
    context.fillRect(player.width / 2 - 5, -4, 20, 8);

    context.restore();

    // Vẽ thân người chơi
    context.fillStyle = player.color;
    context.fillRect(player.x, player.y, player.width, player.height);
    
    // Vẽ thanh máu
    if (player.health > 0) {
      const healthPercentage = player.health / 100;
      context.fillStyle = 'red';
      context.fillRect(player.x, player.y - 15, player.width, 8);
      context.fillStyle = 'green';
      context.fillRect(player.x, player.y - 15, player.width * healthPercentage, 8);
    }
  }

  // Vẽ đạn
  for (const id in bullets) {
    const bullet = bullets[id];
    context.fillStyle = bullet.color;
    context.beginPath();
    context.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
    context.fill();
  }

  // Vẽ bảng điểm
  drawLeaderboard();
}

function drawLeaderboard() {
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
  context.fillStyle = 'rgba(0, 0, 0, 0.5)';
  context.fillRect(canvas.width - 160, 10, 150, 20 + sortedPlayers.length * 20);
  
  context.fillStyle = 'white';
  context.font = '16px Arial';
  context.fillText('Leaderboard', canvas.width - 145, 30);

  sortedPlayers.forEach((player, index) => {
    const name = player.id === selfId ? 'You' : player.id.substring(0, 5);
    context.fillStyle = player.color;
    context.fillText(
      `${index + 1}. ${name}: ${player.score}`,
      canvas.width - 145,
      55 + index * 20
    );
  });
}

// --- VÒNG LẶP GAME CHÍNH (CLIENT-SIDE) ---
function gameLoop() {
  // Gửi input lên server
  const self = players[selfId];
  if (self && self.health > 0) {
    // Gửi di chuyển
    socket.emit('playerMovement', {
      up: keys.w, down: keys.s, left: keys.a, right: keys.d
    });

    // Gửi hướng súng
    const angle = Math.atan2(mouse.y - (self.y + self.height / 2), mouse.x - (self.x + self.width / 2));
    socket.emit('playerAim', angle);
  }

  // Vẽ game
  draw();

  // Lặp lại
  requestAnimationFrame(gameLoop);
}

// Bắt đầu game
requestAnimationFrame(gameLoop);