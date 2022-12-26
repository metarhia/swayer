const isObject = (value) =>
  typeof value === 'object' && value !== null;

const basicPrimitives = ['string', 'boolean', 'number', 'bigint', 'symbol'];

const is = {
  obj: (value) => typeof value === 'object' && value !== null,
  arr: (value) => Array.isArray(value),
  fn: (value) => typeof value === 'function',
  str: (value) => typeof value === 'string',
  basic: (value) => basicPrimitives.includes(typeof value),
  nullish: (value) => value === undefined || value === null,
};

const hasOwn = (object, prop) => Object.hasOwn?.(object, prop)
  ?? Object.prototype.hasOwnProperty.call(object, prop);

const isEnumerable = (object, prop) =>
  Object.prototype.propertyIsEnumerable.call(object, prop);

const equal = (a, b) => {
  if (a === b) return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (a.constructor !== b.constructor) return false;
    let length, index;
    if (Array.isArray(a)) {
      length = a.length;
      if (length !== b.length) return false;
      index = length;
      while (index--) {
        if (!equal(a[index], b[index])) return false;
      }
      return true;
    }
    const keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;
    index = length;
    while (index--) {
      if (!hasOwn(b, keys[index])) return false;
    }
    index = length;
    while (index--) {
      const key = keys[index];
      if (!equal(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
};

const createMacroTaskRunner = (macroTaskSize = 100) => {
  let divider = 0;
  return () => {
    const runTask = ++divider % macroTaskSize === 0;
    if (runTask) return new Promise((resolve) => setTimeout(resolve));
  };
};

const camelToKebabCase = (() => {
  const camelCasePattern = /[A-Z]/g;
  const replacer = (letter) => `-${letter.toLowerCase()}`;
  return (str) => str.replace(camelCasePattern, replacer);
})();

const isBrowser = hasOwn(globalThis, 'document');
const isServer = hasOwn(globalThis, 'process');

export {
  is,
  isObject,
  hasOwn,
  isEnumerable,
  equal,
  createMacroTaskRunner,
  camelToKebabCase,
  isBrowser,
  isServer,
};
