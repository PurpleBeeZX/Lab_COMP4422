// setup
let keys = {};
let pressed = {};
let mouseDX = 0;
let mouseDY = 0;
let wheelDelta = 0;
let cameraMode = "car";
let paused = false;
let timeScale = 1;
let orbitYaw = 0;
let orbitPitch = 0.25;
let freeCamera = new Vec3(0, 300, 1200);
let freeYaw = 0;
let freePitch = -0.32;
let viewAspect = 1;
let carCameraDistance = 1.5;
let resizeRequested = true;

const hud = document.getElementById("hud");
const steeringOverlay = document.getElementById("steering");
const steeringWheel = document.getElementById("steering-wheel");
const steeringValue = document.getElementById("steering-value");

window.addEventListener("keydown", (e) => {
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
const SUN_RADIUS = 60;
const SUN_ROTATION_PERIOD = 600;
const SUN_SPIN_SPEED = (2 * Math.PI) / SUN_ROTATION_PERIOD;
const EARTH_ORBIT = 600;
const EARTH_YEAR_PERIOD = 300;
const EARTH_ORBIT_SPEED = (2 * Math.PI) / EARTH_YEAR_PERIOD;
const EARTH_DAY_PERIOD = 60;
const EARTH_SPIN_SPEED = (2 * Math.PI) / EARTH_DAY_PERIOD;
const EARTH_RADIUS = 9;
const MOON_ORBIT = 90;
const MOON_MONTH_PERIOD = 90;
const MOON_ORBIT_SPEED = (2 * Math.PI) / MOON_MONTH_PERIOD;
const MOON_SPIN_SPEED = MOON_ORBIT_SPEED;
const MOON_RADIUS = 2.5;
const MOON_TILT = 0.09;
const CAR_SCALE = 1.0;
const CAR_CLEARANCE = 0.015;
const CAR_MAX_SPEED = 1.8;
const CAR_ACCELERATION = 1.6;
const CAR_BRAKING = 4.0;
const CAR_DRAG = 0.6;
const CAR_STEER_SENSITIVITY = 0.004;
const CAR_TURN_SPEED = 1.8;
const CAR_TURN_FULL_SPEED = 1.2;
const CAR_CAMERA_MIN_DISTANCE = 0.8;
const CAR_CAMERA_MAX_DISTANCE = 6.0;
const CAR_CAMERA_ZOOM_SPEED = 0.001;

// car state
let carPos = new Vec3(-0.8, 0.5, 0.3).normalize();
let carForward = new Vec3(0, 0, 1);
carForward = carForward.sub(carPos.scale(carForward.dot(carPos))).normalize();
let carSpeed = 0;
let carSteering = 0;

// load assets
async function loadAssets() {
    hud.textContent = "Loading assets...";
    const [carBody, carWheels, sphere] = await Promise.all([
        loadObject("./assets/car_body.obj"),
        loadObject("./assets/car_wheels.obj"),
        loadObject("./assets/sphere.obj"),
    ]);
    const [carSpotTexture, planetNoiseTexture] = await Promise.all([
        initTextures("./assets/textures/car_spot.png"),
        initTextures("./assets/textures/planet_noise.png"),
    ]);
    return {
        carBody,
        carWheels,
        sphere,
        carSpotTexture,
        planetNoiseTexture,
    };
}

loadAssets()
    .then((assets) => main(assets))
    .catch((err) => {
        console.error("asset loading failed", err);
        hud.textContent = "Failed to load assets";
    });

function updateHud() {
    steeringOverlay.style.display = cameraMode === "car" ? "block" : "none";
    if (cameraMode === "car") {
        hud.textContent = "CAR | W accelerate, S brake, mouse steer, wheel zoom, C free camera, P pause, [ ] time speed";
    } else {
        hud.textContent = "FREE | WASD move, Space/Shift up/down, mouse look, C follow car, P pause, [ ] time speed";
    }
}

function updateSteeringHud() {
    const percent = Math.round(carSteering * 100);
    const direction = carSteering > 0.005 ? "R"
        : carSteering < -0.005 ? "L"
        : "C";

    steeringWheel.style.transform = `rotate(${carSteering * 120}deg)`;
    steeringValue.textContent = `${direction} ${Math.abs(percent)}%`;
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    viewAspect = rect.height > 0 ? rect.width / rect.height : 1;

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
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
    if (node.mesh) {
        gl.uniformMatrix4fv(uniforms.model, false, new Float32Array(node.world.plainArr));
        gl.uniform3fv(uniforms.baseColor, node.material.baseColor);
        gl.uniform1f(uniforms.ka, node.material.ka);
        gl.uniform1f(uniforms.kd, node.material.kd);
        gl.uniform1f(uniforms.ks, node.material.ks);
        gl.uniform1f(uniforms.shininess, node.material.shininess);
        gl.uniform1f(uniforms.emissive, node.material.emissive);
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

// car controls
function tangentForward(up, forward) {
    let tangent = forward.sub(up.scale(forward.dot(up)));
    if (tangent.length() < 0.0001) {
        const fallback = Math.abs(up.y) < 0.9 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
        tangent = fallback.sub(up.scale(up.dot(fallback)));
    }
    return tangent.normalize();
}

function updateCar(dt, carNode, steerDelta) {
    let up = carPos.normalize();
    carSteering += steerDelta * CAR_STEER_SENSITIVITY;
    carSteering = Math.max(-1, Math.min(1, carSteering));

    if (keys["KeyS"]) {
        carSpeed = Math.max(0, carSpeed - CAR_BRAKING * dt);
    } else if (keys["KeyW"]) {
        carSpeed = Math.min(CAR_MAX_SPEED, carSpeed + CAR_ACCELERATION * dt);
    } else {
        carSpeed = Math.max(0, carSpeed - CAR_DRAG * dt);
    }

    const speedFactor = Math.min(1, carSpeed / CAR_TURN_FULL_SPEED);
    if (carSpeed > 0.0001 && carSteering !== 0) {
        const turn = carSteering * CAR_TURN_SPEED * speedFactor * dt;
        carForward = carForward.rotateAroundAxis(up, turn).normalize();
    }
    carForward = tangentForward(up, carForward);

    if (carSpeed > 0.0001) {
        carPos = carPos.add(carForward.scale(carSpeed * dt)).normalize();
        up = carPos.normalize();
        carForward = tangentForward(up, carForward);
    }

    const right = up.cross(carForward);
    const radius = EARTH_RADIUS + CAR_CLEARANCE;
    carNode.local = Mat4.translation(carPos.x * radius, carPos.y * radius, carPos.z * radius)
        .mul(Mat4.fromBasis(right, up, carForward))
        .mul(Mat4.scaling(CAR_SCALE, CAR_SCALE, CAR_SCALE));
}

function getCarFrame(earthSpin) {
    const radius = EARTH_RADIUS + CAR_CLEARANCE;
    const up = earthSpin.world.applyTo(new Vec4(carPos.x, carPos.y, carPos.z, 0));
    const forward = earthSpin.world.applyTo(new Vec4(carForward.x, carForward.y, carForward.z, 0));
    const origin = earthSpin.world.applyTo(new Vec4(
        carPos.x * radius,
        carPos.y * radius,
        carPos.z * radius,
        1
    ));
    return {
        origin: new Vec3(origin.x, origin.y, origin.z),
        up: new Vec3(up.x, up.y, up.z).normalize(),
        forward: new Vec3(forward.x, forward.y, forward.z).normalize(),
    };
}

function getNodeWorldPosition(node) {
    const position = node.world.applyTo(new Vec4(0, 0, 0, 1));
    return new Vec3(position.x, position.y, position.z);
}

function updateFreeCamera(dt) {
    const forward = new Vec3(
        -Math.sin(freeYaw) * Math.cos(freePitch),
        Math.sin(freePitch),
        -Math.cos(freeYaw) * Math.cos(freePitch)
    );
    const right = new Vec3(Math.cos(freeYaw), 0, -Math.sin(freeYaw));
    const speed = 8 * dt;

    if (keys["KeyW"]) { freeCamera = freeCamera.add(forward.scale(speed)); }
    if (keys["KeyS"]) { freeCamera = freeCamera.sub(forward.scale(speed)); }
    if (keys["KeyA"]) { freeCamera = freeCamera.sub(right.scale(speed)); }
    if (keys["KeyD"]) { freeCamera = freeCamera.add(right.scale(speed)); }
    if (keys["Space"]) { freeCamera = freeCamera.add(new Vec3(0, speed, 0)); }
    if (keys["ShiftLeft"]) { freeCamera = freeCamera.sub(new Vec3(0, speed, 0)); }
}

function main(assets) {
    initWhiteTexture();
    const sphereMesh = createMesh(assets.sphere);
    const carBodyMesh = createMesh(assets.carBody);
    const carWheelsMesh = createMesh(assets.carWheels);

    // materials
    const materials = {
        sun: { baseColor: [1.0, 0.72, 0.25], ka: 1.0, kd: 0.0, ks: 0.0, shininess: 1.0, emissive: 1.0, texture: assets.planetNoiseTexture },
        earth: { baseColor: [0.16, 0.38, 0.85], ka: 0.18, kd: 0.85, ks: 0.6, shininess: 64.0, emissive: 0.0, texture: null },
        moon: { baseColor: [0.72, 0.72, 0.72], ka: 0.18, kd: 0.8, ks: 0.15, shininess: 8.0, emissive: 0.0, texture: assets.planetNoiseTexture },
        carBody: { baseColor: [1.0, 1.0, 1.0], ka: 0.22, kd: 0.8, ks: 0.7, shininess: 48.0, emissive: 0.0, texture: assets.carSpotTexture },
        carWheel: { baseColor: [0.035, 0.035, 0.04], ka: 0.18, kd: 0.7, ks: 0.35, shininess: 24.0, emissive: 0.0, texture: null },
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

    const carNode = earthSpin.add(new SceneNode());
    carNode.add(new SceneNode(Mat4.identity(), carBodyMesh, materials.carBody));
    carNode.add(new SceneNode(Mat4.identity(), carWheelsMesh, materials.carWheel));

    function focusFreeCameraOnEarthMoon() {
        const earthCenter = getNodeWorldPosition(earthSpin);
        const moonCenter = getNodeWorldPosition(moonPivot);
        const target = earthCenter.add(moonCenter).scale(0.5);
        let side = moonCenter.sub(earthCenter).normalize().cross(new Vec3(0, 1, 0));
        if (side.length() < 0.001) {
            side = new Vec3(1, 0, 0);
        }
        side = side.normalize();

        freeCamera = target.add(side.scale(170)).add(new Vec3(0, 55, 0));
        const direction = target.sub(freeCamera).normalize();
        freeYaw = Math.atan2(-direction.x, -direction.z);
        freePitch = Math.asin(Math.max(-1, Math.min(1, direction.y)));
    }

    const uniforms = {
        model: gl.getUniformLocation(program, "u_model"),
        viewProj: gl.getUniformLocation(program, "u_view_proj"),
        sampler: gl.getUniformLocation(program, "u_sampler"),
        useTexture: gl.getUniformLocation(program, "u_use_texture"),
        baseColor: gl.getUniformLocation(program, "u_base_color"),
        ambientColor: gl.getUniformLocation(program, "u_ambient_color"),
        lightPos: gl.getUniformLocation(program, "u_light_pos"),
        lightColor: gl.getUniformLocation(program, "u_light_color"),
        cameraPos: gl.getUniformLocation(program, "u_camera_pos"),
        ka: gl.getUniformLocation(program, "u_ka"),
        kd: gl.getUniformLocation(program, "u_kd"),
        ks: gl.getUniformLocation(program, "u_ks"),
        shininess: gl.getUniformLocation(program, "u_shininess"),
        emissive: gl.getUniformLocation(program, "u_emissive"),
    };

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.01, 0.01, 0.02, 1.0);

    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, whiteTexture);
    gl.uniform1i(uniforms.sampler, 0);
    gl.uniform1i(uniforms.useTexture, 0);
    gl.uniform3fv(uniforms.ambientColor, [0.2, 0.2, 0.25]);
    gl.uniform3fv(uniforms.lightPos, [0, 0, 0]);
    gl.uniform3fv(uniforms.lightColor, [1.0, 0.98, 0.9]);

    let simTime = 0;
    let lastTime = 0;
    let scaleCooldown = 0;
    let freeCameraFocusRequested = false;
    const sensitive = 2 / 1000;

    // loop
    function tick(t) {
        const dt = lastTime === 0 ? 0 : Math.min((t - lastTime) / 1000, 0.05);
        lastTime = t;

        if (resizeRequested) {
            resizeCanvas();
            resizeRequested = false;
        }
        if (pressed["KeyC"]) {
            cameraMode = cameraMode === "car" ? "free" : "car";
            if (cameraMode === "free") {
                freeCameraFocusRequested = true;
            }
            mouseDX = 0;
            mouseDY = 0;
            updateHud();
        }
        if (pressed["KeyP"]) {
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
        if (cameraMode === "car" && wheelDelta !== 0) {
            carCameraDistance = Math.max(
                CAR_CAMERA_MIN_DISTANCE,
                Math.min(
                    CAR_CAMERA_MAX_DISTANCE,
                    carCameraDistance * Math.exp(wheelDelta * CAR_CAMERA_ZOOM_SPEED),
                ),
            );
        }
        wheelDelta = 0;
        pressed = {};

        if (!paused) {
            simTime += dt * timeScale;
        }

        sunNode.local = Mat4.rotationY(simTime * SUN_SPIN_SPEED)
            .mul(Mat4.scaling(SUN_RADIUS, SUN_RADIUS, SUN_RADIUS));
        earthOrbit.local = Mat4.rotationY(simTime * EARTH_ORBIT_SPEED);
        earthSpin.local = Mat4.rotationY(simTime * EARTH_SPIN_SPEED);
        moonOrbit.local = Mat4.rotationY(simTime * MOON_ORBIT_SPEED);
        moonSpin.local = Mat4.rotationY(simTime * MOON_SPIN_SPEED);

        if (cameraMode === "car") {
            orbitYaw = 0;
            if (!paused) {
                updateCar(dt, carNode, mouseDX);
                updateSteeringHud();
            }
        } else {
            freeYaw -= mouseDX * sensitive;
            freePitch -= mouseDY * sensitive;
            freePitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, freePitch));
            updateFreeCamera(dt);
        }
        mouseDX = 0;
        mouseDY = 0;

        updateWorld(root, Mat4.identity());
        if (freeCameraFocusRequested) {
            freeCameraFocusRequested = false;
            focusFreeCameraOnEarthMoon();
        }

        const projectionMatrix = Mat4.perspective(
            Math.PI / 4,
            viewAspect,
            0.1,
            5000.0,
        );

        let viewMatrix;
        let cameraPosition;
        if (cameraMode === "car") {
            const frame = getCarFrame(earthSpin);
            const right = frame.up.cross(frame.forward);
            const distance = carCameraDistance;
            const flat = Math.cos(orbitPitch) * distance;
            const eye = frame.origin
                .add(frame.forward.scale(-Math.cos(orbitYaw) * flat))
                .add(right.scale(Math.sin(orbitYaw) * flat))
                .add(frame.up.scale(Math.sin(orbitPitch) * distance + 0.15));
            const target = frame.origin.add(frame.up.scale(0.15));
            viewMatrix = Mat4.lookAt(eye, target, frame.up);
            cameraPosition = eye;
        } else {
            const forward = new Vec3(
                -Math.sin(freeYaw) * Math.cos(freePitch),
                Math.sin(freePitch),
                -Math.cos(freeYaw) * Math.cos(freePitch)
            );
            viewMatrix = Mat4.lookAt(freeCamera, freeCamera.add(forward), new Vec3(0, 1, 0));
            cameraPosition = freeCamera;
        }

        const viewProj = projectionMatrix.mul(viewMatrix);

        gl.useProgram(program);
        gl.uniformMatrix4fv(uniforms.viewProj, false, new Float32Array(viewProj.plainArr));
        gl.uniform3fv(uniforms.cameraPos, [cameraPosition.x, cameraPosition.y, cameraPosition.z]);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        drawNode(root, uniforms);

        requestAnimationFrame(tick);
    }
    resizeCanvas();
    resizeRequested = false;
    updateHud();
    updateSteeringHud();
    requestAnimationFrame(tick);

    console.debug("Done");
}
