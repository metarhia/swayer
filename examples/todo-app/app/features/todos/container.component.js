import { todoSectionStyles } from './container.styles.js';
import storage from './todo-storage.provider.js';

/** @returns {SchemaRef} */
const createTodoList = (todos) => ({
  path: './list/list.component',
  base: import.meta.url,
  args: { todos },
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
    },
    todoRemoveEvent({ detail: todo }) {
      const index = this.state.todos.indexOf(todo);
      this.state.todos.splice(index, 1);
      this.methods.updateCounts();
    },
    clearCompletedEvent() {
      this.state.todos = this.state.todos.filter((todo) => !todo.completed);
      this.methods.updateCounts();
    },
  },
  children: [
    { path: './header/header.component', base: import.meta.url },
    ({ todos }) => todos.length > 0 && createTodoList(todos),
    ({ todos }) => todos.length > 0 && createFooter(),
  ],
});
