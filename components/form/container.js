export default {
  tag: 'div',
  styles: {
    padding: '20px',
    backgroundColor: 'grey',
    color: 'white'
  },
  hooks: {
    init: () => console.log('Container init')
  },
  children: [
    {
      tag: 'p',
      text: 'Type your name: '
    },
    components.form.input,
    components.form.button
  ]
};
