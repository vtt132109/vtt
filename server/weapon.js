// server/weapon.js
module.exports = {
    pistol: {
      name: 'Pistol',
      damage: 10,
      speed: 12,
      fireRate: 400, // Cooldown giữa các phát bắn
      bulletCount: 1,
      spread: 0.1,
    },
    shotgun: {
      name: 'Shotgun',
      damage: 8, // Giảm damage một chút vì dễ trúng hơn
      speed: 10,
      fireRate: 1000,
      bulletCount: 3, // THAY ĐỔI: Bắn 3 viên
      spread: 0.4,
    },
    machinegun: {
      name: 'Machine Gun',
      damage: 7,
      speed: 15,
      fireRate: 1200, // THAY ĐỔI: Cooldown giữa các ĐỢT bắn
      bulletCount: 1,  // Bắn 1 viên mỗi lần trong đợt
      burstCount: 5,   // THAY ĐỔI: Mỗi đợt bắn 5 viên
      burstDelay: 80,  // THAY ĐỔI: Độ trễ giữa các viên trong một đợt
      spread: 0.25,
    }
};
