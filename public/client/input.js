// public/client/input.js
export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.state = {
            keys: { w: false, a: false, s: false, d: false },
            isShooting: false,
            angle: 0,
            mousePos: { x: 0, y: 0 },
        };
    }

    startListening() {
        window.addEventListener('keydown', (e) => {
            if (this.state.keys.hasOwnProperty(e.key)) this.state.keys[e.key] = true;
        });
        window.addEventListener('keyup', (e) => {
            if (this.state.keys.hasOwnProperty(e.key)) this.state.keys[e.key] = false;
        });
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.state.isShooting = true;
        });
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.state.isShooting = false;
        });
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.state.mousePos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        });
    }

    getState() {
        return this.state;
    }
}
