// server/weapon.js
module.exports = {
    pistol: {
      name: 'Pistol',
      damage: 10,
      speed: 12,
      fireRate: 400,
      bulletCount: 1,
      spread: 0.1,
    },
    shotgun: {
      name: 'Shotgun',
      damage: 8,
      speed: 10,
      fireRate: 1000,
      bulletCount: 3,
      spread: 0.4,
    },
    machinegun: {
      name: 'Machine Gun',
      damage: 7,
      speed: 15,
      fireRate: 1200,
      bulletCount: 1,
      burstCount: 5,
      burstDelay: 80,
      spread: 0.25,
    }
};
