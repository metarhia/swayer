export default () => ({
  main: 'indexPage',
  elements: {
    indexPage: import('./pages/index.js').then(m => m.default),
    form: import('./form/index.js').then(m => m.default)
  }
});
