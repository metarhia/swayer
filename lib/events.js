export default class EventManager {
  #events = new Map();
  #binding;
  #component;

  constructor(context) {
    this.#binding = context.binding;
    this.#component = context.component;
    this.setEvents();
  }

  setEvents(setEvents) {
    const events = setEvents || this.#component.events;
    if (!events || typeof events !== 'object') return;
    for (const [name, listener] of this.#events) {
      this.#binding.removeEventListener(name, listener);
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
    if (listener) this.#binding.removeEventListener(name, listener);
    this.#bindEvent(name, eventListener);
  }

  getEventListener(name) {
    return this.#events.get(name);
  }

  emitEvent(eventName, data) {
    return this.#binding.emitEvent(eventName, data);
  }

  #bindEvent(name, listener) {
    const handler = (event) => {
      listener.call(this.#component, event);
      const systemEvent = !this.#binding.isCustomEvent(event);
      if (systemEvent) event.stopPropagation();
    };
    this.#binding.addEventListener(name, handler);
    this.#events.set(name, handler);
  }
}
