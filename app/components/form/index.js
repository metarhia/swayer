export default () => ({
  main: 'container',
  elements: {
    container: '/app/components/form/elements/container.js',
    input: '/app/components/form/elements/input.js',
    button: '/app/components/form/elements/button.js',
    buttonStyles: '/app/components/form/elements/button-styles.js'
  },
  domain: {
    sender: '/app/domain/sender.js'
  }
});
