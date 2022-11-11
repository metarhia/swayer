import { clearTodosButtonStyles, footerStyles } from './footer.styles.js';

const getItemsText = (count) => (count === 1 ? 'item left' : 'items left');

const clearButton = {
  tag: 'button',
  text: 'Clear completed',
  styles: clearTodosButtonStyles,
  events: {
    click() {
      this.model.clearCompleted();
    },
  },
};

/** @returns {Schema} */
export default (todosModel) => ({
  tag: 'footer',
  model: todosModel,
  styles: footerStyles,
  children: [
    {
      tag: 'span',
      styles: {
        float: 'left',
        textAlign: 'left',
      },
      children: [
        {
          tag: 'span',
          text: ({ counts }) => counts.remaining,
        },
        ' ',
        {
          tag: 'span',
          text: ({ counts }) => getItemsText(counts.remaining),
        },
      ],
    },
    ({ counts }) => counts.completed > 0 && clearButton,
  ],
});
