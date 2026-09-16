const G = new Graphic(512, 512);

function simulation() {
    requestAnimationFrame(step);
}

const cube = [
    [1, 1, 1],
    [-1, 1, 1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, -1, -1],
    [-1, 1, -1],
    [1, 1, -1],
].map(([x, y, z]) => new Vec3(x, y, z));

function step(t) {
    // TODO
    const scale = 400;
    G.fillBackground(0x111111);
    cube.forEach((v) => {
        let z = v.z + 10;
        let x = v.x / z;
        let y = v.y / z;
        x = x * scale + G.WIDTH / 2;
        y = y * scale + G.HEIGHT / 2;
        G.fillRectangle(x, y, 10, 10, 0xff0000);
        console.log(x, y);
    });
    G.show();
    requestAnimationFrame(step);
}
