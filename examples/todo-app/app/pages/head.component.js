/** @returns Metacomponent */
export default () => ({
  tag: 'head',
  children: [
    {
      tag: 'meta',
      attrs: {
        charset: 'utf-8',
      },
    },
    {
      tag: 'meta',
      attrs: {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0',
      },
    },
    {
      tag: 'title',
      text: 'Todo app',
    },
  ],
});
