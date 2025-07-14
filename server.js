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
    console.log(`[Connect] ${socket.id}`);
    socket.on('joinGame', (data) => game.addPlayer(socket, data));
    socket.on('disconnect', () => game.removePlayer(socket));
    socket.on('playerInput', (input) => game.handlePlayerInput(socket.id, input));
});

setInterval(() => {
    game.update();
    if (Object.keys(game.players).length > 0) {
        io.emit('gameState', game.getState());
    }
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
