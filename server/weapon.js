// server/weapon.js
module.exports = {
    pistol: {
      name: 'Pistol',
      damage: 10,
      speed: 12,
      fireRate: 400, // 400ms cho mỗi phát bắn
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
