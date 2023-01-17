/** @type {Styles} */
const titleStyles = {
  margin: 0,
  fontSize: '100px',
  fontWeight: 200,
  lineHeight: 'initial',
  textAlign: 'center',
  color: 'rgba(175, 47, 47, 0.15)',
};

/** @type {Schema} */
export default {
  tag: 'header',
  styles: {
    padding: '20px 0 30px',
  },
  children: [
    {
      tag: 'h1',
      text: 'todos',
      styles: titleStyles,
    },
  ],
};
