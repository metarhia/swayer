import { todoSectionStyles } from './container.styles.js';
import storage from './todo-storage.provider.js';

const createTodosComponent = (name) => (todos) => ({
  path: `@todos/${name}/${name}.component`,
  args: { todos },
});

/** @returns {SchemaRef} */
const createTodoList = createTodosComponent('list');

/** @returns {SchemaRef} */
const createFooter = createTodosComponent('footer');

const todos = storage.retrieve();
// const todos = new Array(2000).fill(null).map(() => ({ title: '1', editing: false, completed: false }));

/** @returns {Schema} */
export default () => ({
  tag: 'main',
  styles: todoSectionStyles,
  state: { todos },
  channels: {
    todoChangeChannel() {
      this.methods.save();
    },
  },
  methods: {
    save() {
      storage.save(this.state.todos);
    },
  },
  events: {
    todoAddEvent({ detail: todoTitle }) {
      const title = todoTitle.trim();
      if (!title) return;
      const todo = { title, completed: false, editing: false };
      this.state.todos.push(todo);
      this.methods.save();
      // setInterval(() => {
      //   this.state.todos.push({ ...todo });
      // }, 50);
      // setInterval(() => {
      //   this.state.todos = [];
      // }, 1000);
      // setTimeout(() => this.state.todos.length = 1, 1000);
    },
    todoRemoveEvent({ detail: todo }) {
      const index = this.state.todos.indexOf(todo);
      this.state.todos.splice(index, 1);
      this.methods.save();
    },
    clearCompletedEvent() {
      this.state.todos = this.state.todos.filter((todo) => !todo.completed);
      this.methods.save();
    },
  },
  children: [
    { path: '@todos/header/header.component' },
    ({ todos }) => todos.length > 0 && [
      createTodoList(todos),
      createFooter(todos),
    ],
  ],
});
