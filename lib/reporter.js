export default class Reporter {

  static #errors = {
    Default: () => 'Something went wrong.',

    BadMount: () => 'Mount element not found.',

    BadStyle: () => 'Style element not found.',

    BadSchemaInput: ({ option, input }) => {
      const options = {
        poor: 'No valid schema tag or path found. ' +
          'Consider to use valid string tag, component url or routes object',
      };
      return `${options[option]}, got ${JSON.stringify(input)}`;
    },

    BadSchema: ({ option, schema, moduleUrl }) => {
      const options = {
        invalidText: 'Invalid text, only primitive values allowed, ' +
          `got ${schema.text}.`,
        invalidChildren: 'Invalid children, only array or function ' +
          `values allowed, got ${schema.children}`,
        conflict: 'Forbidden to mix text and children fields, ' +
          `consider to use single text field or text string in children.`,
        model: 'Model is not an object.',
        state: 'Model state is not an object.',
      };
      return `${options[option]}
    in module: ${moduleUrl}
    in schema with tag: ${schema.tag}`;
    },

    HeadNotFound: (tag) => `No head found at first html element, got ${tag}.`,

    RouteNotFound: ({ path, moduleUrl, tag }) => 'cannot find ' +
      `${path ? `route '${path}'` : 'any route'}
  in module: ${moduleUrl}
  in schema with tag: ${tag}`,

    RootRoutesNotFound: ({ configUrl }) => `cannot find any root route
  in module: ${configUrl}`,
  };

  static #warns = {
    Default: () => 'Warning',

    MaxListenersExceeded: ({ eventName, count }) => `
  Possible EventEmitter memory leak detected.
  ${count} listeners added.
  You have to decrease the number of listeners for '${eventName}' event.
  Hint: avoid adding listeners in loops.`,

    RedundantInput: ({ input, moduleUrl }) => 'component does not accept ' +
  `input ${JSON.stringify(input)}
  in module: ${moduleUrl}`,
  };

  static error(name, context) {
    const getMessage = Reporter.#errors[name] || Reporter.#errors['Default'];
    const message = getMessage(context);
    const error = new Error(message);
    error.name = name + 'Error';
    return error;
  }

  static errorLog(name, context) {
    const getMessage = Reporter.#errors[name] || Reporter.#errors['Default'];
    const message = getMessage(context);
    console.error(`${name + 'Error'}: ${message}`);
  }

  static warn(name, context) {
    const getMessage = Reporter.#warns[name] || Reporter.#warns['Default'];
    const message = getMessage(context);
    console.warn(`${name + 'Warning'}: ${message}`);
  }
}
