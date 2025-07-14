// server/player.js
const CONSTANTS = require('./constants');

function createPlayer(id, username) {
    return {
        id: id,
        username: username,
        x: Math.floor(Math.random() * (CONSTANTS.MAP_WIDTH - 200)) + 100,
        y: Math.floor(Math.random() * (CONSTANTS.MAP_HEIGHT - 200)) + 100,
        radius: CONSTANTS.PLAYER_RADIUS,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        angle: 0,
        speed: CONSTANTS.PLAYER_SPEED,
        health: CONSTANTS.PLAYER_HEALTH,
        weapon: 'pistol',
        lastShotTime: 0,
        score: 0,
        // MỚI
        isDead: false,
        respawnTime: 0,
        grenades: 2,
        lastGrenadeTime: 0,
    };
}

module.exports = { createPlayer };
