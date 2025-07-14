// server.js

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Phục vụ các file tĩnh từ thư mục 'public'
app.use(express.static('public'));

// --- CÁC HẰNG SỐ CỦA GAME ---
const PLAYER_HEALTH = 100;
const PLAYER_SPEED = 4;
const PLAYER_SIZE = 30;
const BULLET_SPEED = 10;
const BULLET_DAMAGE = 10;
const HEALTH_PACK_AMOUNT = 50;

// --- TRẠNG THÁI GAME ---
const players = {};
const bullets = {};
const items = {
  'healthPack1': {
    x: 100, y: 100, width: 20, height: 20, type: 'health', active: true
  },
  'healthPack2': {
    x: 700, y: 500, width: 20, height: 20, type: 'health', active: true
  }
};
const walls = [
  { x: 200, y: 150, width: 20, height: 300 },
  { x: 600, y: 150, width: 20, height: 300 },
  { x: 300, y: 400, width: 200, height: 20 }
];
let bulletIdCounter = 0;

// --- HÀM HỖ TRỢ ---
function isColliding(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
}

// --- LOGIC KẾT NỐI ---
io.on('connection', (socket) => {
  console.log(`Một người chơi đã kết nối: ${socket.id}`);

  // Tạo người chơi mới
  players[socket.id] = {
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
    id: socket.id,
    health: PLAYER_HEALTH,
    score: 0,
    angle: 0 // Góc của súng
  };

  // Gửi trạng thái ban đầu cho client mới
  socket.emit('initialState', { players, walls, items });

  // Thông báo cho các client khác về người chơi mới
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // Xử lý khi client ngắt kết nối
  socket.on('disconnect', () => {
    console.log(`Người chơi đã ngắt kết nối: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });

  // Xử lý di chuyển
  socket.on('playerMovement', (movementData) => {
    const player = players[socket.id];
    if (!player) return;

    const potentialPosition = { ...player, x: player.x, y: player.y };
    if (movementData.left) potentialPosition.x -= PLAYER_SPEED;
    if (movementData.right) potentialPosition.x += PLAYER_SPEED;
    if (movementData.up) potentialPosition.y -= PLAYER_SPEED;
    if (movementData.down) potentialPosition.y += PLAYER_SPEED;

    let collision = false;
    for (const wall of walls) {
      if (isColliding(potentialPosition, wall)) {
        collision = true;
        break;
      }
    }
    if (!collision) {
      player.x = potentialPosition.x;
      player.y = potentialPosition.y;
    }
  });

  // Xử lý hướng súng
  socket.on('playerAim', (angle) => {
    const player = players[socket.id];
    if (player) {
      player.angle = angle;
    }
  });

  // Xử lý bắn
  socket.on('shoot', () => {
    const player = players[socket.id];
    if (!player || player.health <= 0) return;

    const bulletId = bulletIdCounter++;
    bullets[bulletId] = {
      id: bulletId,
      ownerId: player.id,
      x: player.x + PLAYER_SIZE / 2 + Math.cos(player.angle) * (PLAYER_SIZE / 2),
      y: player.y + PLAYER_SIZE / 2 + Math.sin(player.angle) * (PLAYER_SIZE / 2),
      velocityX: Math.cos(player.angle) * BULLET_SPEED,
      velocityY: Math.sin(player.angle) * BULLET_SPEED,
      color: player.color
    };
  });
});

// --- VÒNG LẶP GAME CHÍNH (SERVER-SIDE) ---
setInterval(() => {
  // Cập nhật đạn và kiểm tra va chạm
  for (const id in bullets) {
    const bullet = bullets[id];
    bullet.x += bullet.velocityX;
    bullet.y += bullet.velocityY;

    let bulletRemoved = false;

    // Va chạm đạn với tường
    for (const wall of walls) {
      if (isColliding({ ...bullet, width: 5, height: 5 }, wall)) {
        delete bullets[id];
        bulletRemoved = true;
        break;
      }
    }
    if (bulletRemoved) continue;

    // Va chạm đạn với người chơi
    for (const playerId in players) {
      const player = players[playerId];
      if (bullet.ownerId !== playerId && player.health > 0 && isColliding({ ...bullet, width: 5, height: 5 }, player)) {
        player.health -= BULLET_DAMAGE;
        delete bullets[id];
        bulletRemoved = true;

        // Xử lý khi người chơi bị hạ
        if (player.health <= 0) {
          player.health = 0;
          const killer = players[bullet.ownerId];
          if (killer) {
            killer.score += 1;
          }
          // Hồi sinh người chơi sau 3 giây
          setTimeout(() => {
            player.x = Math.floor(Math.random() * 700) + 50;
            player.y = Math.floor(Math.random() * 500) + 50;
            player.health = PLAYER_HEALTH;
          }, 3000);
        }
        break;
      }
    }
    if (bulletRemoved) continue;

    // Xóa đạn nếu ra khỏi màn hình
    if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
      delete bullets[id];
    }
  }

  // Kiểm tra va chạm người chơi với item
  for (const playerId in players) {
    const player = players[playerId];
    for (const itemId in items) {
      const item = items[itemId];
      if (item.active && player.health > 0 && isColliding(player, item)) {
        if (item.type === 'health') {
          player.health = Math.min(PLAYER_HEALTH, player.health + HEALTH_PACK_AMOUNT);
        }
        item.active = false;
        io.emit('itemPickedUp', itemId); // Thông báo cho client để ẩn item
        // Hồi sinh item sau 15 giây
        setTimeout(() => {
          item.active = true;
          io.emit('itemRespawned', itemId); // Thông báo cho client để hiện lại
        }, 15000);
      }
    }
  }

  // Gửi trạng thái game mới nhất cho tất cả client
  io.emit('gameState', { players, bullets });

}, 1000 / 60);


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server đang lắng nghe tại cổng ${PORT}`);
});
