// server/player.js
const CONSTANTS = require('./constants');

function createPlayer(id, username) {
    return {
        id: id,
        username: username, // Thuộc tính này đã có, đảm bảo nó được gửi đi
        x: Math.floor(Math.random() * (CONSTANTS.MAP_WIDTH - 100)) + 50,
        y: Math.floor(Math.random() * (CONSTANTS.MAP_HEIGHT - 100)) + 50,
        radius: CONSTANTS.PLAYER_RADIUS,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        angle: 0,
        speed: CONSTANTS.PLAYER_SPEED,
        // Thêm lại các thuộc tính này
        weapon: 'pistol', // Bắt đầu với súng lục
        lastShotTime: 0,
        health: 100, // Thêm lại máu để nhặt item
    };
}

module.exports = { createPlayer };
