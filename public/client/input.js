// public/client/input.js
export class Input {
    constructor(canvas, chatInput, network) {
        this.canvas = canvas;
        this.chatInput = chatInput;
        this.network = network;
        this.state = {
            keys: { w: false, a: false, s: false, d: false },
            mouse: { x: 0, y: 0, down: false },
            angle: 0
        };
        this.sounds = {
            shoot: document.getElementById('shoot-sound'),
            dash: document.getElementById('dash-sound'),
        };
    }

    startListening() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.chatInput.addEventListener('keydown', (e) => this.handleChatInput(e));
    }

    handleKeyDown(e) {
        if (e.target === this.chatInput) return;
        if (this.state.keys.hasOwnProperty(e.key)) this.state.keys[e.key] = true;
        if (e.key === 'e') {
            this.network.sendDash();
            this.sounds.dash.currentTime = 0;
            this.sounds.dash.play();
        }
    }

    handleKeyUp(e) {
        if (e.target === this.chatInput) return;
        if (this.state.keys.hasOwnProperty(e.key)) this.state.keys[e.key] = false;
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.state.mouse.x = e.clientX - rect.left;
        this.state.mouse.y = e.clientY - rect.top;
    }

    handleMouseDown(e) {
        console.log("Mouse Down Event Fired!");
        if (e.button === 0) {
            this.state.mouse.down = true;
            this.sounds.shoot.currentTime = 0;
            this.sounds.shoot.play();
        }
    }

    handleMouseUp(e) {
         console.log("Mouse Up Event Fired!");
        if (e.button === 0) this.state.mouse.down = false;
    }

    handleChatInput(e) {
        if (e.key === 'Enter') {
            this.network.sendChatMessage(this.chatInput.value);
            this.chatInput.value = '';
            this.canvas.focus();
        }
    }

    getState() {
        return this.state;
    }
}
