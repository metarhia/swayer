export default new class {
  #sendNotification = 'Data sent:';
  #data = null;

  setData(data) {
    this.#data = data;
  }

  async send() {
    console.log(this.#sendNotification, this.#data);
  }
};
