import { HASH_LENGTH } from './constants.js';

export default class SchemaHasher {
  static #cyrb53Hash(key, seed = 0) {
    const A = 2654435761;
    const B = 1597334677;
    const C = 2246822507;
    const D = 3266489909;
    const E = 4294967296;
    const F = 2097151;
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let index = 0, char; index < key.length; ++index) {
      char = key.charCodeAt(index);
      h1 = Math.imul(h1 ^ char, A);
      h2 = Math.imul(h2 ^ char, B);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), C) ^ Math.imul(h2 ^ (h2 >>> 13), D);
    h2 = Math.imul(h2 ^ (h2 >>> 16), C) ^ Math.imul(h1 ^ (h1 >>> 13), D);
    return E * (F & h2) + (h1 >>> 0);
  }

  static #hash(data) {
    const str = JSON.stringify(data);
    return SchemaHasher.#cyrb53Hash(str).toString().slice(-HASH_LENGTH);
  }

  static hashStyles(styles) {
    const entries = Object.entries(styles);
    const hashData = entries.sort((a, b) => a[0].localeCompare(b[0]));
    return SchemaHasher.#hash(hashData);
  }

  static hashSchema(schema) {
    const hashData = {
      tag: schema.tag,
      text: schema.text,
      attrs: schema.attrs,
      styles: schema.styles,
    };
    return SchemaHasher.#hash(hashData);
  }
}
