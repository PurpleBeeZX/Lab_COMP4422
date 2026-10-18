const vs = `#version 300 es
in vec3 pos;
uniform mat4 u_mvp;
void main() { gl_Position = u_mvp * vec4(pos, 1.0); }`;

const fs = `#version 300 es
precision highp float;
out vec4 col;
void main() { col = vec4(1.0, 0.0, 0.0, 1.0); }`;

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
