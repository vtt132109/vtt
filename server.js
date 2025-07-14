// server.js

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

// --- CÁC HẰNG SỐ CỦA GAME ---
const PLAYER_HEALTH = 100;
const PLAYER_RADIUS = 15;
const PLAYER_SPEED = 3;
const HEALTH_PACK_AMOUNT = 50;
const SPEED_BOOST_AMOUNT = 1.5;
const SPEED_BOOST_DURATION = 5000; // 5 giây

// Định nghĩa các loại vũ khí
const WEAPONS = {
  pistol: {
    name: 'Pistol',
    damage: 10,
    speed: 12,
    fireRate: 400, // ms per shot
    spread: 0.1, // radian
    bulletCount: 1,
  },
  shotgun: {
    name: 'Shotgun',
    damage: 15,
    speed: 10,
    fireRate: 1000,
    spread: 0.5,
    bulletCount: 6,
  },
  machinegun: {
    name: 'Machine Gun',
    damage: 5,
    speed: 15,
    fireRate: 100,
    spread: 0.2,
    bulletCount: 1,
  }
};

// --- TRẠNG THÁI GAME ---
const players = {};
const bullets = {};
const items = {};
const walls = [
  { x: 200, y: 150, width: 20, height: 300 },
  { x: 600, y: 150, width: 20, height: 300 },
  { x: 300, y: 400, width: 200, height: 20 }
];
let bulletIdCounter = 0;
let itemIdCounter = 0;

// --- HÀM HỖ TRỢ ---
function isCollidingRectCircle(rect, circle) {
  const distX = Math.abs(circle.x - rect.x - rect.width / 2);
  const distY = Math.abs(circle.y - rect.y - rect.height / 2);
  if (distX > (rect.width / 2 + circle.radius)) { return false; }
  if (distY > (rect.height / 2 + circle.radius)) { return false; }
  if (distX <= (rect.width / 2)) { return true; }
  if (distY <= (rect.height / 2)) { return true; }
  const dx = distX - rect.width / 2;
  const dy = distY - rect.height / 2;
  return (dx * dx + dy * dy <= (circle.radius * circle.radius));
}

function isCollidingCircleCircle(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < circle1.radius + circle2.radius;
}

function spawnItem() {
    const id = `item-${itemIdCounter++}`;
    const typeRoll = Math.random();
    let type, color;
    if (typeRoll < 0.2) { type = 'health'; color = 'lime'; }
    else if (typeRoll < 0.4) { type = 'speed'; color = 'yellow'; }
    else if (typeRoll < 0.7) { type = 'shotgun'; color = 'orange'; }
    else { type = 'machinegun'; color = 'cyan'; }

    items[id] = {
        id,
        x: Math.floor(Math.random() * 750) + 25,
        y: Math.floor(Math.random() * 550) + 25,
        radius: 10,
        type,
        color,
        active: true
    };
}
// Tạo 5 item ban đầu
for (let i = 0; i < 5; i++) {
    spawnItem();
}

// --- LOGIC KẾT NỐI ---
io.on('connection', (socket) => {
  socket.on('joinGame', (data) => {
    console.log(`${data.username} (${socket.id}) đã tham gia.`);
    players[socket.id] = {
      x: Math.floor(Math.random() * 700) + 50,
      y: Math.floor(Math.random() * 500) + 50,
      radius: PLAYER_RADIUS,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      id: socket.id,
      username: data.username,
      health: PLAYER_HEALTH,
      score: 0,
      angle: 0,
      speed: PLAYER_SPEED,
      weapon: 'pistol',
      lastShotTime: 0,
    };
    socket.emit('initialState', { players, walls, items });
    socket.broadcast.emit('newPlayer', players[socket.id]);
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      console.log(`${players[socket.id].username} đã ngắt kết nối.`);
      delete players[socket.id];
      io.emit('playerDisconnected', socket.id);
    }
  });

  socket.on('playerInput', (input) => {
    const player = players[socket.id];
    if (!player || player.health <= 0) return;

    // Di chuyển
    const potentialPosition = { x: player.x, y: player.y, radius: player.radius };
    if (input.keys.a) potentialPosition.x -= player.speed;
    if (input.keys.d) potentialPosition.x += player.speed;
    if (input.keys.w) potentialPosition.y -= player.speed;
    if (input.keys.s) potentialPosition.y += player.speed;

    let collision = false;
    for (const wall of walls) {
      if (isCollidingRectCircle(wall, potentialPosition)) {
        collision = true;
        break;
      }
    }
    if (!collision) {
      player.x = potentialPosition.x;
      player.y = potentialPosition.y;
    }

    // Hướng
    player.angle = input.angle;

    // Bắn
    const weapon = WEAPONS[player.weapon];
    if (input.mouseDown && Date.now() - player.lastShotTime > weapon.fireRate) {
      player.lastShotTime = Date.now();
      for (let i = 0; i < weapon.bulletCount; i++) {
        const angle = player.angle + (Math.random() - 0.5) * weapon.spread;
        const bulletId = `bullet-${bulletIdCounter++}`;
        bullets[bulletId] = {
          id: bulletId,
          ownerId: player.id,
          x: player.x + Math.cos(angle) * (player.radius + 5),
          y: player.y + Math.sin(angle) * (player.radius + 5),
          velocityX: Math.cos(angle) * weapon.speed,
          velocityY: Math.sin(angle) * weapon.speed,
          damage: weapon.damage,
          color: player.color,
          radius: 5,
        };
      }
    }
  });
});

// --- VÒNG LẶP GAME CHÍNH (SERVER-SIDE) ---
setInterval(() => {
  // Cập nhật đạn và va chạm
  for (const id in bullets) {
    const bullet = bullets[id];
    bullet.x += bullet.velocityX;
    bullet.y += bullet.velocityY;

    let bulletRemoved = false;
    // Va chạm đạn với tường
    for (const wall of walls) {
      if (isCollidingRectCircle(wall, bullet)) {
        delete bullets[id];
        bulletRemoved = true;
        break;
      }
    }
    if (bulletRemoved) continue;

    // Va chạm đạn với người chơi
    for (const playerId in players) {
      const player = players[playerId];
      if (bullet.ownerId !== playerId && player.health > 0 && isCollidingCircleCircle(bullet, player)) {
        player.health -= bullet.damage;
        delete bullets[id];
        bulletRemoved = true;
        if (player.health <= 0) {
          player.health = 0;
          const killer = players[bullet.ownerId];
          if (killer) killer.score += 1;
          setTimeout(() => {
            player.x = Math.floor(Math.random() * 700) + 50;
            player.y = Math.floor(Math.random() * 500) + 50;
            player.health = PLAYER_HEALTH;
            player.weapon = 'pistol';
            player.speed = PLAYER_SPEED;
          }, 3000);
        }
        break;
      }
    }
    if (bulletRemoved) continue;
    if (bullet.x < -50 || bullet.x > 850 || bullet.y < -50 || bullet.y > 650) {
      delete bullets[id];
    }
  }

  // Va chạm người chơi với item
  for (const playerId in players) {
    const player = players[playerId];
    if (player.health <= 0) continue;
    for (const itemId in items) {
      const item = items[itemId];
      if (item.active && isCollidingCircleCircle(player, item)) {
        if (item.type === 'health') {
          player.health = Math.min(PLAYER_HEALTH, player.health + HEALTH_PACK_AMOUNT);
        } else if (item.type === 'speed') {
          player.speed *= SPEED_BOOST_AMOUNT;
          setTimeout(() => { player.speed = PLAYER_SPEED; }, SPEED_BOOST_DURATION);
        } else if (item.type === 'shotgun' || item.type === 'machinegun') {
          player.weapon = item.type;
        }
        item.active = false;
        io.emit('itemPickedUp', itemId);
        setTimeout(() => {
          delete items[itemId];
          spawnItem();
          io.emit('newItem', Object.values(items).find(i => !i.active)); // Gửi item mới nhất
        }, 10000); // Hồi sinh item mới sau 10 giây
      }
    }
  }

  io.emit('gameState', { players, bullets });
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server đang lắng nghe tại cổng ${PORT}`);
});
