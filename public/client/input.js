// public/client/input.js

export class Input {
    constructor(canvas, chatInput, network) {
        this.canvas = canvas;
        this.chatInput = chatInput;
        this.network = network;
        
        // Trạng thái input sẽ được gửi lên server
        this.state = {
            keys: { w: false, a: false, s: false, d: false },
            mouse: { x: 0, y: 0, down: false },
            angle: 0
        };

        // Lấy các element âm thanh từ HTML
        this.sounds = {
            shoot: document.getElementById('shoot-sound'),
            dash: document.getElementById('dash-sound'),
        };
    }

    startListening() {
        // Gán các sự kiện cho các hàm xử lý tương ứng
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.chatInput.addEventListener('keydown', (e) => this.handleChatInput(e));
    }

    handleKeyDown(e) {
        // Nếu đang gõ chat, không xử lý input game
        if (e.target === this.chatInput) return;

        // Cập nhật trạng thái phím di chuyển
        if (this.state.keys.hasOwnProperty(e.key)) {
            this.state.keys[e.key] = true;
        }

        // Xử lý kỹ năng Dash
        if (e.key === 'e') {
            this.network.sendDash();
            this.playSound(this.sounds.dash); // Sửa: Dùng hàm playSound an toàn
        }
    }

    handleKeyUp(e) {
        if (e.target === this.chatInput) return;
        if (this.state.keys.hasOwnProperty(e.key)) {
            this.state.keys[e.key] = false;
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.state.mouse.x = e.clientX - rect.left;
        this.state.mouse.y = e.clientY - rect.top;
    }

    handleMouseDown(e) {
        // Chỉ xử lý cho chuột trái
        if (e.button === 0) {
            // SỬA: Cập nhật trạng thái logic game LÊN TRƯỚC
            this.state.mouse.down = true;
            
            // SỬA: Phát âm thanh một cách an toàn
            this.playSound(this.sounds.shoot);
        }
    }

    handleMouseUp(e) {
        if (e.button === 0) {
            this.state.mouse.down = false;
        }
    }

    handleChatInput(e) {
        if (e.key === 'Enter' && this.chatInput.value.trim() !== '') {
            this.network.sendChatMessage(this.chatInput.value);
            this.chatInput.value = '';
            this.canvas.focus(); // Trả focus về cho game
        }
    }

    // Hàm này trả về trạng thái input hiện tại để gửi lên server
    getState() {
        return this.state;
    }

    // SỬA: Hàm mới để phát âm thanh một cách an toàn
    // Nó sẽ không làm sập game nếu file âm thanh bị lỗi
    playSound(soundElement) {
        if (soundElement) {
            try {
                // Đặt lại thời gian để có thể phát lại ngay lập-tức
                soundElement.currentTime = 0;
                soundElement.play().catch(error => {
                    // Bắt lỗi bất đồng bộ từ promise của .play()
                    console.error("Error playing sound:", error);
                });
            } catch (error) {
                console.error("Could not play sound element:", error);
            }
        }
    }
}
