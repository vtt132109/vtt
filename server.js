// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const Game = require('./server/game');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const game = new Game(io);

io.on('connection', (socket) => {
    socket.on('joinGame', (username) => game.addPlayer(socket, username));
    socket.on('disconnect', () => game.removePlayer(socket));
    // THAY ĐỔI: Nhận input đã được nén
    socket.on('i', (inputArray) => game.handlePlayerInput(socket.id, inputArray));
});

// Tách biệt vòng lặp logic và vòng lặp gửi gói tin
setInterval(() => {
    game.update();
}, 1000 / 60); // Logic chạy ở 60Hz

setInterval(() => {
    if (Object.keys(game.players).length > 0) {
        io.emit('s', game.getState()); // 's' for state
    }
}, 1000 / 30); // Gửi state ở 30Hz để tiết kiệm băng thông

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
