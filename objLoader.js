async function loadObject(url, loadMaterial = true) {
    const objText = await (await fetch(url)).text();
    let materialFile = null;
    for (const line of objText.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("mtllib ")) {
            materialFile = trimmed.substring(7).trim();
            break;
        }
    }
    let material = null;
    if (loadMaterial && materialFile) {
        const basePath =
            url.substring(0, url.lastIndexOf("/") + 1);
        material = await loadMtl(
            basePath + materialFile
        );
    }
    const mesh = parseObject(objText);
    return {
        ...mesh,
        material
    }
}

async function loadMtl(url) {
    const res = await fetch(url);
    if (!res.ok) {
        console.error("mtl failed", url);
        return { mapKd: null };
    }
    const text = await res.text();

    let mapKd = null;

    for (const line of text.split("\n")) {
        const parts = line.trim().split(/\s+/);

        if (parts[0] === "map_Kd") {
            mapKd = parts.slice(1).join(" ");
        }
    }

    return { mapKd };
}

function parseObject(source) {
    const positions = [];
    const texcoords = [];
    const normals = [];
    const vertices = [];
    const textures = [];
    const outNormals = [];
    const indices = [];
    const vertexMap = new Map();
    const lines = source.split('\n');

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }
        const parts = line.split(/\s+/);
        switch (parts[0]) {
            case "v":
                positions.push([
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                ]);
                break;
            case "vt":
                texcoords.push([
                    parseFloat(parts[1]),
                    parseFloat(parts[2])
                ]);
                break;
            case "vn":
                normals.push([
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                ]);
                break;
            case "f":
                for (let i = 1; i <= 3; i++) {
                    const key = parts[i];
                    if (!vertexMap.has(key)) {
                        const [v, vt, vn] = key
                            .split('/')
                            .map(x => parseInt(x) - 1);
                        const pos = positions[v];
                        vertices.push( pos[0], pos[1], pos[2]);
                        if (vt >= 0) {
                            const uv = texcoords[vt];
                            textures.push( uv[0], uv[1]);
                        } else {
                            textures.push(0, 0);
                        }
                        if (vn >= 0) {
                            const n = normals[vn];
                            outNormals.push( n[0], n[1], n[2]);
                        } else {
                            outNormals.push(0, 0, 0);
                        }
                        vertexMap.set( key, vertexMap.size);
                    }
                    indices.push( vertexMap.get(key));
                }
                break;
        }
    }
    console.log("positions", positions.length);
    console.log("texcoords", texcoords.length);
    console.log("normals", normals.length);
    return {
        vertices,
        textures,
        normals: outNormals,
        indices
    };
}