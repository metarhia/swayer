/** @returns Styles */
const linkStyles = () => ({
  color: 'inherit',
  textDecoration: 'none',
  fontWeight: 400,
  hover: {
    textDecoration: 'underline',
  },
});

/** @returns Metacomponent */
export default () => ({
  tag: 'html',
  styles: {
    fontFamily: 'Helvetica',
  },
  attrs: {
    lang: 'en',
  },
  children: [
    { path: './head.component', base: import.meta.url },
    {
      tag: 'body',
      styles: {
        font: `14px 'Helvetica Neue', Helvetica, Arial, sans-serif`,
        lineHeight: '1.4em',
        background: '#f5f5f5',
        color: '#111111',
        minWidth: '230px',
        maxWidth: '550px',
        margin: '0 auto',
        fontWeight: '300',
      },
      children: [
        {
          path: '../features/todo/todo.component',
          base: import.meta.url,
        },
        {
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
            },
            {
              tag: 'p',
              children: [
                {
                  tag: 'span',
                  text: 'Created by ',
                },
                {
                  tag: 'a',
                  styles: linkStyles(),
                  attrs: {
                    href: 'https://github.com/rohiievych',
                    target: '_blank',
                  },
                  text: 'Roman Ohiievych',
                },
                {
                  tag: 'span',
                  text: ' using ',
                },
                {
                  tag: 'a',
                  styles: linkStyles(),
                  attrs: {
                    href: 'https://github.com/metarhia/swayer',
                    target: '_blank',
                  },
                  text: 'Swayer',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
