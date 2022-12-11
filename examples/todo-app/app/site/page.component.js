const bodyStyles = {
  font: `14px 'Helvetica Neue', Helvetica, Arial, sans-serif`,
  lineHeight: '1.4em',
  background: '#f5f5f5',
  color: '#111111',
  minWidth: '230px',
  maxWidth: '550px',
  margin: '0 auto',
  fontWeight: '300',
};

/** @returns {Schema} */
export default ({ lang = 'en' }) => {
  console.time('Init');
  return {
    tag: 'html',
    styles: {
      fontFamily: 'Helvetica',
    },
    attrs: { lang },
    hooks: {
      init() {
        console.timeEnd('Init');
      },
    },
    children: [
      { path: '@app/site/head.component' },
      {
        tag: 'body',
        styles: bodyStyles,
        children: [
          {
            routes: [
              {
                pattern: '',
                component: { path: '@todos/container.component' },
              },
              {
                pattern: 'todos',
                component: { path: '@todos/container.component' },
              },
              {
                pattern: 'todos/:id',
                component: 'Hey, this is todo',
              },
              {
                pattern: '**',
                component: 'Page not found',
              },
            ],
          },
          { path: '@app/site/footer.component' },
        ],
      },
    ],
  };
};
