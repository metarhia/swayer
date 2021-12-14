export default class EventManager {
  #events = new Map();
  #elementBinding;
  #context;

  constructor(elementBinding) {
    this.#elementBinding = elementBinding;
  }

  setEventsContext(component) {
    this.#context = component;
  }

  setEvents(events) {
    if (!events || typeof events !== 'object') return;
    for (const [name, listener] of this.#events) {
      this.#elementBinding.removeEventListener(name, listener);
      this.#events.delete(name);
    }
    for (const [eventName, listener] of Object.entries(events)) {
      this.#bindEvent(eventName, listener);
    }
  }

  getEvents() {
    return Object.fromEntries(this.#events);
  }

  setEventListener(name, eventListener) {
    const listener = this.#events.get(name);
    if (listener) this.#elementBinding.removeEventListener(name, listener);
    this.#bindEvent(name, eventListener);
  }

  getEventListener(name) {
    return this.#events.get(name);
  }

  emitCustomEvent(eventName, data) {
    return this.#elementBinding.emitCustomEvent(eventName, data);
  }

  #bindEvent(name, listener) {
    const handler = (event) => {
      listener.call(this.#context, event);
      const systemEvent = !this.#elementBinding.isCustomEvent(event);
      if (systemEvent) event.stopPropagation();
    };
    this.#elementBinding.addEventListener(name, handler);
    this.#events.set(name, handler);
  }
}
