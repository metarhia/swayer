# Swayer - schema based frontend framework 🧱

## Play with [examples](https://github.com/metarhia/swayer/tree/main/examples) to see how it works

## [See online Todo App demo](https://metarhia.github.io/swayer/examples/todo-app/)

## Features:

- Pure JavaScript only - no need to switch between HTML/CSS/JS syntax
- Fast asynchronous rendering
- No need to use HTML/CSS preprocessors
- No 3rd party dependencies
- Declarative schema based components
- Configurable styles and animations
- Inline/preload/lazy component loading
- Module encapsulation
- Framework methods injection
- Component reflections
- Local state and methods
- System and custom upstream events
- Scoped intercomponent messaging
- Component lifecycle hooks

## Component example

```js
export default () => ({
  tag: 'section',
  meta: import.meta,
  styles: todoSectionStyle(),
  state: {
    isMainAdded: false,
  },
  methods: {
    addMain() {
      this.children.push(createMain(), createFooter());
      this.state.isMainAdded = true;
    },
    removeMain() {
      this.children.splice(1, 2);
      this.state.isMainAdded = false;
    },
    updateRemaining() {
      const footer = createFooter();
      this.children.splice(2, 1, footer);
    },
    addTodo(todo) {
      const scope = './main/main.component';
      this.emitMessage('addTodoChannel', todo, { scope });
    },
  },
  events: {
    addTodoEvent({ detail: todo }) {
      if (this.state.isMainAdded) this.methods.updateRemaining();
      else this.methods.addMain();
      this.methods.addTodo(todo);
    },
    todoChangeEvent() {
      if (todoStore.todos.length > 0) this.methods.updateRemaining();
      else this.methods.removeMain();
    },
  },
  hooks: {
    init() {
      if (todoStore.todos.length > 0) this.methods.addMain();
    },
  },
  children: [{ path: './header/header.component', base: import.meta.url }],
});
```
