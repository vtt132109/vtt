// server/player.js
const CONSTANTS = require('./constants');

function createPlayer(id, username) {
    return {
        x: Math.floor(Math.random() * (CONSTANTS.MAP_WIDTH - 200)) + 100,
        y: Math.floor(Math.random() * (CONSTANTS.MAP_HEIGHT - 200)) + 100,
        radius: CONSTANTS.PLAYER_RADIUS,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        id: id,
        username: username,
        health: CONSTANTS.PLAYER_HEALTH,
        score: 0,
        angle: 0,
        speed: CONSTANTS.PLAYER_SPEED,
        weapon: 'pistol',
        lastShotTime: 0,
        isDashing: false,
        lastDashTime: 0,
        dashVelocityX: 0,
        dashVelocityY: 0,
    };
}

module.exports = { createPlayer };