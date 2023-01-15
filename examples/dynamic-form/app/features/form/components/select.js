/** @returns {Schema} */
const createOption = ({ text, value }) => ({
  tag: 'option',
  attrs: { value },
  text,
});

/** @returns {Schema} */
export default ([name, selectValue]) => ({
  tag: 'select',
  styles: {
    padding: '5px 10px',
    borderRadius: '5px',
    border: 'none',
  },
  attrs: {
    multiple: selectValue.multiple || false,
    name,
  },
  props: {
    value: '',
  },
  events: {
    change() {
      this.emitEvent(name, this.props.value);
    },
  },
  children: selectValue.options.map(createOption),
});
