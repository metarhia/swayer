export default class Storage {
  #name = 'swayer-storage';
  #data;

  constructor(name, initialData = []) {
    this.#name = name;
    this.#data = initialData;
  }

  retrieve() {
    const data = localStorage.getItem(this.#name);
    if (data) this.#data = JSON.parse(data);
    return this.#data;
  }

  save(data = this.#data) {
    const dataStr = JSON.stringify(data);
    localStorage.setItem(this.#name, dataStr);
  }
}
