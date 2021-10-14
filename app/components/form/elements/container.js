const formTitle = {
  tag: 'p',
  text: 'Type your name: '
};

export default () => ({
  tag: 'div',
  styles: {
    padding: '20px',
    backgroundColor: 'grey',
    color: 'white'
  },
  hooks: {
    init() {
      console.log('Container init');
    }
  },
  children: [
    formTitle,
    { type: 'dynamic', path: '../app/components/form/elements/input.js', props: { formTitle } },
    { type: 'dynamic', path: '../app/components/form/elements/button.js' }
  ]
});
