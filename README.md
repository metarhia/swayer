# MetaComponents - schema based frontend framework 🧱

## Play with [examples](https://github.com/metarhia/metacomponents/tree/main/examples) to see how it works

## Features:

- Pure JavaScript only - no need to switch between HTML/CSS/JS syntax
- No 3rd party dependencies
- Tiny runtime
- Declarative schema based components
- Component inline/preload/lazy loading
- Component encapsulation
- Component dependency injection
- Component change detection
- Component local state
- Component lifecycle hooks
- Separate singleton or non-singleton domain logics as services

## Dynamic form component example

```js
import formService from './domain/form-service.js';

const createField = ([name, value]) => ({
  type: 'lazy',
  path: `/app/features/form/components/${value.type}.js`,
  args: [name, value],
});

const createFields = (fields) => Object.entries(fields).map(createField);

export default ({ action, title, fields }) => ({
  tag: 'div',
  styles: {
    padding: '20px',
    backgroundColor: 'grey',
    color: 'white',
    borderBottom: '1px solid white',
  },
  hooks: {
    init() {
      console.log('Container init');
    },
  },
  events: {
    submit(event) {
      event.preventDefault();
      const result = {};
      new FormData(event.target).forEach((value, name) => {
        const existing = result[name];
        if (existing && Array.isArray(existing)) existing.push(value);
        else if (existing) result[name] = [existing, value];
        else result[name] = value;
      });
      void formService.sendFormData(action, result);
    },
  },
  children: [
    {
      tag: 'p',
      text: title,
    },
    {
      tag: 'form',
      styles: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '450px',
      },
      children: [
        ...createFields(fields),
        { type: 'lazy', path: '/app/features/form/components/button.js' },
      ],
    },
  ],
});
```

### Form input component example

```js
export default ([name, value]) => ({
  tag: 'input',
  styles: {
    padding: '5px 10px',
    borderRadius: '5px',
    border: 'none',
  },
  attrs: {
    type: 'text',
    placeholder: value.placeholder,
    name,
  },
  hooks: {
    init() {
      console.log('Input init');
    },
  },
});
```

### Form button component example

```js
export default () => ({
  tag: 'button',
  text: 'Send',
  styles: {
    padding: '5px 10px',
    borderRadius: '5px',
    backgroundColor: 'green',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
  },
  attrs: {
    type: 'submit',
  },
  state: {
    count: 0,
  },
  events: {
    async click() {
      this.state.count++;
      console.log(`Button clicked ${this.state.count} times`);
    },
  },
  hooks: {
    init() {
      console.log('Button init');
    },
  },
});
```

###TODO
- implement intercomponent messaging
- implement AOT, refactor base compiler
- implement style preprocessor
- implement sandboxes
