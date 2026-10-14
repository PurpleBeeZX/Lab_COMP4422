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
].map(Vec3.fromArray);

function xRotMat(theta) { 
    const sin = Math.sin(theta);
    const cos = Math.cos(theta);
    return [
        [1, 0, 0],
        [0, cos, -sin],
        [0, sin, cos],
    ].map(Vec3.fromArray);
}

let camera = new Vec3(0, 0, -5);
let last_t = 0;
let pos = 0;
function step(t) {
    // TODO
    const dt = (t - last_t) / 1000;
    pos += 1 * dt;
    last_t = t;
    const scale = 100;
    G.fillBackground(0x111111);
    // camera = camera.add(new Vec3(1, 0, 0).scale(dt));
    cube.forEach((v) => {
        let {x, y, z} = v.applyMatrix(xRotMat(pos)).sub(camera);
        x = x / z;
        y = y / z;
        x = x * scale + G.WIDTH / 2;
        y = y * scale + G.HEIGHT / 2;
        G.fillCircle(x, y, 2, 0xff0000);
    });
    G.show();
    requestAnimationFrame(step);
}
