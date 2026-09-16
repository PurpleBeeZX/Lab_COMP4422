class Graphic {
    constructor(width, height) {
        this._width = width;
        this._height = height;
        this._ctx = document.getElementById("c").getContext("2d");
        this._img = this._ctx.createImageData(width, height);
    }

    get WIDTH() {
        return this._width;
    }
    get HEIGHT() {
        return this._height;
    }
    get ctx() {
        return this._ctx;
    }
    get img() {
        return this._img;
    }

    static hex2rgb(hex) {
        return {
            r: (hex >> 16) & 255,
            g: (hex >> 8) & 255,
            b: hex & 255,
        };
    }
    
    putPixel(x, y, r, g, b) {
        if (x < 0 || x >= this.WIDTH || y < 0 || y >= this.HEIGHT) return;
        const i = (x + y * this.WIDTH) * 4;
        this.img.data[i] = r;
        this.img.data[i + 1] = g;
        this.img.data[i + 2] = b;
        this.img.data[i + 3] = 0xff;
    }

    show() {
        this.ctx.putImageData(this.img, 0, 0);
    }

    fillRectangle(x, y, w, h, color) {
        const { r, g, b } = Graphic.hex2rgb(color);
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                this.putPixel(x + dx, y + dy, r, g, b);
            }
        }
    }

    fillBackground(color) {
        this.fillRectangle(0, 0, this.WIDTH, this.HEIGHT, color);
    }
    
}
