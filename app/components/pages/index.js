export default ({ elements }) => ({
  tag: 'html',
  attrs: {
    lang: 'en'
  },
  hooks: {
    init() {
      console.log('Html init');
    }
  },
  children: [
    {
      tag: 'head',
      children: [
        {
          tag: 'meta',
          attrs: {
            charset: 'utf-8'
          }
        },
        {
          tag: 'meta',
          attrs: {
            name: 'viewport',
            content: 'width=device-width, initial-scale=1.0'
          }
        },
        {
          tag: 'title',
          text: 'Metacomponents'
        }
      ]
    },
    {
      tag: 'body',
      styles: {
        margin: 0
      },
      children: [
        elements.form()
      ]
    }
  ]
});
