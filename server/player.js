// server/player.js
const CONSTANTS = require('./constants');

function createPlayer(id, username) {
    return {
        id: id,
        username: username,
        x: Math.floor(Math.random() * (CONSTANTS.MAP_WIDTH - 100)) + 50,
        y: Math.floor(Math.random() * (CONSTANTS.MAP_HEIGHT - 100)) + 50,
        radius: CONSTANTS.PLAYER_RADIUS,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        angle: 0,
        speed: CONSTANTS.PLAYER_SPEED,
        weapon: 'basic',
    };
}

module.exports = { createPlayer };
