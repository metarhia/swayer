# Metacomponents - schema based frontend framework 🧱

## Play with [examples](https://github.com/metarhia/metacomponents/tree/main/examples) to see how it works

## Features:

- Pure JavaScript only - no need to switch between HTML/CSS/JS syntax
- Tiny and fast runtime
- No need to use HTML/CSS preprocessors
- No 3rd party dependencies
- Declarative schema based components
- Configurable styles and animations
- Component inline/preload/lazy loading
- Component encapsulation
- Component dependency injection
- Component change detection
- Component local state
- Component system and custom events
- Component lifecycle hooks

## Dynamic form component example

```js
export default ({ action, title, fields }) => ({
  tag: 'div',
  styles: {
    padding: '20px',
    backgroundColor: 'grey',
    color: 'white',
    borderBottom: '1px solid white',
  },
  attrs: {
    name: 'test',
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
      styles: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '450px',
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
  styles: {
    padding: '5px 10px',
    borderRadius: '5px',
    border: 'none',
  },
  attrs: {
    type: 'text',
    name,
    placeholder: value.placeholder,
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
  styles: {
    padding: '5px 10px',
    marginLeft: '10px',
    borderRadius: '5px',
    backgroundColor: 'green',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    hover: {
      backgroundColor: 'darkgreen',
    },
  },
  attrs: {
    type: 'button',
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

### TODO

- implement intercomponent messaging
- implement AOT compilation
