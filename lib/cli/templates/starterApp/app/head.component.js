/** @type {Schema} */
export default {
  tag: 'head',
  children: [
    {
      tag: 'title',
      text: 'Swayer app',
    },
    {
      tag: 'link',
      attrs: {
        rel: 'icon',
        type: 'image/png',
        href: '/assets/favicon.png',
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
};
