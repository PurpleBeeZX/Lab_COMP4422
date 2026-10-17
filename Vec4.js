class Vec4 {
  constructor(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    }
  static fromVec3(vec3, w) {
    this.x = vec3.x;
    this.y = vec3.y;
    this.z = vec3.z;
    this.w = w;
  }
  static fromArray([x, y, z, w]) {
    return new Vec4(x, y, z, w);
  }
  add(that) {
    return new Vec4( this.x + that.x, this.y + that.y, this.z + that.z, this.w + that.w);
  }
  sub(that) {
    return new Vec4(this.x - that.x, this.y - that.y, this.z - that.z, this.w - that.w);
  }
  scale(scale) {
    return new Vec4(this.x * scale, this.y * scale, this.z * scale, this.w * scale);
  }
  normalize() {
    const length = this.length();
    if (length == 0) return new Vec4(0, 0, 0, 0);
    return new Vec4(this.x / length, this.y / length, this.z / length, this.w / length);
  }
  dot(that) {
    return this.x * that.x + this.y * that.y + this.z * that.z + this.w * that.w;
  }
  length() {
    const xx = this.x * this.x;
    const yy = this.y * this.y;
    const zz = this.z * this.z;
    const ww = this.w * this.w;
    return Math.sqrt(xx + yy + zz + ww);
  }
  distance(that) {
    return this.sub(that).length()
  }
}
