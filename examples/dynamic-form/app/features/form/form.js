import formService from './form-service.js';

/** @returns {SchemaRef} */
const createField = ([name, value]) => ({
  path: `@form/components/${value.type}.js`,
  input: [name, value],
});
const createFields = (fields) => Object.entries(fields).map(createField);

const createFieldListener = (name) => ({
  [name]({ detail: data }) {
    this.model.state.formData[name] = data;
  },
});
const createFieldListeners = (fields) =>
  Object.keys(fields)
    .map(createFieldListener)
    .reduce((events, listenerObj) => ({ ...events, ...listenerObj }), {});

const createFormData = (fields) =>
  Object.entries(fields)
    .map(([name, value]) => ({ [name]: value.defaultValue }))
    .reduce((data, fieldObj) => ({ ...data, ...fieldObj }), {});

/** @returns {Schema} */
export default ({ action, title, fields }) => ({
  tag: 'div',
  styles: {
    padding: '20px',
    backgroundColor: 'grey',
    color: 'white',
    borderBottom: '1px solid white',
  },
  model: {
    state: {
      formData: createFormData(fields),
      count: 0,
    },
  },
  events: {
    async send() {
      const data = this.model.state.formData;
      const res = await formService.sendFormData(action, data);
      alert(res);
    },
    ...createFieldListeners(fields),
  },
  children: [
    {
      tag: 'p',
      text: title,
    },
    {
      tag: 'form',
      styles: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '450px',
      },
      children: [
        ...createFields(fields),
        { path: '@form/components/button' },
      ],
    },
  ],
});
