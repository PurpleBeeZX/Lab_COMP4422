// vertex shader
const vs = `#version 300 es
in vec3 pos;
in vec3 a_normal;
in vec2 a_tex_coord;
uniform mat4 u_model;
uniform mat4 u_view_proj;
out vec3 v_world_pos;
out vec3 v_normal;
out vec2 v_tex_coord;
void main() {
    vec4 world = u_model * vec4(pos, 1.0);
    v_world_pos = world.xyz;
    v_normal = mat3(u_model) * a_normal;
    v_tex_coord = a_tex_coord;
    gl_Position = u_view_proj * world;
}`;

// fragment shader: blinn-phong
const fs = `#version 300 es
precision highp float;
in vec3 v_world_pos;
in vec3 v_normal;
in vec2 v_tex_coord;
uniform sampler2D u_sampler;
uniform bool u_use_texture;
uniform vec3 u_base_color;
uniform vec3 u_ambient_color;
uniform vec3 u_light_pos;
uniform vec3 u_light_color;
uniform vec3 u_camera_pos;
uniform float u_ka;
uniform float u_kd;
uniform float u_ks;
uniform float u_shininess;
uniform float u_emissive;
out vec4 out_color;
void main() {
    vec3 base = u_use_texture
        ? texture(u_sampler, v_tex_coord).rgb * u_base_color
        : u_base_color;

    vec3 N = normalize(v_normal);
    vec3 L = normalize(u_light_pos - v_world_pos);
    vec3 V = normalize(u_camera_pos - v_world_pos);
    vec3 H = normalize(L + V);

    vec3 ambient = u_ka * u_ambient_color * base;
    float ndotl = max(dot(N, L), 0.0);
    vec3 diffuse = u_kd * ndotl * u_light_color * base;
    float spec = pow(max(dot(N, H), 0.0), u_shininess);
    vec3 specular = u_ks * spec * step(0.0001, ndotl) * u_light_color;

    out_color = vec4(ambient + diffuse + specular + u_emissive * base, 1.0);
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
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program failed to link: ${gl.getProgramInfoLog(program)}`);
}
gl.useProgram(program);

let whiteTexture = null;

function initTextures(path) {
    return new Promise((resolve) => {
        console.log("loading texture:", path);
        const texture = gl.createTexture();
        const image = new Image();
        image.onload = function () {
            console.log("texture loaded", image.width, image.height);
            handleTextureLoaded(image, texture);
            resolve(texture);
        };
        image.onerror = function () {
            console.error("texture failed", path);
            resolve(null);
        };

        image.src = path;
    });
}
function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);
}

function initWhiteTexture() {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    whiteTexture = texture;
    return texture;
}
