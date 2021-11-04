# Metacomponents - schema based frontend framework 🧱

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
- Component system and custom events
- Component lifecycle hooks
- Separate singleton or non-singleton domain logics as services

## Dynamic form component example

```js
export default ({ action, title, fields }) => ({
  tag: 'div',
  attrs: {
    name: 'test',
    style: {
      padding: '20px',
      backgroundColor: 'grey',
      color: 'white',
      borderBottom: '1px solid white',
    },
  },
  state: {
    formData: {},
    count: 0,
  },
  events: {
    async send() {
      const data = this.state.formData;
      await formService.sendFormData(action, data);
    },
  },
  hooks: {
    init() {
      console.log('Form init');
      Object.assign(this.events, createFieldListeners(fields));
    },
  },
  children: [
    {
      tag: 'p',
      text: title,
    },
    {
      tag: 'form',
      attrs: {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          width: '450px',
        },
      },
      children: [
        ...createFields(fields),
        { path: './components/button', base: import.meta.url },
      ],
    },
  ],
});
```

### Form input component example

```js
export default ([name, value]) => ({
  tag: 'input',
  attrs: {
    type: 'text',
    name,
    placeholder: value.placeholder,
    style: {
      padding: '5px 10px',
      borderRadius: '5px',
      border: 'none',
    },
  },
  events: {
    input(event) {
      this.triggerCustomEvent(name, event.target.value);
    },
  },
});
```

### Form button component example

```js
export default () => ({
  tag: 'button',
  text: 'Send',
  attrs: {
    type: 'button',
    style: {
      padding: '5px 10px',
      borderRadius: '5px',
      backgroundColor: 'green',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
    },
  },
  state: {
    count: 0,
  },
  events: {
    async click() {
      this.state.count++;
      this.triggerCustomEvent('send');
      console.log(`Button clicked ${this.state.count} times`);
    },
  },
});
```

###TODO

- implement intercomponent messaging
- implement AOT compilation, refactor base compiler
- implement style preprocessor
- implement sandboxes?
