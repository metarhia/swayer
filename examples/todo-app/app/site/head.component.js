/** @returns {Schema} */
export default (title) => ({
  tag: 'head',
  children: [
    {
      tag: 'title',
      text: title,
    },
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
  ],
});
