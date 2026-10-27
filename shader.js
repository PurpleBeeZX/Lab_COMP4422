const vs = `#version 300 es
in vec3 pos;
in vec2 a_tex_coord;
uniform mat4 u_mvp;
out vec2 v_tex_coord;
void main() {
    gl_Position = u_mvp * vec4(pos, 1.0);
    v_tex_coord = a_tex_coord;
}`;

const fs = `#version 300 es
precision highp float;
in vec2 v_tex_coord;
uniform sampler2D u_sampler;
out vec4 out_color;
void main() {
    out_color = texture(u_sampler, v_tex_coord);
}`;

function createShader(gl, type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
           const info = gl.getShaderInfoLog(s);
           gl.deleteShader(s);
           throw new Error(`Shader failed to compile: ${info}`);
       }
    return s;
}
const program = gl.createProgram();
gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vs));
gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fs));
gl.linkProgram(program);
gl.useProgram(program);

function initTextures(path) {
    console.log("loading texture:", path);
    const texture = gl.createTexture();
    const image = new Image();
    image.onload = function () {
        console.log( "texture loaded", image.width, image.height);
        handleTextureLoaded(image, texture);
    };
    image.onerror = function () {
        console.error( "texture failed", path);
    };

    image.src = path;
    return texture;
}
function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
}