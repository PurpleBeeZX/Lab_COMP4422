class Mat4 {
    constructor(
        e11, e12, e13, e14,
        e21, e22, e23, e24,
        e31, e32, e33, e34,
        e41, e42, e43, e44,
    ) {
        this.plain_arr = [
            e11, e12, e13, e14,
            e21, e22, e23, e24,
            e31, e32, e33, e34,
            e41, e42, e43, e44,
        ];
    }
    static fromArray(arr) {
        return new Mat4(...arr);
    }
    get(i, j) {
        if (i < 1 || i > 4 || j < 1 || j > 4)
            throw new RangeError(
                "trying to access index that is out of range [1, 4]",
            );
        const index = (i - 1) * 4 + (j - 1);
        return this.plain_arr[index];
    }
    set(i, j, value) {
        if (i < 1 || i > 4 || j < 1 || j > 4)
            throw new RangeError(
                "trying to access index that is out of range [1, 4]",
            );
        const index = (i - 1) * 4 + (j - 1);
        this.plain_arr[index] = value;
    }
    add(that) {
        return this.plain_arr.map((value, i) => val + that.plain_arr[i]);
    }
    sub(that) {
        return this.plain_arr.map((value, i) => val - that.plain_arr[i]);
    }
    scale(scale) {
        return this.plain_arr.map((value, i) => val * scale);
    }
    mul(that) {
        let c = new Array(16);
        for (let i = 1; i <= 4; i++) {
            for (let j = 1; j <= 4; j++) {
                const index = (i - 1) * 4 + (j - 1);
                c[index] = 0;
                for (let k = 1; k <= 4; k++) {
                    c[index] += this.get(i, k) * that.get(k, j);
                }
            }
        }

        return new Mat4(c);
    }
    applyTo(vec4) {
        let arr = [ vec4.x, vec4.y, vec4.z, vec4.w, ];
        let res = [ 0, 0, 0, 0 ];
        for (let j = 1; j <= 4; j++) {
            for (let i = 1; i <= 4; i++) {
                res[i - 1] += arr[j-1] * this.get(i, j);
            }
        }
        return Vec4.fromArray(res);
    }
}
