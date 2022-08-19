// Used by SSR
class MemoryStorage {
  #data = {};

  getItem(name) {
    return this.#data[name];
  }

  setItem(name, str) {
    this.#data[name] = str;
  }
}

export default class Storage {
  #storage = globalThis.localStorage || new MemoryStorage();
  #name = 'swayer-storage';
  #data;

  constructor(name, initialData = []) {
    this.#name = name;
    this.#data = initialData;
  }

  retrieve() {
    const data = this.#storage.getItem(this.#name);
    if (data) this.#data = JSON.parse(data);
    return this.#data;
  }

  save(data = this.#data) {
    const dataStr = JSON.stringify(data);
    this.#storage.setItem(this.#name, dataStr);
  }
}
