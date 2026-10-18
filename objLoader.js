async function loadObject(url) {
    let responce = await fetch(url);
    let source = await responce.text();
    return parseObject(source);
}

function parseObject(source) {
    let vertices = [];
    let indices = [];
    const lines = source.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (!line || line == "" || line.startsWith("#")) continue;

        const parts = line.split(/\s+/);
        const type = parts[0];

        switch (type) {
            case "v": {
                vertices.push(parseFloat(parts[1]));
                vertices.push(parseFloat(parts[2]));
                vertices.push(parseFloat(parts[3]));
                break;
            }
            case "f": {
                indices.push(parseInt(parts[1].split('/')[0]) - 1);
                indices.push(parseInt(parts[2].split('/')[0]) - 1);
                indices.push(parseInt(parts[3].split('/')[0]) - 1);
                break;
            }
            default:
                break;
        }
    }
    return { vertices: vertices, indices: indices };
}