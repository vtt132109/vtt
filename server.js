// server.js

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const Game = require('./server/game'); // Đảm bảo đường dẫn này đúng

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Phục vụ các file tĩnh từ thư mục 'public'
app.use(express.static('public'));

// Khởi tạo một instance duy nhất của Game và truyền 'io' vào
const game = new Game(io);
console.log("Game instance created.");

// Lắng nghe các kết nối mới từ client
io.on('connection', (socket) => {
    console.log(`[Connection] Một người chơi đã kết nối: ${socket.id}`);

    // Lắng nghe sự kiện khi người chơi muốn tham gia game
    socket.on('joinGame', (data) => {
        console.log(`[Event: joinGame] User ${data.username} (ID: ${socket.id}) is joining.`);
        game.addPlayer(socket, data);
    });

    // Lắng nghe sự kiện khi người chơi ngắt kết nối
    socket.on('disconnect', () => {
        console.log(`[Event: disconnect] Player ${socket.id} has disconnected.`);
        game.removePlayer(socket);
    });

    // Lắng nghe sự kiện input từ người chơi (di chuyển, bắn)
    socket.on('playerInput', (input) => {
        // Log này rất hữu ích để xem server có nhận được input không
        // console.log(`[Event: playerInput] Received input from ${socket.id}: ${JSON.stringify(input)}`);
        game.handlePlayerInput(socket.id, input);
    });

    // Lắng nghe sự kiện Dash
    socket.on('dash', () => {
        console.log(`[Event: dash] Player ${socket.id} requested a dash.`);
        game.handleDash(socket.id);
    });

    // Lắng nghe sự kiện Chat
    socket.on('chatMessage', (msg) => {
        // console.log(`[Event: chatMessage] from ${socket.id}: ${msg}`);
        game.handleChatMessage(socket.id, msg);
    });
});

// Vòng lặp chính của server, cập nhật và gửi trạng thái game 60 lần/giây
setInterval(() => {
    // Cập nhật toàn bộ logic game (di chuyển đạn, va chạm, etc.)
    game.update();

    // Chỉ gửi trạng thái nếu có ít nhất một người chơi
    if (Object.keys(game.players).length > 0) {
        // Gửi trạng thái mới nhất của game cho TẤT CẢ các client
        io.emit('gameState', game.getState());
    }
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
