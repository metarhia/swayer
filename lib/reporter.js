export default class Reporter {

  static #errors = {
    Default: () => 'Something went wrong',

    BadMount: () => 'Mount element not found',

    BadInitOption: (option) => `Invalid Swayer init option '${option}',
  consider data-swayer="create | hydrate"`,

    BadInputSchema: ({ option, schema }) => {
      const options = {
        poor: 'No tag or path found',
        conflict: 'Forbidden to mix text and children',
      };
      return `${options[option]}, got ${JSON.stringify(schema)}`;
    },

    // todo change when module loader implemented
    UnscopedChannel: (tag) => `You must provide meta ({ tag: '${tag}', meta: import.meta })
  component property to use channels intercomponent communication`,
  };

  static #warnings = {
    Default: () => 'Warning',

    MaxListenersExceeded: ({ eventName, count }) => `Possible EventEmitter memory leak detected.
  ${count} listeners added.
  You have to decrease the number of listeners for '${eventName}' event.
  Hint: avoid adding listeners in loops.`,

    InstanceExists: (id) => `${id} instance already exists. Skipped.
  Add id to make instance unique.`,
  };

  static error(name, context) {
    const getMessage = this.#errors[name] || this.#errors['Default'];
    const message = getMessage(context);
    const error = new Error(message);
    error.name = name + 'Error';
    return error;
  }

  static warn(name, context) {
    const getMessage = this.#warnings[name] || this.#warnings['Default'];
    const message = getMessage(context);
    console.warn(`${name + 'Warning'}: ${message}`);
  }
}
