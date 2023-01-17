import { clearTodosButtonStyles, countsStyles } from './counts.styles.js';

const getItemsText = (count) => (count === 1 ? 'item left' : 'items left');

/** @type {Schema<TodosModel>} */
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

/** @returns {Schema<TodosModel>} */
export default (todosModel) => ({
  tag: 'footer',
  model: todosModel,
  styles: countsStyles,
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
