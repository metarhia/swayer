export default class Reporter {

  static #errors = {
    Default: () => 'Something went wrong',

    BadMount: () => 'Mount element not found',

    BadStyle: () => 'Style element not found',

    BadSchemaInput: ({ option, input }) => {
      const options = {
        poor: 'No tag or path found',
        conflict: 'Forbidden to mix text and children',
      };
      return `${options[option]}, got ${JSON.stringify(input)}`;
    },

    HeadNotFound: (tag) => `No head found at first html element, got ${tag}`,
  };

  static #warns = {
    Default: () => 'Warning',

    MaxListenersExceeded: ({ eventName, count }) => `
  Possible EventEmitter memory leak detected.
  ${count} listeners added.
  You have to decrease the number of listeners for '${eventName}' event.
  Hint: avoid adding listeners in loops.`,
  };

  static error(name, context) {
    const getMessage = Reporter.#errors[name] || Reporter.#errors['Default'];
    const message = getMessage(context);
    const error = new Error(message);
    error.name = name + 'Error';
    return error;
  }

  static warn(name, context) {
    const getMessage = Reporter.#warns[name] || Reporter.#warns['Default'];
    const message = getMessage(context);
    console.warn(`${name + 'Warning'}: ${message}`);
  }
}
