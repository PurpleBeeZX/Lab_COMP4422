// setup
let keys = [];
let mouseDX = 0;
let mouseDY = 0;
window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
});
window.addEventListener('click', () => {
      canvas.requestPointerLock();
    });
window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
        mouseDX += e.movementX;
        mouseDY += e.movementY;
    }
});

// load obj
loadObject("./FuturisticGirl.obj").then((obj) => {
    console.log(obj);
    if (obj.material && obj.material.mapKd) {
        texture = initTextures(obj.material.mapKd);
    } else {
        console.error("MTL texture not found");
        return;
    }
    vertices = new Float32Array(obj.vertices);
    textures = new Float32Array(obj.textures);
    indices = new Uint32Array(obj.indices);


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
    
    const textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, textures, gl.STATIC_DRAW);

    const textureCoordAttribute = gl.getAttribLocation(program, "a_tex_coord");
    gl.enableVertexAttribArray(textureCoordAttribute);
    gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.3, 0.3, 0.3, 1.0);


    const uMVPLoc = gl.getUniformLocation(program, "u_mvp");
    

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation( program, "u_sampler"), 0);


    // setup model
    let modelPosition = new Vec3(0, 0, -20);

    // setup camera
    let camera = new Vec3(0, 0, 0);
    let cameraYaw = 0;
    let cameraPitch = 0;

    // loop
    function tick() {
        const moveSpeed = 0.05;
        const sensitive = 3/100;
        let forwardX = -Math.sin(cameraYaw) * moveSpeed;
        let forwardZ = -Math.cos(cameraYaw) * moveSpeed;
        let rightX = Math.cos(cameraYaw) * moveSpeed;
        let rightZ = -Math.sin(cameraYaw) * moveSpeed;
    
        if (keys["KeyW"]) { camera = camera.add(new Vec3(forwardX, 0, forwardZ)); }
        if (keys["KeyS"]) { camera = camera.add(new Vec3(-forwardX, 0, -forwardZ)); }
        if (keys["KeyA"]) { camera = camera.add(new Vec3(-rightX, 0, -rightZ)); }
        if (keys["KeyD"]) { camera = camera.add(new Vec3(rightX, 0, rightZ)); }
        if (keys["Space"]) { camera = camera.add(new Vec3(0, moveSpeed, 0)); }
        if (keys["ShiftLeft"]) { camera = camera.add(new Vec3(0, -moveSpeed, 0)); }

        cameraYaw   -= mouseDX * sensitive;
        cameraPitch -= mouseDY * sensitive;
        mouseDX = 0;
        mouseDY = 0;

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

        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);

        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    console.debug("Done");
}