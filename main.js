// setup
let keys = [];
window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
});

// load obj
loadObject("./monkey.obj").then(({ vertices: verticesArr, indices: indicesArr }) => {
    vertices = new Float32Array(verticesArr);
    indices = new Uint16Array(indicesArr);
    main();
});

function main() {
    // webgl
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.3, 0.3, 0.3, 1.0);

    const uMVPLoc = gl.getUniformLocation(program, "u_mvp");


    // setup model
    let modelPosition = new Vec3(0, 0, -20);

    // setup camera
    let camera = new Vec3(0, 0, 0);
    let cameraYaw = 0;
    let cameraPitch = 0;

    // loop
    function tick() {
        const moveSpeed = 0.1;
        let forwardX = -Math.sin(cameraYaw) * moveSpeed;
        let forwardZ = -Math.cos(cameraYaw) * moveSpeed;
        let rightX = Math.cos(cameraYaw) * moveSpeed;
        let rightZ = -Math.sin(cameraYaw) * moveSpeed;
    
        if (keys["KeyW"]) { camera = camera.add(new Vec3(forwardX, 0, forwardZ)); }
        if (keys["KeyS"]) { camera = camera.add(new Vec3(-forwardX, 0, -forwardZ)); }
        if (keys["KeyA"]) { camera = camera.add(new Vec3(-rightX, 0, -rightZ)); }
        if (keys["KeyD"]) { camera = camera.add(new Vec3(rightX, 0, rightZ)); }
        if (keys["Space"]) { camera = camera.add(new Vec3(0, 0.1, 0)); }
        if (keys["ShiftLeft"]) { camera = camera.add(new Vec3(0, -0.1, 0)); }
        
        if (keys["ArrowLeft"]) cameraYaw += 0.01;
        if (keys["ArrowRight"]) cameraYaw -= 0.01;
        if (keys["ArrowUp"]) cameraPitch += 0.01;
        if (keys["ArrowDown"]) cameraPitch -= 0.01;
        cameraPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, cameraPitch));

        let projectionMatrix = Mat4.perspective(
            Math.PI / 4,
            canvas.width / canvas.height,
            0.1,
            100.0,
        );
        
        let cameraTranslation = Mat4.translation(-camera.x, -camera.y, -camera.z);
        let cameraRotationY = Mat4.rotationY(-cameraYaw);
        let cameraRotationX = Mat4.rotationX(-cameraPitch);
        let viewMatrix = cameraRotationX.mul(cameraRotationY).mul(cameraTranslation)
        
        let modelMatrix = Mat4.translation(
            modelPosition.x,
            modelPosition.y,
            modelPosition.z,
        );

        let mvp = projectionMatrix.mul(viewMatrix).mul(modelMatrix);

        gl.useProgram(program);
        gl.uniformMatrix4fv(uMVPLoc, false, new Float32Array(mvp.plainArr));

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    console.debug("Done");
}