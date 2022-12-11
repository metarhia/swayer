const createTitle = (title) => ({
  tag: 'title',
  text: title,
});

/** @type {Schema} */
export default {
  tag: 'head',
  children: [
    {
      routes: [
        {
          pattern: '',
          component: createTitle('Todos'),
        },
        {
          pattern: 'todos',
          component: createTitle('Todos'),
        },
        {
          pattern: 'todos/:id',
          component: ({ params }) => createTitle(`Todo #${params.id}`),
        },
        {
          pattern: '**',
          component: createTitle('404'),
        },
      ],
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
