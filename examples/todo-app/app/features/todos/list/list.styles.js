/** @returns {Styles} */
export const mainSectionStyles = () => ({
  position: 'relative',
  zIndex: 2,
  borderTop: '1px solid #e6e6e6',
});

/** @returns {Styles} */
export const toggleAllTodosStyles = () => ({
  width: '1px',
  height: '1px',
  border: 'none',
  opacity: 0,
  position: 'absolute',
  right: '100%',
  bottom: '100%',
});

/** @returns {Styles} */
export const todoListStyles = () => ({
  margin: '0',
  padding: '0',
  listStyle: 'none',
});
