const createOption = ({ text, value }) => ({
  tag: 'option',
  attrs: { value },
  text,
});

export default ([name, value]) => ({
  tag: 'select',
  attrs: {
    multiple: value.multiple || false,
    name,
    style: {
      padding: '5px 10px',
      borderRadius: '5px',
      border: 'none',
    },
  },
  children: value.options.map(createOption),
});
