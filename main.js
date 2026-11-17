// setup
let keys = {};
let pressed = {};
let mouseDX = 0;
let mouseDY = 0;
let wheelDelta = 0;
let paused = false;
let timeScale = 1;
let orbitYaw = 0;
let orbitPitch = 0.38;
let viewAspect = 1;
let manualZoom = 1.0;
let resizeRequested = true;

let gameState = "menu";
let runTime = 0;
let runDistance = 0;
let coinsCollected = 0;
let carriageCount = 1;
let runMaxCarriages = 1;

const bestStats = { time: 0, distance: 0, coins: 0, carriages: 1 };
const lastStats = { time: 0, distance: 0, coins: 0, carriages: 1, hasRun: false };

const hud = document.getElementById("hud");
const steeringOverlay = document.getElementById("steering");
const steeringWheel = document.getElementById("steering-wheel");
const steeringValue = document.getElementById("steering-value");
const speedNeedle = document.getElementById("speed-needle");
const speedValue = document.getElementById("speed-value");
const startScreen = document.getElementById("start-screen");
const startTitle = document.getElementById("start-title");
const startMessage = document.getElementById("start-message");
const lastStatsElement = document.getElementById("last-stats");
const bestStatsElement = document.getElementById("best-stats");
const startButton = document.getElementById("start-button");

window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
    }
    keys[e.code] = true;
    if (!e.repeat) {
        pressed[e.code] = true;
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
});
window.addEventListener("click", () => {
    if (document.pointerLockElement !== canvas) {
        const request = canvas.requestPointerLock();
        if (request && request.catch) {
            request.catch((err) => console.warn("pointer lock failed", err));
        }
    }
});
window.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas) {
        mouseDX += e.movementX;
        mouseDY += e.movementY;
    }
});
window.addEventListener("wheel", (e) => {
    wheelDelta += e.deltaY;
}, { passive: true });
window.addEventListener("resize", () => {
    resizeRequested = true;
});
const resizeObserver = new ResizeObserver(() => {
    resizeRequested = true;
});
resizeObserver.observe(canvas);

// scene constants
const SUN_RADIUS = 24;
const SUN_ROTATION_PERIOD = 600;
const SUN_SPIN_SPEED = (2 * Math.PI) / SUN_ROTATION_PERIOD;
const EARTH_ORBIT = 600;
const EARTH_YEAR_PERIOD = 300;
const EARTH_ORBIT_SPEED = (2 * Math.PI) / EARTH_YEAR_PERIOD;
const EARTH_DAY_PERIOD = 60;
const EARTH_SPIN_SPEED = (2 * Math.PI) / EARTH_DAY_PERIOD;
const EARTH_RADIUS = 40;
const MOON_ORBIT = 90;
const MOON_MONTH_PERIOD = 90;
const MOON_ORBIT_SPEED = (2 * Math.PI) / MOON_MONTH_PERIOD;
const MOON_SPIN_SPEED = MOON_ORBIT_SPEED;
const MOON_RADIUS = SUN_RADIUS * MOON_ORBIT / EARTH_ORBIT;
const MOON_TILT = 0.09;
const TRAIN_SCALE = 1.0;
const TRAIN_CAR_SCALE = 0.9;
const TRAIN_CLEARANCE = 0.02;
const TRAIN_HALF_WIDTH = 0.38;
const TRAIN_CAR_SPACING = 1.25;
const TRAIN_BASE_MAX_SPEED = 6.0;
const TRAIN_SPEED_GROWTH = 0.12;
const TRAIN_ULTIMATE_MAX_SPEED = 14.0;
const TRAIN_ACCELERATION = 6.0;
const TRAIN_BRAKING = 9.0;
const TRAIN_DRAG = 4.0;
const TRAIN_STEER_SENSITIVITY = 0.0024;
const TRAIN_TURN_SPEED = 1.6;
const TRAIN_TURN_FULL_SPEED = 2.0;
const TRAIN_CAMERA_BASE_DISTANCE = 8.0;
const TRAIN_CAMERA_PER_CAR_DISTANCE = 1.0;
const TRAIN_CAMERA_MIN_DISTANCE = 2.0;
const TRAIN_CAMERA_MAX_DISTANCE = 36.0;
const TRAIN_CAMERA_ZOOM_SPEED = 0.001;
const TRAIN_CAMERA_DISTANCE_SMOOTHING = 2.8;
const MANUAL_ZOOM_MIN = 0.6;
const MANUAL_ZOOM_MAX = 1.5;
const EARTH_LIGHT_COLOR = [0.35, 0.85, 1.0];
const CONE_LIGHT_COUNT = 4;
const CONE_LIGHT_COLOR = [1.0, 0.42, 0.12];
const CONE_LIGHT_POWER = 1.2;
const COIN_HOVER = 0.05;
const BLOOM_SCALE = 0.5;
const BLOOM_THRESHOLD_HDR = 1.0;
const BLOOM_THRESHOLD_LDR = 0.8;
const BLOOM_STRENGTH = 0.9;
const BLOOM_BLUR_PASSES = 3;
const TRAIN_TRAIL_SAMPLE_DISTANCE = 0.08;
const TRAIN_TRAIL_MARGIN = 2.0;
const COIN_COUNT = 30;
const CONE_COUNT = 180;
const COIN_RADIUS = 0.45;
const COIN_THICKNESS = 0.12;
const CONE_RADIUS = 1.1;
const CONE_HEIGHT = 2.0;
const CONE_GROUND_SINK = 0.12;
const CONE_TIP_LIFT = CONE_HEIGHT - CONE_GROUND_SINK;
const COIN_PICKUP_ANGLE = 0.06;
const COIN_RESPAWN_CLEAR_ANGLE = 0.45;
const CONE_HIT_ANGLE = Math.atan((CONE_RADIUS * 0.5 + TRAIN_HALF_WIDTH) / (EARTH_RADIUS + TRAIN_CLEARANCE));
const ITEM_SEED = 20261118;
const ITEM_START_ANGLE = 0.18;
const ITEM_SPACING_ANGLE = 0.12;
const CONE_START_ANGLE = 0.32;
const CONE_SPACING_ANGLE = 0.16;
const MENU_CAMERA_DISTANCE = 260;
const MENU_CAMERA_ORBIT_SPEED = 0.05;
const MENU_CAMERA_PITCH_SPEED = 0.021;
const MENU_CAMERA_PITCH_RANGE = 0.85;
const MENU_CAMERA_TARGET_BIAS = 1.0;
const OVER_CAMERA_CLOSE_DISTANCE = 14;
const OVER_CAMERA_RETREAT_TIME = 3.0;
const OVER_CAMERA_RETREAT_DISTANCE = 150;
const OVER_CAMERA_ZOOM_TIME = 4.0;
const OVER_CAMERA_MIN_CLEARANCE = 10;
const TRAIN_START_DIR = new Vec3(-0.8, 0.5, 0.3).normalize();

function getCurrentMaxSpeed() {
    return Math.min(
        TRAIN_ULTIMATE_MAX_SPEED,
        TRAIN_BASE_MAX_SPEED + runTime * TRAIN_SPEED_GROWTH
    );
}

// train state
let trainPos = new Vec3(TRAIN_START_DIR.x, TRAIN_START_DIR.y, TRAIN_START_DIR.z);
let trainForward = tangentForward(trainPos, new Vec3(0, 0, 1));
let trainSpeed = 0;
let trainSteering = 0;
let trainTrail = [];
let cameraAutoDistance = TRAIN_CAMERA_BASE_DISTANCE;
let deathFrame = null;
let overCameraTime = 0;

function fibonacciDirection(index, count, salt) {
    const y = 1 - (2 * (index + 0.5)) / count;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const angle = index * goldenAngle + salt * 2.399963229728653 + ITEM_SEED * 0.0001;
    return new Vec3(radius * Math.cos(angle), y, radius * Math.sin(angle));
}

function randomUnitDirection() {
    const y = Math.random() * 2 - 1;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    return new Vec3(radius * Math.cos(angle), y, radius * Math.sin(angle));
}

function makeItemDirections(count, salt, occupied, minAngle = ITEM_SPACING_ANGLE) {
    const directions = [];
    const candidateCount = count * 4;
    for (let index = 0; index < candidateCount && directions.length < count; index++) {
        const direction = fibonacciDirection(index, candidateCount, salt);
        if (direction.dot(TRAIN_START_DIR) > Math.cos(ITEM_START_ANGLE)) {
            continue;
        }
        if (occupied.some((other) => direction.dot(other) > Math.cos(minAngle))) {
            continue;
        }
        if (directions.some((other) => direction.dot(other) > Math.cos(minAngle))) {
            continue;
        }
        directions.push(direction);
    }
    return directions;
}

function makeSpreadDirections(count, salt, occupied, minAngle, startAngle) {
    const directions = [];
    const startLimit = Math.cos(startAngle);
    const separationLimit = Math.cos(minAngle);
    const pushAway = (direction, other, limit, strength) => {
        const dot = direction.dot(other);
        if (dot <= limit) {
            return new Vec3(0, 0, 0);
        }
        const away = direction.sub(other.scale(dot));
        if (away.length() < 0.000001) {
            return new Vec3(0, 0, 0);
        }
        return away.normalize().scale(strength * (dot - limit) / (1 - limit));
    };

    for (let index = 0; index < count; index++) {
        directions.push(fibonacciDirection(index, count, salt));
    }
    for (let pass = 0; pass < 28; pass++) {
        const pushes = directions.map(() => new Vec3(0, 0, 0));
        for (let i = 0; i < count; i++) {
            for (const other of occupied) {
                pushes[i] = pushes[i].add(pushAway(directions[i], other, separationLimit, 0.05));
            }
            pushes[i] = pushes[i].add(pushAway(directions[i], TRAIN_START_DIR, startLimit, 0.2));
        }
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const dot = directions[i].dot(directions[j]);
                if (dot <= separationLimit) {
                    continue;
                }
                const awayI = directions[i].sub(directions[j].scale(dot));
                const awayJ = directions[j].sub(directions[i].scale(dot));
                const strength = 0.08 * (dot - separationLimit) / (1 - separationLimit);
                if (awayI.length() > 0.000001) {
                    pushes[i] = pushes[i].add(awayI.normalize().scale(strength));
                }
                if (awayJ.length() > 0.000001) {
                    pushes[j] = pushes[j].add(awayJ.normalize().scale(strength));
                }
            }
        }
        for (let i = 0; i < count; i++) {
            directions[i] = directions[i].add(pushes[i]).normalize();
        }
    }
    return directions;
}

function initializeTrail() {
    trainTrail = [];
    const up = trainPos.normalize();
    const axis = trainForward.cross(up);
    const maxDistance = (COIN_COUNT + 1) * TRAIN_CAR_SPACING + TRAIN_TRAIL_MARGIN;
    const steps = Math.ceil(maxDistance / TRAIN_TRAIL_SAMPLE_DISTANCE);
    for (let i = steps; i >= 0; i--) {
        const distance = i * TRAIN_TRAIL_SAMPLE_DISTANCE;
        const dir = up.rotateAroundAxis(axis, distance / (EARTH_RADIUS + TRAIN_CLEARANCE));
        trainTrail.push({
            dir,
            forward: tangentForward(dir, trainForward),
            distance: -distance,
        });
    }
}

function recordTrail() {
    if (trainTrail.length === 0 || runDistance - trainTrail[trainTrail.length - 1].distance >= TRAIN_TRAIL_SAMPLE_DISTANCE) {
        trainTrail.push({
            dir: new Vec3(trainPos.x, trainPos.y, trainPos.z),
            forward: new Vec3(trainForward.x, trainForward.y, trainForward.z),
            distance: runDistance,
        });
    }
    const maxDistance = (COIN_COUNT + 1) * TRAIN_CAR_SPACING + TRAIN_TRAIL_MARGIN;
    while (trainTrail.length > 2 && runDistance - trainTrail[0].distance > maxDistance) {
        trainTrail.shift();
    }
}

function getTrailSample(distanceBehind) {
    if (distanceBehind <= 0 || trainTrail.length === 0) {
        return {
            dir: new Vec3(trainPos.x, trainPos.y, trainPos.z),
            forward: new Vec3(trainForward.x, trainForward.y, trainForward.z),
        };
    }
    const target = runDistance - distanceBehind;
    if (target <= trainTrail[0].distance) {
        return trainTrail[0];
    }
    const last = trainTrail[trainTrail.length - 1];
    if (target >= last.distance) {
        return last;
    }
    let low = 0;
    let high = trainTrail.length - 1;
    while (low + 1 < high) {
        const mid = Math.floor((low + high) / 2);
        if (trainTrail[mid].distance <= target) {
            low = mid;
        } else {
            high = mid;
        }
    }
    const a = trainTrail[low];
    const b = trainTrail[high];
    const span = b.distance - a.distance;
    const t = span > 0 ? (target - a.distance) / span : 0;
    const dir = a.dir.add(b.dir.sub(a.dir).scale(t)).normalize();
    const forwardHint = a.forward.add(b.forward.sub(a.forward).scale(t));
    return { dir, forward: tangentForward(dir, forwardHint) };
}

// load assets
async function loadAssets() {
    hud.textContent = "Loading assets...";
    const [carBody, carWheels, sphere, coin, cone] = await Promise.all([
        loadObject("./assets/car_body.obj"),
        loadObject("./assets/car_wheels.obj"),
        loadObject("./assets/sphere.obj"),
        loadObject("./assets/coin.obj"),
        loadObject("./assets/cone.obj"),
    ]);
    const [carSpotTexture, planetNoiseTexture, earthHexTexture, coneStripesTexture] = await Promise.all([
        initTextures("./assets/textures/car_spot.png"),
        initTextures("./assets/textures/planet_noise.png"),
        initTextures("./assets/textures/earth_hex_grid.png", true),
        initTextures("./assets/textures/cone_stripes.png", true),
    ]);
    return {
        carBody,
        carWheels,
        sphere,
        coin,
        cone,
        carSpotTexture,
        planetNoiseTexture,
        earthHexTexture,
        coneStripesTexture,
    };
}

loadAssets()
    .then((assets) => main(assets))
    .catch((err) => {
        console.error("asset loading failed", err);
        hud.textContent = "Failed to load assets";
    });

function statsText(stats, label) {
    return `<div class="stats-title">${label}</div>` +
        `Time: ${stats.time.toFixed(1)}s<br>` +
        `Distance: ${stats.distance.toFixed(1)}<br>` +
        `Coins: ${stats.coins}<br>` +
        `Carriages: ${stats.carriages}`;
}

function updateResultPanel(title, message, buttonText) {
    startTitle.textContent = title;
    startMessage.textContent = message;
    lastStatsElement.innerHTML = lastStats.hasRun
        ? statsText(lastStats, "LAST RUN")
        : "";
    bestStatsElement.innerHTML = statsText(bestStats, "BEST THIS SESSION");
    startButton.textContent = buttonText;
    startScreen.classList.remove("hidden");
    steeringOverlay.style.display = "none";
    hud.textContent = "";
}

function updateRunHud() {
    hud.textContent = `TRAIN | ${trainSpeed.toFixed(1)} u/s | ${carriageCount} cars | ${coinsCollected} coins | ${runTime.toFixed(1)}s`;
}

function updateSteeringHud() {
    const percent = Math.round(trainSteering * 100);
    const direction = trainSteering > 0.005 ? "R"
        : trainSteering < -0.005 ? "L"
        : "C";

    const maxSpeed = getCurrentMaxSpeed();
    const speedRatio = Math.max(0, Math.min(1, trainSpeed / maxSpeed));
    const needleAngle = -120 + speedRatio * 240;

    steeringWheel.style.transform = `rotate(${trainSteering * 120}deg)`;
    steeringValue.textContent = `${direction} ${Math.abs(percent)}%`;
    speedNeedle.style.transform = `translateX(-50%) rotate(${needleAngle}deg)`;
    speedValue.textContent = `${trainSpeed.toFixed(1)} / ${maxSpeed.toFixed(1)}`;
}

function resizeCanvas(onResize) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    viewAspect = rect.height > 0 ? rect.width / rect.height : 1;

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        if (onResize) {
            onResize(width, height);
        }
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
}

// scene graph
class SceneNode {
    constructor(local = Mat4.identity(), mesh = null, material = null) {
        this.local = local;
        this.mesh = mesh;
        this.material = material;
        this.children = [];
        this.world = Mat4.identity();
        this.visible = true;
    }
    add(child) {
        this.children.push(child);
        return child;
    }
}

function updateWorld(node, parentWorld) {
    node.world = parentWorld.mul(node.local);
    for (const child of node.children) {
        updateWorld(child, node.world);
    }
}

function drawNode(node, uniforms) {
    if (node.visible === false) {
        return;
    }
    if (node.mesh) {
        gl.uniformMatrix4fv(uniforms.model, false, new Float32Array(node.world.plainArr));
        gl.uniform3fv(uniforms.baseColor, node.material.baseColor);
        gl.uniform1f(uniforms.ka, node.material.ka);
        gl.uniform1f(uniforms.kd, node.material.kd);
        gl.uniform1f(uniforms.ks, node.material.ks);
        gl.uniform1f(uniforms.shininess, node.material.shininess);
        gl.uniform1f(uniforms.emissive, node.material.emissive);
        gl.uniform1f(uniforms.earthLightMask, node.material.earthLight === undefined ? 0 : node.material.earthLight);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, node.material.texture || whiteTexture);
        gl.uniform1i(uniforms.useTexture, node.material.texture ? 1 : 0);
        gl.bindVertexArray(node.mesh.vao);
        gl.drawElements(gl.TRIANGLES, node.mesh.indexCount, gl.UNSIGNED_INT, 0);
    }
    for (const child of node.children) {
        drawNode(child, uniforms);
    }
}

// mesh
function createMesh(geometry) {
    const positions = geometry.positions || geometry.vertices;
    const texcoords = geometry.texcoords || geometry.textures;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW);
    const normalLoc = gl.getAttribLocation(program, "a_normal");
    gl.enableVertexAttribArray(normalLoc);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    const textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
    const textureLoc = gl.getAttribLocation(program, "a_tex_coord");
    gl.enableVertexAttribArray(textureLoc);
    gl.vertexAttribPointer(textureLoc, 2, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.indices), gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return { vao, indexCount: geometry.indices.length };
}

// train controls
function tangentForward(up, forward) {
    let tangent = forward.sub(up.scale(forward.dot(up)));
    if (tangent.length() < 0.0001) {
        const fallback = Math.abs(up.y) < 0.9 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
        tangent = fallback.sub(up.scale(up.dot(fallback)));
    }
    return tangent.normalize();
}

function updateTrain(dt, trainNode, steerDelta) {
    let up = trainPos.normalize();
    trainSteering += steerDelta * TRAIN_STEER_SENSITIVITY;
    trainSteering = Math.max(-1, Math.min(1, trainSteering));

    if (keys["KeyS"]) {
        trainSpeed = Math.max(0, trainSpeed - TRAIN_BRAKING * dt);
    } else if (keys["KeyW"]) {
        trainSpeed = Math.min(getCurrentMaxSpeed(), trainSpeed + TRAIN_ACCELERATION * dt);
    } else {
        trainSpeed = Math.max(0, trainSpeed - TRAIN_DRAG * dt);
    }

    const speedFactor = Math.min(1, trainSpeed / TRAIN_TURN_FULL_SPEED);
    if (trainSpeed > 0.0001 && trainSteering !== 0) {
        const turn = -trainSteering * TRAIN_TURN_SPEED * speedFactor * dt;
        trainForward = trainForward.rotateAroundAxis(up, turn).normalize();
    }
    trainForward = tangentForward(up, trainForward);

    if (trainSpeed > 0.0001) {
        const step = (trainSpeed * dt) / (EARTH_RADIUS + TRAIN_CLEARANCE);
        trainPos = trainPos.add(trainForward.scale(step)).normalize();
        up = trainPos.normalize();
        trainForward = tangentForward(up, trainForward);
    }

    const right = up.cross(trainForward);
    const radius = EARTH_RADIUS + TRAIN_CLEARANCE;
    trainNode.local = Mat4.translation(trainPos.x * radius, trainPos.y * radius, trainPos.z * radius)
        .mul(Mat4.fromBasis(right, up, trainForward))
        .mul(Mat4.scaling(TRAIN_SCALE, TRAIN_SCALE, TRAIN_SCALE));
}

function placeSurfaceNode(node, direction, local) {
    const up = direction.normalize();
    const seed = Math.abs(up.y) < 0.9 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
    const forward = tangentForward(up, seed);
    const right = up.cross(forward);
    const radius = EARTH_RADIUS + TRAIN_CLEARANCE;
    node.local = Mat4.translation(direction.x * radius, direction.y * radius, direction.z * radius)
        .mul(Mat4.fromBasis(right, up, forward))
        .mul(local);
}

function getSurfaceFrame(earthSpin, direction, forward) {
    const radius = EARTH_RADIUS + TRAIN_CLEARANCE;
    const up = earthSpin.world.applyTo(new Vec4(direction.x, direction.y, direction.z, 0));
    const tangent = earthSpin.world.applyTo(new Vec4(forward.x, forward.y, forward.z, 0));
    const origin = earthSpin.world.applyTo(new Vec4(
        direction.x * radius,
        direction.y * radius,
        direction.z * radius,
        1
    ));
    return {
        origin: new Vec3(origin.x, origin.y, origin.z),
        up: new Vec3(up.x, up.y, up.z).normalize(),
        forward: new Vec3(tangent.x, tangent.y, tangent.z).normalize(),
    };
}

function getTrainFrame(earthSpin) {
    return getSurfaceFrame(earthSpin, trainPos, trainForward);
}

function getNodeWorldPosition(node) {
    const position = node.world.applyTo(new Vec4(0, 0, 0, 1));
    return new Vec3(position.x, position.y, position.z);
}

function main(assets) {
    initWhiteTexture();
    const sphereMesh = createMesh(assets.sphere);
    const carBodyMesh = createMesh(assets.carBody);
    const carWheelsMesh = createMesh(assets.carWheels);
    const coinMesh = createMesh(assets.coin);
    const coneMesh = createMesh(assets.cone);

    // materials
    const materials = {
        sun: { baseColor: [1.0, 0.82, 0.4], ka: 1.0, kd: 0.0, ks: 0.0, shininess: 1.0, emissive: 3.2, texture: assets.planetNoiseTexture },
        earth: { baseColor: [1.0, 1.0, 1.0], ka: 0.04, kd: 0.8, ks: 0.2, shininess: 32.0, emissive: 0.35, texture: assets.earthHexTexture },
        moon: { baseColor: [0.72, 0.72, 0.72], ka: 0.18, kd: 0.8, ks: 0.15, shininess: 8.0, emissive: 0.0, texture: assets.planetNoiseTexture },
        carBody: { baseColor: [1.35, 1.3, 1.2], ka: 0.28, kd: 0.85, ks: 0.7, shininess: 48.0, emissive: 1.1, texture: assets.carSpotTexture, earthLight: 1 },
        carWheel: { baseColor: [0.035, 0.035, 0.04], ka: 0.18, kd: 0.7, ks: 0.35, shininess: 24.0, emissive: 0.0, texture: null },
        carriage: { baseColor: [0.35, 0.65, 1.0], ka: 0.25, kd: 0.8, ks: 0.6, shininess: 48.0, emissive: 0.0, texture: null, earthLight: 1 },
        coin: { baseColor: [1.0, 0.82, 0.12], ka: 0.25, kd: 0.7, ks: 0.8, shininess: 64.0, emissive: 1.6, texture: null },
        cone: { baseColor: [1.0, 1.0, 1.0], ka: 0.12, kd: 0.75, ks: 0.25, shininess: 16.0, emissive: 0.16, texture: assets.coneStripesTexture },
    };

    // scene graph
    const root = new SceneNode();
    const sunBody = root.add(new SceneNode());
    const sunNode = sunBody.add(new SceneNode(
        Mat4.scaling(SUN_RADIUS, SUN_RADIUS, SUN_RADIUS),
        sphereMesh,
        materials.sun
    ));

    const earthOrbit = root.add(new SceneNode());
    const earthPivot = earthOrbit.add(new SceneNode(Mat4.translation(EARTH_ORBIT, 0, 0)));
    const earthSpin = earthPivot.add(new SceneNode());
    earthSpin.add(new SceneNode(
        Mat4.scaling(EARTH_RADIUS, EARTH_RADIUS, EARTH_RADIUS),
        sphereMesh,
        materials.earth
    ));

    const moonOrbit = earthPivot.add(new SceneNode());
    const moonTilt = moonOrbit.add(new SceneNode(Mat4.rotationX(MOON_TILT)));
    const moonPivot = moonTilt.add(new SceneNode(Mat4.translation(MOON_ORBIT, 0, 0)));
    const moonSpin = moonPivot.add(new SceneNode());
    moonSpin.add(new SceneNode(
        Mat4.scaling(MOON_RADIUS, MOON_RADIUS, MOON_RADIUS),
        sphereMesh,
        materials.moon
    ));

    const trainNode = earthSpin.add(new SceneNode());
    trainNode.add(new SceneNode(Mat4.identity(), carBodyMesh, materials.carBody));
    trainNode.add(new SceneNode(Mat4.identity(), carWheelsMesh, materials.carWheel));

    const carriageNodes = [];
    for (let i = 0; i < COIN_COUNT; i++) {
        const carriageNode = earthSpin.add(new SceneNode());
        carriageNode.visible = false;
        carriageNode.add(new SceneNode(Mat4.identity(), carBodyMesh, materials.carriage));
        carriageNode.add(new SceneNode(Mat4.identity(), carWheelsMesh, materials.carWheel));
        carriageNodes.push(carriageNode);
    }

    const coinDirs = makeItemDirections(COIN_COUNT, 1, []);
    const coneDirs = makeSpreadDirections(CONE_COUNT, 2, coinDirs, CONE_SPACING_ANGLE, CONE_START_ANGLE);
    const coinItems = coinDirs.map((direction) => ({
        direction,
        initialDirection: direction,
        node: earthSpin.add(new SceneNode(Mat4.identity(), coinMesh, materials.coin)),
        active: true,
    }));
    const coneItems = coneDirs.map((direction) => {
        const node = earthSpin.add(new SceneNode(Mat4.identity(), coneMesh, materials.cone));
        const tipNode = earthSpin.add(new SceneNode());
        return { direction, node, tipNode, active: true };
    });

    function findCoinRespawnDirection(coin) {
        const startLimit = Math.cos(ITEM_START_ANGLE);
        const trainLimit = Math.cos(COIN_RESPAWN_CLEAR_ANGLE);
        const coinLimit = Math.cos(ITEM_SPACING_ANGLE);
        const coneLimit = Math.cos(CONE_SPACING_ANGLE);
        for (let attempt = 0; attempt < 80; attempt++) {
            const direction = randomUnitDirection();
            if (direction.dot(TRAIN_START_DIR) > startLimit) {
                continue;
            }
            if (direction.dot(trainPos) > trainLimit) {
                continue;
            }
            if (coinItems.some((other) => other !== coin && other.active
                && other.direction.dot(direction) > coinLimit)) {
                continue;
            }
            if (coneItems.some((cone) => cone.active && cone.direction.dot(direction) > coneLimit)) {
                continue;
            }
            return direction;
        }
        return randomUnitDirection();
    }

    const coneLightPositions = new Float32Array(CONE_LIGHT_COUNT * 3);
    const coneLightPowers = new Float32Array(CONE_LIGHT_COUNT);

    function updateConeLights(frame) {
        const nearest = [];
        for (const item of coneItems) {
            if (!item.active) {
                continue;
            }
            const position = getNodeWorldPosition(item.tipNode);
            nearest.push({ position, distance: position.sub(frame.origin).length() });
        }
        nearest.sort((a, b) => a.distance - b.distance);
        for (let i = 0; i < CONE_LIGHT_COUNT; i++) {
            const offset = i * 3;
            const candidate = nearest[i];
            coneLightPositions[offset] = candidate ? candidate.position.x : 0;
            coneLightPositions[offset + 1] = candidate ? candidate.position.y : 0;
            coneLightPositions[offset + 2] = candidate ? candidate.position.z : 0;
            coneLightPowers[i] = candidate ? CONE_LIGHT_POWER : 0;
        }
        gl.uniform3fv(uniforms.coneLightPos, coneLightPositions);
        gl.uniform1fv(uniforms.coneLightPower, coneLightPowers);
    }

    function setCarriageCount(count) {
        carriageCount = Math.max(1, Math.min(COIN_COUNT + 1, count));
        runMaxCarriages = Math.max(runMaxCarriages, carriageCount);
        for (let i = 0; i < carriageNodes.length; i++) {
            carriageNodes[i].visible = i + 1 < carriageCount;
        }
    }

    function updateCarriages() {
        for (let i = 0; i < carriageNodes.length; i++) {
            if (!carriageNodes[i].visible) {
                continue;
            }
            const sample = getTrailSample((i + 1) * TRAIN_CAR_SPACING);
            const right = sample.dir.cross(sample.forward);
            const radius = EARTH_RADIUS + TRAIN_CLEARANCE;
            carriageNodes[i].local = Mat4.translation(
                sample.dir.x * radius,
                sample.dir.y * radius,
                sample.dir.z * radius
            ).mul(Mat4.fromBasis(right, sample.dir, sample.forward))
                .mul(Mat4.scaling(TRAIN_CAR_SCALE, TRAIN_CAR_SCALE, TRAIN_CAR_SCALE));
        }
    }

    function updateItemTransforms(simTime) {
        for (const item of coinItems) {
            if (!item.active) {
                continue;
            }
            placeSurfaceNode(item.node, item.direction,
                Mat4.translation(0, COIN_RADIUS + COIN_HOVER, 0)
                    .mul(Mat4.rotationY(simTime * 2.0))
                    .mul(Mat4.rotationX(Math.PI / 2))
                    .mul(Mat4.scaling(COIN_RADIUS, COIN_THICKNESS, COIN_RADIUS)));
        }
        for (const item of coneItems) {
            if (!item.active) {
                continue;
            }
            placeSurfaceNode(item.node, item.direction,
                Mat4.translation(0, -CONE_GROUND_SINK, 0)
                    .mul(Mat4.scaling(CONE_RADIUS, CONE_HEIGHT, CONE_RADIUS)));
            placeSurfaceNode(item.tipNode, item.direction,
                Mat4.translation(0, CONE_TIP_LIFT, 0));
        }
    }

    function startRun() {
        gameState = "playing";
        runTime = 0;
        runDistance = 0;
        coinsCollected = 0;
        runMaxCarriages = 1;
        paused = false;
        trainPos = new Vec3(TRAIN_START_DIR.x, TRAIN_START_DIR.y, TRAIN_START_DIR.z);
        trainForward = tangentForward(trainPos, new Vec3(0, 0, 1));
        trainSpeed = 0;
        trainSteering = 0;
        manualZoom = 1.0;
        cameraAutoDistance = TRAIN_CAMERA_BASE_DISTANCE;
        deathFrame = null;
        overCameraTime = 0;
        initializeTrail();
        for (const item of coinItems) {
            item.direction = item.initialDirection;
            item.active = true;
            item.node.visible = true;
        }
        for (const item of coneItems) {
            item.active = true;
            item.node.visible = true;
            item.tipNode.visible = true;
        }
        setCarriageCount(1);
        keys = {};
        pressed = {};
        mouseDX = 0;
        mouseDY = 0;
        wheelDelta = 0;
        orbitYaw = 0;
        startScreen.classList.add("hidden");
        steeringOverlay.style.display = "block";
        updateRunHud();
        updateSteeringHud();
    }

    function endRun() {
        gameState = "over";
        deathFrame = getTrainFrame(earthSpin);
        overCameraTime = 0;
        trainSpeed = 0;
        lastStats.time = runTime;
        lastStats.distance = runDistance;
        lastStats.coins = coinsCollected;
        lastStats.carriages = carriageCount;
        lastStats.hasRun = true;
        bestStats.time = Math.max(bestStats.time, runTime);
        bestStats.distance = Math.max(bestStats.distance, runDistance);
        bestStats.coins = Math.max(bestStats.coins, coinsCollected);
        bestStats.carriages = Math.max(bestStats.carriages, runMaxCarriages);
        updateResultPanel(
            "CRASHED",
            "Your train hit a cone. Press SPACE to restart.",
            "RESTART (SPACE)"
        );
    }

    function handleCollisions() {
        if (gameState !== "playing") {
            return;
        }
        for (const item of coinItems) {
            if (!item.active) {
                continue;
            }
            if (trainPos.dot(item.direction) > Math.cos(COIN_PICKUP_ANGLE)) {
                item.direction = findCoinRespawnDirection(item);
                item.active = true;
                item.node.visible = true;
                coinsCollected++;
                setCarriageCount(carriageCount + 1);
            }
        }
        for (const item of coneItems) {
            if (!item.active) {
                continue;
            }
            if (trainPos.dot(item.direction) > Math.cos(CONE_HIT_ANGLE)) {
                item.active = false;
                item.node.visible = false;
                item.tipNode.visible = false;
                endRun();
                return;
            }
        }
    }

    function showMenu() {
        updateResultPanel(
            "TRAIN RUN",
            "Press SPACE to start. W accelerate, S brake, mouse steer, wheel zoom, P pause. Collect coins to add carriages; cones end the run.",
            "START (SPACE)"
        );
    }

    startButton.addEventListener("click", startRun);

    const uniforms = {
        model: gl.getUniformLocation(program, "u_model"),
        viewProj: gl.getUniformLocation(program, "u_view_proj"),
        sampler: gl.getUniformLocation(program, "u_sampler"),
        useTexture: gl.getUniformLocation(program, "u_use_texture"),
        baseColor: gl.getUniformLocation(program, "u_base_color"),
        ambientColor: gl.getUniformLocation(program, "u_ambient_color"),
        lightPos: gl.getUniformLocation(program, "u_light_pos"),
        lightColor: gl.getUniformLocation(program, "u_light_color"),
        earthLightCenter: gl.getUniformLocation(program, "u_earth_light_center"),
        earthLightColor: gl.getUniformLocation(program, "u_earth_light_color"),
        earthLightMask: gl.getUniformLocation(program, "u_earth_light_mask"),
        coneLightPos: gl.getUniformLocation(program, "u_cone_light_pos[0]"),
        coneLightColor: gl.getUniformLocation(program, "u_cone_light_color"),
        coneLightPower: gl.getUniformLocation(program, "u_cone_light_power[0]"),
        cameraPos: gl.getUniformLocation(program, "u_camera_pos"),
        ka: gl.getUniformLocation(program, "u_ka"),
        kd: gl.getUniformLocation(program, "u_kd"),
        ks: gl.getUniformLocation(program, "u_ks"),
        shininess: gl.getUniformLocation(program, "u_shininess"),
        emissive: gl.getUniformLocation(program, "u_emissive"),
    };

    const postUniforms = {
        brightScene: gl.getUniformLocation(brightProgram, "u_scene"),
        brightThreshold: gl.getUniformLocation(brightProgram, "u_threshold"),
        blurSource: gl.getUniformLocation(blurProgram, "u_source"),
        blurTexel: gl.getUniformLocation(blurProgram, "u_texel"),
        blurDirection: gl.getUniformLocation(blurProgram, "u_direction"),
        compositeScene: gl.getUniformLocation(compositeProgram, "u_scene"),
        compositeBloom: gl.getUniformLocation(compositeProgram, "u_bloom"),
        compositeStrength: gl.getUniformLocation(compositeProgram, "u_bloom_strength"),
    };

    const starUniforms = {
        forward: gl.getUniformLocation(starProgram, "u_ray_forward"),
        right: gl.getUniformLocation(starProgram, "u_ray_right"),
        up: gl.getUniformLocation(starProgram, "u_ray_up"),
        scale: gl.getUniformLocation(starProgram, "u_ray_scale"),
        time: gl.getUniformLocation(starProgram, "u_time"),
    };

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.01, 0.01, 0.02, 1.0);

    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, whiteTexture);
    gl.uniform1i(uniforms.sampler, 0);
    gl.uniform1i(uniforms.useTexture, 0);
    gl.uniform3fv(uniforms.ambientColor, [0.12, 0.12, 0.16]);
    gl.uniform3fv(uniforms.lightPos, [0, 0, 0]);
    gl.uniform3fv(uniforms.lightColor, [1.0, 0.98, 0.9]);
    gl.uniform3fv(uniforms.earthLightCenter, [0, 0, 0]);
    gl.uniform3fv(uniforms.earthLightColor, EARTH_LIGHT_COLOR);
    gl.uniform3fv(uniforms.coneLightColor, CONE_LIGHT_COLOR);

    gl.useProgram(brightProgram);
    gl.uniform1i(postUniforms.brightScene, 0);
    gl.useProgram(blurProgram);
    gl.uniform1i(postUniforms.blurSource, 0);
    gl.useProgram(compositeProgram);
    gl.uniform1i(postUniforms.compositeScene, 0);
    gl.uniform1i(postUniforms.compositeBloom, 1);
    gl.useProgram(program);

    const floatTargets = !!gl.getExtension("EXT_color_buffer_float");
    const floatLinear = !!gl.getExtension("OES_texture_float_linear");
    const colorFormat = floatTargets ? gl.RGBA16F : gl.RGBA8;
    const colorType = floatTargets ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    const colorFilter = floatTargets && !floatLinear ? gl.NEAREST : gl.LINEAR;
    const bloomThreshold = floatTargets ? BLOOM_THRESHOLD_HDR : BLOOM_THRESHOLD_LDR;
    const quadVao = gl.createVertexArray();
    let postTargets = null;

    function disposeTarget(target) {
        if (!target) {
            return;
        }
        gl.deleteFramebuffer(target.framebuffer);
        gl.deleteTexture(target.texture);
        if (target.depth) {
            gl.deleteRenderbuffer(target.depth);
        }
    }

    function createTarget(width, height, withDepth) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, colorFormat, width, height, 0, gl.RGBA, colorType, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, colorFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, colorFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        let depth = null;
        if (withDepth) {
            depth = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
        }
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error("Post-processing framebuffer is incomplete");
        }
        return { framebuffer, texture, depth, width, height };
    }

    function rebuildPostTargets(width, height) {
        if (postTargets) {
            disposeTarget(postTargets.scene);
            disposeTarget(postTargets.bright);
            disposeTarget(postTargets.blurA);
            disposeTarget(postTargets.blurB);
        }
        const bloomWidth = Math.max(1, Math.floor(width * BLOOM_SCALE));
        const bloomHeight = Math.max(1, Math.floor(height * BLOOM_SCALE));
        postTargets = {
            scene: createTarget(width, height, true),
            bright: createTarget(bloomWidth, bloomHeight, false),
            blurA: createTarget(bloomWidth, bloomHeight, false),
            blurB: createTarget(bloomWidth, bloomHeight, false),
        };
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function drawFullscreen() {
        gl.bindVertexArray(quadVao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
    }

    function renderStars(forward, right, up, scaleX, scaleY) {
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.useProgram(starProgram);
        gl.uniform3fv(starUniforms.forward, [forward.x, forward.y, forward.z]);
        gl.uniform3fv(starUniforms.right, [right.x, right.y, right.z]);
        gl.uniform3fv(starUniforms.up, [up.x, up.y, up.z]);
        gl.uniform2f(starUniforms.scale, scaleX, scaleY);
        gl.uniform1f(starUniforms.time, simTime);
        drawFullscreen();
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
    }

    function renderBloom() {
        gl.disable(gl.DEPTH_TEST);

        gl.bindFramebuffer(gl.FRAMEBUFFER, postTargets.bright.framebuffer);
        gl.viewport(0, 0, postTargets.bright.width, postTargets.bright.height);
        gl.useProgram(brightProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, postTargets.scene.texture);
        gl.uniform1f(postUniforms.brightThreshold, bloomThreshold);
        drawFullscreen();

        gl.useProgram(blurProgram);
        let source = postTargets.bright.texture;
        for (let i = 0; i < BLOOM_BLUR_PASSES; i++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, postTargets.blurA.framebuffer);
            gl.viewport(0, 0, postTargets.blurA.width, postTargets.blurA.height);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, source);
            gl.uniform2f(postUniforms.blurTexel, 1 / postTargets.blurA.width, 1 / postTargets.blurA.height);
            gl.uniform2f(postUniforms.blurDirection, 1, 0);
            drawFullscreen();
            source = postTargets.blurA.texture;

            gl.bindFramebuffer(gl.FRAMEBUFFER, postTargets.blurB.framebuffer);
            gl.viewport(0, 0, postTargets.blurB.width, postTargets.blurB.height);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, source);
            gl.uniform2f(postUniforms.blurTexel, 1 / postTargets.blurB.width, 1 / postTargets.blurB.height);
            gl.uniform2f(postUniforms.blurDirection, 0, 1);
            drawFullscreen();
            source = postTargets.blurB.texture;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(compositeProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, postTargets.scene.texture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, source);
        gl.uniform1f(postUniforms.compositeStrength, BLOOM_STRENGTH);
        drawFullscreen();
        gl.activeTexture(gl.TEXTURE0);
        gl.enable(gl.DEPTH_TEST);
    }

    let simTime = 0;
    let lastTime = 0;
    let scaleCooldown = 0;
    const sensitive = 2 / 1000;

    // loop
    function tick(t) {
        const dt = lastTime === 0 ? 0 : Math.min((t - lastTime) / 1000, 0.05);
        lastTime = t;

        if (resizeRequested) {
            resizeCanvas(rebuildPostTargets);
            resizeRequested = false;
        }
        if (pressed["Space"] && (gameState === "menu" || gameState === "over")) {
            startRun();
        }
        if (pressed["KeyP"] && gameState === "playing") {
            paused = !paused;
        }
        scaleCooldown -= dt;
        if (scaleCooldown <= 0) {
            if (keys["BracketLeft"]) {
                timeScale = Math.max(0.1, timeScale - 0.1);
                scaleCooldown = 0.08;
            } else if (keys["BracketRight"]) {
                timeScale = Math.min(5, timeScale + 0.1);
                scaleCooldown = 0.08;
            }
        }
        if (gameState === "playing" && wheelDelta !== 0) {
            manualZoom = Math.max(
                MANUAL_ZOOM_MIN,
                Math.min(
                    MANUAL_ZOOM_MAX,
                    manualZoom * Math.exp(wheelDelta * TRAIN_CAMERA_ZOOM_SPEED),
                ),
            );
        }
        wheelDelta = 0;
        pressed = {};

        simTime += dt * timeScale;

        sunNode.local = Mat4.rotationY(simTime * SUN_SPIN_SPEED)
            .mul(Mat4.scaling(SUN_RADIUS, SUN_RADIUS, SUN_RADIUS));
        earthOrbit.local = Mat4.rotationY(simTime * EARTH_ORBIT_SPEED);
        earthSpin.local = Mat4.rotationY(simTime * EARTH_SPIN_SPEED);
        moonOrbit.local = Mat4.rotationY(simTime * MOON_ORBIT_SPEED);
        moonSpin.local = Mat4.rotationY(simTime * MOON_SPIN_SPEED);

        if (gameState === "playing" && !paused) {
            runTime += dt;
            updateTrain(dt, trainNode, mouseDX);
            runDistance += trainSpeed * dt;
            recordTrail();
            handleCollisions();
            if (gameState === "playing") {
                updateRunHud();
                updateSteeringHud();
            }
        }
        mouseDX = 0;
        mouseDY = 0;

        updateCarriages();
        updateItemTransforms(simTime);
        updateWorld(root, Mat4.identity());

        const projectionMatrix = Mat4.perspective(
            Math.PI / 4,
            viewAspect,
            0.1,
            5000.0,
        );

        const trainFrame = getTrainFrame(earthSpin);
        updateConeLights(trainFrame);

        let viewMatrix;
        let cameraPosition;
        let cameraTarget;
        let cameraEye;
        let cameraUpHint = new Vec3(0, 1, 0);
        if (gameState === "playing") {
            orbitYaw = 0;
            const targetAutoDistance = Math.min(
                TRAIN_CAMERA_MAX_DISTANCE,
                TRAIN_CAMERA_BASE_DISTANCE + (carriageCount - 1) * TRAIN_CAMERA_PER_CAR_DISTANCE
            );
            const smoothing = 1.0 - Math.exp(-TRAIN_CAMERA_DISTANCE_SMOOTHING * dt);
            cameraAutoDistance += (targetAutoDistance - cameraAutoDistance) * smoothing;
            const distance = Math.max(
                TRAIN_CAMERA_MIN_DISTANCE,
                Math.min(TRAIN_CAMERA_MAX_DISTANCE, cameraAutoDistance * manualZoom)
            );
            const frame = trainFrame;
            const right = frame.up.cross(frame.forward);
            const flat = Math.cos(orbitPitch) * distance;
            cameraTarget = frame.origin.add(frame.up.scale(0.15));
            cameraEye = cameraTarget
                .add(frame.forward.scale(-Math.cos(orbitYaw) * flat))
                .add(right.scale(Math.sin(orbitYaw) * flat))
                .add(frame.up.scale(Math.sin(orbitPitch) * distance));
            cameraUpHint = frame.up;
            viewMatrix = Mat4.lookAt(cameraEye, cameraTarget, cameraUpHint);
            cameraPosition = cameraEye;
        } else {
            if (gameState === "over") {
                overCameraTime += dt;
                if (deathFrame) {
                    const currentDeathFrame = getTrainFrame(earthSpin);
                    deathFrame.origin = currentDeathFrame.origin;
                    deathFrame.up = currentDeathFrame.up;
                    deathFrame.forward = currentDeathFrame.forward;
                }
            }
            const earthCenter = getNodeWorldPosition(earthPivot);
            const orbitTarget = earthCenter.scale(MENU_CAMERA_TARGET_BIAS);

            if (!deathFrame) {
                const pitch = Math.sin(simTime * MENU_CAMERA_PITCH_SPEED) * MENU_CAMERA_PITCH_RANGE + 0.25;
                const yaw = simTime * MENU_CAMERA_ORBIT_SPEED + 0.6;
                const horizontal = Math.cos(pitch) * MENU_CAMERA_DISTANCE;
                cameraTarget = orbitTarget;
                cameraEye = cameraTarget.add(new Vec3(
                    Math.cos(yaw) * horizontal,
                    Math.sin(pitch) * MENU_CAMERA_DISTANCE,
                    Math.sin(yaw) * horizontal
                ));
            } else {
                const retreatT = Math.min(1, overCameraTime / OVER_CAMERA_RETREAT_TIME);
                const retreatEased = retreatT * retreatT * (3 - 2 * retreatT);
                const retreatDistance = OVER_CAMERA_CLOSE_DISTANCE
                    + (OVER_CAMERA_RETREAT_DISTANCE - OVER_CAMERA_CLOSE_DISTANCE) * retreatEased;
                const radialEye = deathFrame.origin.add(deathFrame.up.scale(retreatDistance));
                const radialDir = deathFrame.up.normalize();
                const radialRadius = radialEye.sub(earthCenter).length();

                const zoomT = Math.max(0, Math.min(1,
                    (overCameraTime - OVER_CAMERA_RETREAT_TIME) / OVER_CAMERA_ZOOM_TIME
                ));
                const zoomEased = zoomT * zoomT * (3 - 2 * zoomT);
                const crashOffset = deathFrame.origin.sub(earthCenter);
                const crashYaw = Math.atan2(crashOffset.z, crashOffset.x);
                const crashPitch = Math.asin(Math.max(-1, Math.min(1, crashOffset.y / EARTH_RADIUS)));
                const sweepPitch = Math.sin(simTime * MENU_CAMERA_PITCH_SPEED) * MENU_CAMERA_PITCH_RANGE + 0.25;
                const yaw = crashYaw + simTime * MENU_CAMERA_ORBIT_SPEED;
                const pitch = crashPitch * (1 - zoomEased) + sweepPitch * zoomEased;
                const orbitDir = new Vec3(
                    Math.cos(pitch) * Math.cos(yaw),
                    Math.sin(pitch),
                    Math.cos(pitch) * Math.sin(yaw)
                );
                let blendDir = radialDir.add(orbitDir.sub(radialDir).scale(zoomEased));
                if (blendDir.length() < 0.001) {
                    blendDir = orbitDir;
                }
                const radius = Math.max(
                    EARTH_RADIUS + OVER_CAMERA_MIN_CLEARANCE,
                    radialRadius + (MENU_CAMERA_DISTANCE - radialRadius) * zoomEased
                );
                cameraTarget = deathFrame.origin.add(earthCenter.sub(deathFrame.origin).scale(zoomEased));
                cameraEye = earthCenter.add(blendDir.normalize().scale(radius));
                cameraUpHint = deathFrame.forward
                    .add(new Vec3(0, 1, 0).sub(deathFrame.forward).scale(zoomEased))
                    .normalize();
            }
            viewMatrix = Mat4.lookAt(cameraEye, cameraTarget, cameraUpHint);
            cameraPosition = cameraEye;
        }

        const viewProj = projectionMatrix.mul(viewMatrix);
        const rayForward = cameraTarget.sub(cameraEye).normalize();
        const rayRight = rayForward.cross(cameraUpHint).normalize();
        const rayUp = rayRight.cross(rayForward).normalize();
        const tanHalfFov = Math.tan(Math.PI / 8);

        gl.useProgram(program);
        gl.uniformMatrix4fv(uniforms.viewProj, false, new Float32Array(viewProj.plainArr));
        gl.uniform3fv(uniforms.cameraPos, [cameraPosition.x, cameraPosition.y, cameraPosition.z]);

        const lightCenter = getNodeWorldPosition(earthPivot);
        gl.uniform3fv(uniforms.earthLightCenter, [lightCenter.x, lightCenter.y, lightCenter.z]);

        gl.bindFramebuffer(gl.FRAMEBUFFER, postTargets.scene.framebuffer);
        gl.viewport(0, 0, postTargets.scene.width, postTargets.scene.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        renderStars(rayForward, rayRight, rayUp, tanHalfFov * viewAspect, tanHalfFov);
        gl.useProgram(program);
        drawNode(root, uniforms);
        renderBloom();

        requestAnimationFrame(tick);
    }
    rebuildPostTargets(canvas.width, canvas.height);
    resizeCanvas(rebuildPostTargets);
    resizeRequested = false;
    updateTrain(0, trainNode, 0);
    updateCarriages();
    updateItemTransforms(simTime);
    updateWorld(root, Mat4.identity());
    updateSteeringHud();
    showMenu();
    requestAnimationFrame(tick);

    console.debug("Done");
}
