export default () => ({
  main: 'container',
  elements: {
    container: import('./elements/container.js').then(m => m.default),
    input: import('./elements/input.js').then(m => m.default),
    button: import('./elements/button.js').then(m => m.default)
  },
  domain: {
    sender: import('../../domain/sender.js').then(m => m.default)
  }
});
