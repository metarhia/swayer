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
    const iterableEvents = Object.entries(events);
    if (iterableEvents.length === 0) return;
    for (const [eventName, listener] of this.#events) {
      this.#elementBinding.removeEventListener(eventName, listener);
      this.#events.delete(eventName);
    }
    for (const [eventName, listener] of iterableEvents) {
      const handler = (event) => {
        listener.call(this.#context, event.detail || event);
      };
      this.#elementBinding.addEventListener(eventName, handler);
      this.#events.set(eventName, handler);
    }
  }

  getEvents() {
    return Object.fromEntries(this.#events);
  }

  setEventListener(eventName, eventListener) {
    let listener = this.#events.get(eventName);
    if (listener) this.#elementBinding.removeEventListener(eventName, listener);
    listener = eventListener;
    const handler = (event) => {
      let result = event;
      if (this.#elementBinding.isCustomEvent(event)) result = event.detail;
      listener.call(this.#context, result);
    };
    this.#elementBinding.addEventListener(eventName, handler);
    this.#events.set(eventName, handler);
  }

  getEventListener(eventName) {
    return this.#events.get(eventName);
  }

  dispatchEvent(eventName, data) {
    return this.#elementBinding.dispatchEvent(eventName, data);
  }
}
