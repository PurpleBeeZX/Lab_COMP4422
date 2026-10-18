class Mat4 {
    constructor(
      e11, e21, e31, e41,
      e12, e22, e32, e42,
      e13, e23, e33, e43,
      e14, e24, e34, e44
    ) {
        this.plainArr = [
          e11, e21, e31, e41,
          e12, e22, e32, e42,
          e13, e23, e33, e43,
          e14, e24, e34, e44
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
        const index = (j - 1) * 4 + (i - 1);
        return this.plainArr[index];
    }
    set(i, j, value) {
        if (i < 1 || i > 4 || j < 1 || j > 4)
            throw new RangeError(
                "trying to access index that is out of range [1, 4]",
            );
        const index = (j - 1) * 4 + (i - 1);
        this.plainArr[index] = value;
    }
    add(that) {
        return Mat4.fromArray(this.plainArr.map((val, i) => val + that.plainArr[i]));
    }
    sub(that) {
        return Mat4.fromArray(this.plainArr.map((val, i) => val - that.plainArr[i]));
    }
    scale(scale) {
        return Mat4.fromArray(this.plainArr.map((val, i) => val * scale));
    }
    mul(that) {
        let c = new Array(16);
        for (let i = 1; i <= 4; i++) {
            for (let j = 1; j <= 4; j++) {
                const index = (j - 1) * 4 + (i - 1);
                c[index] = 0;
                for (let k = 1; k <= 4; k++) {
                    c[index] += this.get(i, k) * that.get(k, j);
                }
            }
        }

        return Mat4.fromArray(c);
    }
    applyTo(vec4) {
        let arr = [vec4.x, vec4.y, vec4.z, vec4.w];
        let res = [0, 0, 0, 0];
        for (let j = 1; j <= 4; j++) {
            for (let i = 1; i <= 4; i++) {
                res[i - 1] += arr[j - 1] * this.get(i, j);
            }
        }
        return Vec4.fromArray(res);
    }

    static identity() {
        return new Mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }

    static translation(tx, ty, tz) {
      return new Mat4(
          1, 0, 0, 0,
          0, 1, 0, 0,
          0, 0, 1, 0,
          tx, ty, tz, 1
      );
    }

    static perspective(fovRad, aspect, near, far) {
            let f = 1.0 / Math.tan(fovRad / 2);
            let nf = 1 / (near - far);
            return Mat4.fromArray([
                f / aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (far + near) * nf, -1,
                0, 0, 2 * far * near * nf, 0
            ]);
        }
        
    static rotationX(rad) {
        let c = Math.cos(rad);
        let s = Math.sin(rad);
        return new Mat4(
            1,  0,  0,  0,
            0,  c,  s,  0,
            0, -s,  c,  0,
            0,  0,  0,  1
        );
    }
        
    static rotationY(rad) {
        let c = Math.cos(rad);
        let s = Math.sin(rad);
        return new Mat4(
            c,  0, -s,  0,
            0,  1,  0,  0,
            s,  0,  c,  0,
            0,  0,  0,  1
        );
    }
}
