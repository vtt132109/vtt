// server/game.js

// Thêm lại các hàm va chạm ở đầu file
function isCollidingRectCircle(rect, circle) { /* ... (copy từ code cũ) */ }
function isCollidingCircleCircle(circle1, circle2) { /* ... (copy từ code cũ) */ }

class Game {
    constructor(io) {
        this.io = io;
        this.players = {};
        this.bullets = {};
        this.items = {}; // Thêm lại
        this.walls = [   // Thêm lại tường
            // Viền bản đồ
            { x: -1, y: -1, width: CONSTANTS.MAP_WIDTH + 2, height: 1 },
            { x: -1, y: CONSTANTS.MAP_HEIGHT, width: CONSTANTS.MAP_WIDTH + 2, height: 1 },
            { x: -1, y: -1, width: 1, height: CONSTANTS.MAP_HEIGHT + 2 },
            { x: CONSTANTS.MAP_WIDTH, y: -1, width: 1, height: CONSTANTS.MAP_HEIGHT + 2 },
            // Các tường trong
            { x: 300, y: 200, width: 50, height: 800 },
            { x: 1250, y: 200, width: 50, height: 800 },
            { x: 600, y: 575, width: 400, height: 50 }
        ];
        this.bulletIdCounter = 0;
        this.itemIdCounter = 0; // Thêm lại
        this.init();
    }

    init() {
        // Spawn 5 item ban đầu
        for (let i = 0; i < 5; i++) this.spawnItem();
    }

    addPlayer(socket, data) {
        const newPlayer = createPlayer(socket.id, data.username);
        this.players[socket.id] = newPlayer;
        // Gửi thêm cả tường và item
        socket.emit('initialState', { 
            players: this.players, 
            bullets: this.bullets,
            walls: this.walls,
            items: this.items,
        });
        socket.broadcast.emit('newPlayer', newPlayer);
    }

    // ... (removePlayer giữ nguyên)

    handlePlayerInput(id, input) {
        // ... (logic bắn đã sửa ở trên)
        // Thêm lại logic va chạm tường cho di chuyển
        let collision = false;
        for (const wall of this.walls) {
            if (isCollidingRectCircle(wall, potentialPosition)) {
                collision = true;
                break;
            }
        }
        if (!collision) {
            player.x = potentialPosition.x;
            player.y = potentialPosition.y;
        }
    }

    update() {
        // Cập nhật đạn
        for (const id in this.bullets) {
            const bullet = this.bullets[id];
            bullet.x += bullet.velocityX;
            bullet.y += bullet.velocityY;

            // Thêm lại va chạm đạn với tường
            let bulletRemoved = false;
            for (const wall of this.walls) {
                if (isCollidingRectCircle(wall, { ...bullet, radius: bullet.radius })) {
                    delete this.bullets[id];
                    bulletRemoved = true;
                    break;
                }
            }
            if (bulletRemoved) continue;

            // ... (xóa đạn khi ra khỏi màn hình)
        }

        // Thêm lại logic va chạm người chơi với item
        for (const playerId in this.players) {
            const player = this.players[playerId];
            for (const itemId in this.items) {
                const item = this.items[itemId];
                if (item.active && isCollidingCircleCircle(player, item)) {
                    if (item.type === 'health') {
                        player.health = Math.min(CONSTANTS.PLAYER_HEALTH, player.health + CONSTANTS.HEALTH_PACK_AMOUNT);
                    } else if (item.type === 'shotgun' || item.type === 'machinegun') {
                        player.weapon = item.type;
                    }
                    item.active = false;
                    this.io.emit('itemPickedUp', itemId);
                    setTimeout(() => {
                        delete this.items[itemId];
                        this.spawnItem();
                    }, 10000);
                }
            }
        }
    }

    getState() {
        return {
            players: this.players,
            bullets: this.bullets,
            // Không cần gửi tường và item mỗi lần update, chỉ gửi lúc đầu
        };
    }

    // Thêm lại hàm spawnItem
    spawnItem() {
        const id = `item-${this.itemIdCounter++}`;
        const typeRoll = Math.random();
        let type, color;
        if (typeRoll < 0.4) { type = 'health'; color = 'lime'; }
        else if (typeRoll < 0.7) { type = 'shotgun'; color = 'orange'; }
        else { type = 'machinegun'; color = 'cyan'; }

        const newItem = {
            id,
            x: Math.floor(Math.random() * (CONSTANTS.MAP_WIDTH - 100)) + 50,
            y: Math.floor(Math.random() * (CONSTANTS.MAP_HEIGHT - 100)) + 50,
            radius: 10,
            type,
            color,
            active: true
        };
        this.items[id] = newItem;
        this.io.emit('newItem', newItem);
    }
}

module.exports = Game;
