/** @type {Styles} */
const linkStyles = {
  color: 'inherit',
  textDecoration: 'none',
  fontWeight: 400,
  hover: {
    textDecoration: 'underline',
  },
};

/** @type {Schema} */
export default {
  tag: 'footer',
  styles: {
    margin: '65px auto 0',
    color: '#bfbfbf',
    fontSize: '12px',
    lineHeight: 1,
    textShadow: '0 1px 0 rgb(255 255 255 / 50%)',
    textAlign: 'center',
  },
  children: [
    {
      tag: 'p',
      text: 'Double-click to edit a todo',
      attrs: { id: 'test' },
      channels: {
        test(message) {
          console.log({ message });
        },
      },
    },
    {
      tag: 'p',
      children: [
        'Created by ',
        {
          tag: 'a',
          styles: linkStyles,
          attrs: {
            href: 'https://github.com/rohiievych',
            target: '_blank',
            rel: 'noopener',
          },
          text: 'Roman Ohiievych',
        },
        ' using ',
        {
          tag: 'a',
          styles: linkStyles,
          attrs: {
            href: 'https://github.com/metarhia/swayer',
            target: '_blank',
            rel: 'noopener',
          },
          text: 'Swayer',
        },
      ],
    },
  ],
};
