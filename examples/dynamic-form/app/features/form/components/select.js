/** @returns {Schema} */
const createOption = ({ text, value }) => ({
  tag: 'option',
  attrs: { value },
  text,
});

/** @returns {Schema} */
export default ([name, value]) => ({
  tag: 'select',
  styles: {
    padding: '5px 10px',
    borderRadius: '5px',
    border: 'none',
  },
  attrs: {
    multiple: value.multiple || false,
    name,
  },
  children: value.options.map(createOption),
});
