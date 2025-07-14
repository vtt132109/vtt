// public/main.js
import { Game } from './client/game.js';

const startMenu = document.getElementById('start-menu');
const usernameInput = document.getElementById('username-input');
const playButton = document.getElementById('play-button');
const canvas = document.getElementById('gameCanvas');
const fullscreenButton = document.getElementById('fullscreen-button');

const game = new Game(canvas);

playButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        startMenu.style.display = 'none';
        canvas.style.display = 'block';
        fullscreenButton.style.display = 'block';
        game.start(username);
    }
});

fullscreenButton.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
});

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();