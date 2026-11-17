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
#define CONE_LIGHT_COUNT 4
#define CONE_LIGHT_RADIUS 8.0
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
uniform vec3 u_earth_light_center;
uniform vec3 u_earth_light_color;
uniform float u_earth_light_mask;
uniform vec3 u_cone_light_pos[CONE_LIGHT_COUNT];
uniform vec3 u_cone_light_color;
uniform float u_cone_light_power[CONE_LIGHT_COUNT];
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

    vec3 earthOutward = normalize(v_world_pos - u_earth_light_center);
    float earthFacing = max(dot(N, earthOutward), 0.0);

    vec3 ambient = u_ka * u_ambient_color * base;
    float ndotl = max(dot(N, L), 0.0);
    vec3 diffuse = u_kd * ndotl * u_light_color * base;
    float spec = pow(max(dot(N, H), 0.0), u_shininess);
    vec3 specular = u_ks * spec * step(0.0001, ndotl) * u_light_color;

    vec3 earthLight = u_earth_light_mask * earthFacing * u_earth_light_color * base;

    vec3 coneLight = vec3(0.0);
    for (int i = 0; i < CONE_LIGHT_COUNT; i++) {
        vec3 toCone = u_cone_light_pos[i] - v_world_pos;
        float coneDist = length(toCone);
        float falloff = max(0.0, 1.0 - coneDist / CONE_LIGHT_RADIUS);
        falloff *= falloff;
        vec3 coneL = toCone / max(coneDist, 0.0001);
        vec3 coneH = normalize(coneL + V);
        float coneNdotL = max(dot(N, coneL), 0.0);
        float coneSpec = pow(max(dot(N, coneH), 0.0), u_shininess);
        coneLight += u_cone_light_power[i] * falloff * (
            u_kd * coneNdotL * u_cone_light_color * base
            + u_ks * coneSpec * step(0.0001, coneNdotL) * u_cone_light_color
        );
    }

    out_color = vec4(ambient + diffuse + specular + earthLight + coneLight
        + u_emissive * base, 1.0);
}`;

const quadVs = `#version 300 es
out vec2 v_uv;
void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    v_uv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const starFs = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec3 u_ray_forward;
uniform vec3 u_ray_right;
uniform vec3 u_ray_up;
uniform vec2 u_ray_scale;
uniform float u_time;
out vec4 out_color;

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float starLayer(vec2 uv, vec2 grid, float threshold, float radius, float intensity) {
    vec2 scaled = uv * grid;
    vec2 cell = floor(scaled);
    vec2 local = fract(scaled) - 0.5;
    float h = hash21(cell);
    float present = step(threshold, h);
    vec2 jitter = vec2(hash21(cell + 17.1), hash21(cell + 43.7)) - 0.5;
    float dist = length(local - jitter * 0.55);
    float shape = 1.0 - smoothstep(0.0, radius, dist);
    float twinkle = 0.8 + 0.2 * sin(u_time * (1.0 + h * 2.0) + h * 60.0);
    return shape * present * intensity * twinkle;
}

void main() {
    vec2 ndc = v_uv * 2.0 - 1.0;
    vec3 dir = normalize(u_ray_forward
        + u_ray_right * ndc.x * u_ray_scale.x
        + u_ray_up * ndc.y * u_ray_scale.y);
    vec2 sky = vec2(
        atan(dir.z, dir.x) * 0.1591549431 + 0.5,
        asin(clamp(dir.y, -1.0, 1.0)) * 0.3183098862 + 0.5
    );
    float stars = starLayer(sky, vec2(420.0, 210.0), 0.982, 0.075, 0.75);
    stars += starLayer(sky, vec2(190.0, 95.0), 0.994, 0.11, 1.25);
    stars += starLayer(sky, vec2(70.0, 35.0), 0.997, 0.15, 2.1);
    vec3 color = vec3(0.002, 0.004, 0.012);
    color += mix(vec3(0.6, 0.75, 1.0), vec3(1.0, 0.9, 0.75), hash21(floor(sky * 70.0))) * stars;
    out_color = vec4(color, 1.0);
}`;

const brightFs = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_scene;
uniform float u_threshold;
out vec4 out_color;
void main() {
    vec3 color = texture(u_scene, v_uv).rgb;
    float brightness = max(max(color.r, color.g), color.b);
    float contribution = max(brightness - u_threshold, 0.0) / max(brightness, 0.0001);
    out_color = vec4(color * contribution, 1.0);
}`;

const blurFs = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_source;
uniform vec2 u_texel;
uniform vec2 u_direction;
out vec4 out_color;
void main() {
    vec2 offset = u_texel * u_direction;
    vec3 color = texture(u_source, v_uv).rgb * 0.227027;
    color += texture(u_source, v_uv + offset * 1.384615).rgb * 0.316216;
    color += texture(u_source, v_uv - offset * 1.384615).rgb * 0.316216;
    color += texture(u_source, v_uv + offset * 3.230769).rgb * 0.070270;
    color += texture(u_source, v_uv - offset * 3.230769).rgb * 0.070270;
    out_color = vec4(color, 1.0);
}`;

const compositeFs = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform float u_bloom_strength;
out vec4 out_color;
void main() {
    vec3 scene = texture(u_scene, v_uv).rgb;
    vec3 bloom = texture(u_bloom, v_uv).rgb;
    vec3 color = scene + bloom * u_bloom_strength;
    color = color / (1.0 + color * 0.25);
    out_color = vec4(color, 1.0);
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
function createProgram(vertexSource, fragmentSource) {
    const result = gl.createProgram();
    gl.attachShader(result, createShader(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(result, createShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(result);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
        throw new Error(`Program failed to link: ${gl.getProgramInfoLog(result)}`);
    }
    return result;
}
const program = createProgram(vs, fs);
const starProgram = createProgram(quadVs, starFs);
const brightProgram = createProgram(quadVs, brightFs);
const blurProgram = createProgram(quadVs, blurFs);
const compositeProgram = createProgram(quadVs, compositeFs);
gl.useProgram(program);

let whiteTexture = null;

function initTextures(path, crisp) {
    return new Promise((resolve) => {
        console.log("loading texture:", path);
        const texture = gl.createTexture();
        const image = new Image();
        image.onload = function () {
            console.log("texture loaded", image.width, image.height);
            handleTextureLoaded(image, texture, crisp);
            resolve(texture);
        };
        image.onerror = function () {
            console.error("texture failed", path);
            resolve(null);
        };

        image.src = path;
    });
}
function handleTextureLoaded(image, texture, crisp) {
    const filter = crisp ? gl.NEAREST : gl.LINEAR;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, crisp ? filter : gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    if (!crisp) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }
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
