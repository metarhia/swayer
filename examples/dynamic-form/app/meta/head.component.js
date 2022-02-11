/** @returns {Schema} */
export default () => ({
  tag: 'head',
  children: [
    {
      tag: 'title',
      text: 'Dynamic forms',
    },
    {
      tag: 'script',
      attrs: {
        async: true,
        type: 'module',
        src: '/index.js',
      },
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
