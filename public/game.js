// public/game.js

const startMenu = document.getElementById('start-menu');
const usernameInput = document.getElementById('username-input');
const playButton = document.getElementById('play-button');
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

// THAY ĐỔI DÒNG NÀY KHI DEPLOY
const socket = io(); 

// --- TRẠNG THÁI PHÍA CLIENT ---
let players = {};
let walls = [];
let items = {};
let bullets = {};
let selfId = null;
const input = {
  keys: { w: false, a: false, s: false, d: false },
  mouse: { x: 0, y: 0, down: false },
  angle: 0
};

// --- XỬ LÝ MÀN HÌNH BẮT ĐẦU ---
playButton.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (username) {
    socket.emit('joinGame', { username });
    startMenu.style.display = 'none';
    canvas.style.display = 'block';
    canvas.focus(); // Để nhận input từ bàn phím
  }
});

// --- LẮNG NGHE SỰ KIỆN TỪ SERVER ---
socket.on('initialState', (state) => {
  players = state.players;
  walls = state.walls;
  items = state.items;
  selfId = socket.id;
  requestAnimationFrame(gameLoop); // Bắt đầu game loop
});

socket.on('newPlayer', (player) => { players[player.id] = player; });
socket.on('playerDisconnected', (id) => { delete players[id]; });
socket.on('gameState', (state) => {
  players = state.players;
  bullets = state.bullets;
});
socket.on('itemPickedUp', (itemId) => { if (items[itemId]) items[itemId].active = false; });
socket.on('newItem', (item) => { if (item) items[item.id] = item; });

// --- XỬ LÝ INPUT ---
window.addEventListener('keydown', (e) => { if (input.keys.hasOwnProperty(e.key)) input.keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (input.keys.hasOwnProperty(e.key)) input.keys[e.key] = false; });
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  input.mouse.x = e.clientX - rect.left;
  input.mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) input.mouse.down = true; });
canvas.addEventListener('mouseup', (e) => { if (e.button === 0) input.mouse.down = false; });

// --- HÀM VẼ ---
function draw() {
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
      context.fillStyle = item.color;
      context.beginPath();
      context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'white';
      context.lineWidth = 2;
      context.stroke();
    }
  }

  // Vẽ người chơi
  for (const id in players) {
    const player = players[id];
    if (player.health <= 0) continue; // Không vẽ người chơi đã chết

    const playerCenterX = player.x;
    const playerCenterY = player.y;

    // Vẽ súng
    context.save();
    context.translate(playerCenterX, playerCenterY);
    context.rotate(player.angle);
    context.fillStyle = '#999';
    context.fillRect(player.radius - 5, -4, 20, 8);
    context.restore();

    // Vẽ thân người chơi
    context.beginPath();
    context.arc(playerCenterX, playerCenterY, player.radius, 0, Math.PI * 2);
    context.fillStyle = player.color;
    context.fill();
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.stroke();

    // Vẽ tên và thanh máu
    context.fillStyle = 'white';
    context.font = '12px sans-serif';
    context.textAlign = 'center';
    context.fillText(player.username, player.x, player.y - player.radius - 15);
    
    const healthPercentage = player.health / 100;
    context.fillStyle = 'red';
    context.fillRect(player.x - player.radius, player.y - player.radius - 10, player.radius * 2, 8);
    context.fillStyle = 'green';
    context.fillRect(player.x - player.radius, player.y - player.radius - 10, player.radius * 2 * healthPercentage, 8);
  }

  // Vẽ đạn
  for (const id in bullets) {
    const bullet = bullets[id];
    context.fillStyle = bullet.color;
    context.beginPath();
    context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    context.fill();
  }

  drawUI();
}

function drawUI() {
  const self = players[selfId];
  if (!self) return;

  // Vẽ thông tin vũ khí
  context.fillStyle = 'white';
  context.font = '20px sans-serif';
  context.textAlign = 'left';
  context.fillText(`Weapon: ${self.weapon}`, 10, 30);

  // Vẽ bảng điểm
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
  context.fillStyle = 'rgba(0, 0, 0, 0.5)';
  context.fillRect(canvas.width - 180, 10, 170, 30 + sortedPlayers.length * 20);
  
  context.fillStyle = 'white';
  context.font = '16px sans-serif';
  context.fillText('Leaderboard', canvas.width - 155, 30);

  sortedPlayers.forEach((player, index) => {
    context.fillStyle = player.color;
    context.fillText(
      `${index + 1}. ${player.username}: ${player.score}`,
      canvas.width - 170,
      55 + index * 20
    );
  });
}

// --- VÒNG LẶP GAME CHÍNH (CLIENT-SIDE) ---
function gameLoop() {
  const self = players[selfId];
  if (self) {
    // Tính toán góc
    input.angle = Math.atan2(input.mouse.y - self.y, input.mouse.x - self.x);
    // Gửi toàn bộ input lên server
    socket.emit('playerInput', input);
  }

  draw();
  requestAnimationFrame(gameLoop);
}
