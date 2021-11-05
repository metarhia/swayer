import formService from './domain/form-service.js';

/** @returns MetacomponentConfig */
const createField = ([name, value]) => ({
  path: `./components/${value.type}.js`,
  base: import.meta.url,
  args: [name, value],
});
const createFields = (fields) => Object.entries(fields).map(createField);

const createFieldListener = (name) => ({
  [name](data) {
    this.state.formData[name] = data;
  },
});
const createFieldListeners = (fields) =>
  Object.keys(fields)
    .map(createFieldListener)
    .reduce((events, listener) => ({ ...events, ...listener }), {});

/** @returns Metacomponent */
export default ({ action, title, fields }) => ({
  tag: 'div',
  attrs: {
    name: 'test',
    style: {
      padding: '20px',
      backgroundColor: 'grey',
      color: 'white',
      borderBottom: '1px solid white',
    },
  },
  state: {
    formData: {},
    count: 0,
  },
  events: {
    async send() {
      const data = this.state.formData;
      await formService.sendFormData(action, data);
    },
  },
  hooks: {
    init() {
      Object.assign(this.events, createFieldListeners(fields));
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
