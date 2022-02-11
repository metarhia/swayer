/** @returns Styles */
export const titleStyle = () => ({
  position: 'absolute',
  top: '-139px',
  width: '100%',
  fontSize: '100px',
  fontWeight: 200,
  textAlign: 'center',
  color: 'rgba(175, 47, 47, 0.15)',
});

/** @returns Styles */
export const todoInputStyle = () => ({
  position: 'relative',
  margin: '0',
  width: '100%',
  fontSize: '24px',
  fontFamily: 'inherit',
  fontWeight: 'inherit',
  lineHeight: '1.4em',
  color: 'inherit',
  boxSizing: 'border-box',
  padding: '16px 16px 16px 60px',
  height: '65px',
  border: 'none',
  outline: 'none',
  backgroundColor: 'rgba(0, 0, 0, 0.003)',
  boxShadow: 'inset 0 -2px 1px rgba(0, 0, 0, 0.03)',
  placeholder: {
    fontStyle: 'italic',
    fontWeight: 300,
    color: '#e6e6e6',
  },
});
