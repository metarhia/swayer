import formService from './domain/form-service.js';

const createField = ([name, value]) => ({
  path: `./components/${value.type}.js`,
  base: import.meta.url,
  args: [name, value],
});

const createFields = (fields) => Object.entries(fields).map(createField);

export default ({ action, title, fields }) => ({
  tag: 'div',
  attrs: {
    style: {
      padding: '20px',
      backgroundColor: 'grey',
      color: 'white',
      borderBottom: '1px solid white',
    },
  },
  events: {
    submit(event) {
      event.preventDefault();
      const result = {};
      new FormData(event.target).forEach((value, name) => {
        const existing = result[name];
        if (existing && Array.isArray(existing)) existing.push(value);
        else if (existing) result[name] = [existing, value];
        else result[name] = value;
      });
      void formService.sendFormData(action, result);
    },
  },
  children: [
    {
      tag: 'p',
      text: title,
    },
    {
      tag: 'form',
      attrs: {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          width: '450px',
        },
      },
      children: [
        ...createFields(fields),
        { path: './components/button', base: import.meta.url },
      ],
    },
  ],
});
