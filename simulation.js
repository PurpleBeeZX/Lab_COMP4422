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

let camera = new Vec3(0, 0, -2);
let last_t = 0;
function step(t) {
    // TODO
    const dt = (t - last_t) / 1000;
    last_t = t;
    const scale = 100;
    G.fillBackground(0x111111);
    camera = camera.add(new Vec3(1, 0, 0).scale(dt));
    cube.forEach((v) => {
        let { x, y, z } = v.sub(camera);
        x = x / z;
        y = y / z;
        x = x * scale + G.WIDTH / 2;
        y = y * scale + G.HEIGHT / 2;
        G.fillRectangle(x, y, 5, 5, 0xff0000);
        console.log(x, y);
    });
    G.show();
    requestAnimationFrame(step);
}
