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
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        fontWeight: '300',
      },
      children: [{ path: '/app/features/todo/todo.component' }],
    },
  ],
});
