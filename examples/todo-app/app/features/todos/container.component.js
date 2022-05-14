import { todoSectionStyles } from './container.styles.js';
import storage from './todo-storage.provider.js';

/** @returns {SchemaRef} */
const createTodoList = () => ({
  path: './list/list.component',
  base: import.meta.url,
});

/** @returns {SchemaRef} */
const createFooter = () => ({
  path: './footer/footer.component',
  base: import.meta.url,
});

const calculateCounts = (todos) => {
  const completedCount = todos.filter((todo) => todo.completed).length;
  const remainingCount = todos.length - completedCount;
  return { completedCount, remainingCount };
};

const todos = storage.retrieve();

/** @returns {Schema} */
export default () => ({
  tag: 'main',
  meta: import.meta,
  styles: todoSectionStyles(),
  state: {
    todos,
    showMain: todos.length > 0,
    ...calculateCounts(todos),
  },
  methods: {
    addTodo(todoTitle) {
      const title = todoTitle.trim();
      if (title) {
        const todo = { title, completed: false, editing: false };
        this.state.todos.push(todo);
        return todo;
      }
    },
    updateCounts() {
      const todos = this.state.todos;
      Object
        .entries(calculateCounts(todos))
        .forEach(([count, value]) => (this.state[count] = value));
      storage.save(todos);
    },
  },
  events: {
    todoChangeEvent() {
      this.methods.updateCounts();
    },
    todoAddEvent({ detail: title }) {
      this.methods.addTodo(title);
      this.methods.updateCounts();
      if (!this.state.showMain) this.state.showMain = true;
    },
    todoRemoveEvent({ detail: todo }) {
      const index = this.state.todos.indexOf(todo);
      this.state.todos.splice(index, 1);
      this.methods.updateCounts();
      if (this.state.todos.length === 0) this.state.showMain = false;
    },
    clearCompletedEvent() {
      this.state.todos = this.state.todos.filter((todo) => !todo.completed);
      this.methods.updateCounts();
      if (this.state.todos.length === 0) this.state.showMain = false;
    },
  },
  children: [
    { path: './header/header.component', base: import.meta.url },
    { showMain: (show) => show && createTodoList() },
    { showMain: (show) => show && createFooter() },
  ],
});
