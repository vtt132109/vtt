// public/main.js
import { Game } from './client/game.js';

function initialize() {
    const startMenu = document.getElementById('start-menu');
    const usernameInput = document.getElementById('username-input');
    const playButton = document.getElementById('play-button');
    const canvas = document.getElementById('gameCanvas');

    if (!startMenu || !usernameInput || !playButton || !canvas) {
        console.error("Initialization failed: An essential HTML element is missing.");
        return;
    }

    const game = new Game(canvas);

    playButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username) {
            startMenu.style.display = 'none';
            canvas.style.display = 'block';
            game.start(username);
        }
    });
}

window.addEventListener('DOMContentLoaded', initialize);
