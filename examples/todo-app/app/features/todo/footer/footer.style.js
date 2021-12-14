/** @returns Styles */
export const footerStyle = () => ({
  padding: '10px 15px',
  height: '20px',
  textAlign: 'center',
  fontSize: '15px',
  borderTop: '1px solid #e6e6e6',
  before: {
    content: `''`,
    position: 'absolute',
    right: '0',
    bottom: '0',
    left: '0',
    height: '50px',
    overflow: 'hidden',
    boxShadow: `0 1px 1px rgba(0, 0, 0, 0.2),
                  0 8px 0 -3px #f6f6f6,
                  0 9px 1px -3px rgba(0, 0, 0, 0.2),
                  0 16px 0 -6px #f6f6f6,
                  0 17px 2px -6px rgba(0, 0, 0, 0.2)`,
  },
});

/** @returns Styles */
export const clearTodosButtonStyle = () => ({
  margin: '0',
  padding: '0',
  border: '0',
  background: 'none',
  fontSize: '100%',
  verticalAlign: 'baseline',
  fontFamily: 'inherit',
  fontWeight: 'inherit',
  color: 'inherit',
  appearance: 'none',
  float: 'right',
  position: 'relative',
  lineHeight: '19px',
  textDecoration: 'none',
  cursor: 'pointer',
  hover: {
    textDecoration: 'underline',
  },
});
