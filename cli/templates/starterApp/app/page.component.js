/** @type {Schema} */
export default {
  tag: 'html',
  attrs: { lang: 'en' },
  children: [
    { path: '@app/head.component' },
    {
      tag: 'body',
      styles: {
        fontFamily: 'Helvetica',
        textAlign: 'center',
      },
      children: [
        {
          tag: 'h1',
          text: 'Welcome to Swayer starter app!',
        },
        {
          tag: 'p',
          styles: { lineHeight: '32px' },
          children: [
            'Learn how to develop with Swayer',
            {
              tag: 'a',
              styles: { display: 'block' },
              text: 'Read documentation',
              attrs: {
                href: 'https://github.com/metarhia/swayer',
                target: '_blank',
              },
            },
            {
              tag: 'a',
              styles: { display: 'block' },
              text: 'Play with example',
              attrs: {
                href: 'https://github.com/metarhia/swayer/tree/main/examples/todo-app',
                target: '_blank',
              },
            },
          ],
        },
      ],
    },
  ],
};
