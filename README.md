# Schema based frontend framework
### This is very raw and naive implementation (PoC)
```
npm i
npm start
```
### Features:
- Pure JavaScript without dependencies
- Declarative component definition
- Everything in JavaScript - no need to switch between HTML, CSS and JS
- Component schema change detection

### Component button example
```js
export default {
  tag: 'button',
  text: 'Send',
  styles: await import('./buttonStyles.js').then((m) => m.default),
  attrs: {
    name: 'sendBtn'
  },
  state: {
    count: 0
  },
  events: {
    async click() {
      this.state.count++;
      await domain.data.sender.send();
      console.log(`Button clicked ${this.state.count} times`);
    }
  },
  hooks: {
    init: () => console.log('Button init')
  }
};
```
