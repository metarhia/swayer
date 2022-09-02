/** @returns {Styles} */
export const todoStyles = () => ({
  fontSize: '24px',
  borderBottom: '1px solid #ededed',
  last: {
    borderBottom: 'none',
  },
});

/** @returns {Styles} */
export const todoTitleStyles = (checked) => ({
  wordBreak: 'break-all',
  padding: '15px 50px 15px 60px',
  display: 'block',
  lineHeight: 1.2,
  transition: 'color 0.2s ease-in-out',
  fontWeight: 400,
  color: checked ? '#d9d9d9' : '#484848',
  textDecoration: checked ? 'line-through' : 'none',
});

/** @returns {Styles} */
export const todoToggleStyles = (checked) => ({
  position: 'absolute',
  left: '10px',
  top: '10px',
  display: 'inline-block',
  width: '44px',
  height: '40px',
  backgroundImage: checked
    ? 'url(/assets/icons/checkedCircle.svg)'
    : 'url(/assets/icons/circle.svg)',
  cursor: 'pointer',
  zIndex: 1,
});

/** @returns {Styles} */
export const removeTodoButtonStyles = () => ({
  position: 'absolute',
  top: '0',
  right: '10px',
  bottom: '0',
  width: '40px',
  height: '40px',
  margin: 'auto 0',
  fontSize: '30px',
  color: '#949494',
  transition: 'color 0.2s ease-out',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  hover: {
    color: '#C18585',
    after: {
      content: `'×'`,
    },
  },
  focus: {
    color: '#C18585',
  },
});

/** @returns {Styles} */
export const editTodoStyles = () => ({
  position: 'absolute',
  top: '0px',
  bottom: '0px',
  zIndex: 1,
  width: '100%',
  padding: '6px 6px 6px 60px',
  border: 'none',
  outline: 'none',
  fontSize: '24px',
  lineHeight: '1.4em',
  color: 'inherit',
  boxShadow: 'rgb(0 0 0 / 20%) 0px -1px 5px 0px inset',
  boxSizing: 'border-box',
});
