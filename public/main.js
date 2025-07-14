// public/main.js
import { Game } from './client/game.js';

// Lấy các element từ DOM
const startMenu = document.getElementById('start-menu');
const usernameInput = document.getElementById('username-input');
const playButton = document.getElementById('play-button');
const canvas = document.getElementById('gameCanvas');

// --- BƯỚC KIỂM TRA AN TOÀN ---
// Kiểm tra xem tất cả các element có thực sự tồn tại không
if (!startMenu || !usernameInput || !playButton || !canvas) {
    // Nếu một trong số chúng là null, hiển thị lỗi chi tiết trong console
    console.error("Initialization failed: One or more HTML elements were not found.");
    console.error("Check the IDs in your index.html and main.js file.");
    console.error({
        startMenu,
        usernameInput,
        playButton,
        canvas
    });
} else {
    // Chỉ khởi tạo game và thêm sự kiện nếu tất cả element đều OK
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
