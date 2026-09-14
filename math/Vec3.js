class Vec3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    add(that) {
        return new Vec3(this.x + that.x, this.y + that.y, this.z + that.z);
    }
    sub(that) {
        return new Vec3(this.x - that.x, this.y - that.y, this.z - that.z);
    }
    scale(scale) {
        return new Vec3(this.x * scale, this.y * scale, this.z * scale);
    }
    dot(that) {
        return this.x * that.x + this.y * that.y + this.z * that.z;
    }
    cross(that) {
        return new Vec3(
            this.y * that.z - this.z * that.y,
            this.z * that.x - this.x * that.z,
            this.x * that.y - this.y * that.x,
        );
    }
    length() {
        const xx = this.x * this.x;
        const yy = this.y * this.y;
        const zz = this.z * this.z;
        return Math.sqrt(xx + yy + zz);
    }
    normalize() {
        const length = this.length();
        if (length == 0) return new Vec3(0, 0, 0);
        return new Vec3(this.x / length, this.y / length, this.z / length);
    }
}
