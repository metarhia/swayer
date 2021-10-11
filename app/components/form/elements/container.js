const formTitle = {
  tag: 'p',
  text: 'Type your name: '
};

export default ({ elements, domain }) => ({
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
    elements.input(formTitle, domain.sender),
    elements.button(elements.buttonStyles(), domain.sender)
  ]
});
