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

const siteHeadRef = { path: '@app/site/head.component' };
const todosContainerRef = { path: '@todos/container.component' };
const siteFooterRef = { path: '@app/site/footer.component' };

/** @returns {Schema} */
export default ({ locale }) => {
  console.time('Init');
  return {
    tag: 'html',
    styles: {
      fontFamily: 'Helvetica',
    },
    attrs: { lang: locale },
    hooks: {
      init() {
        console.timeEnd('Init');
      },
    },
    children: [
      siteHeadRef,
      {
        tag: 'body',
        styles: bodyStyles,
        children: [
          {
            routes: [
              {
                pattern: '',
                component: todosContainerRef,
              },
              {
                pattern: 'todos',
                component: todosContainerRef,
              },
              {
                pattern: 'todos/:id',
                component: ({ params }) => `Hey, this is todo '${params.id}'`,
              },
              {
                pattern: '**',
                component: 'Page not found',
              },
            ],
          },
          siteFooterRef,
        ],
      },
    ],
  };
};
