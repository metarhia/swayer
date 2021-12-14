export default class Utils {
  static equal(a, b) {
    if (a === b) return true;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      if (a.constructor !== b.constructor) return false;
      let length, index;
      if (Array.isArray(a)) {
        length = a.length;
        if (length !== b.length) return false;
        index = length;
        while (index--) {
          if (!this.equal(a[index], b[index])) return false;
        }
        return true;
      }
      const keys = Object.keys(a);
      length = keys.length;
      if (length !== Object.keys(b).length) return false;
      index = length;
      while (index--) {
        if (!Object.prototype.hasOwnProperty.call(b, keys[index])) return false;
      }
      index = length;
      while (index--) {
        const key = keys[index];
        if (!this.equal(a[key], b[key])) return false;
      }
      return true;
    }
    return false;
  }
}
