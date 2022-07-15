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
// const todos = new Array(2000).fill(null).map(() => ({ title: '1', editing: false, completed: false }));

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
  channels: {
    todoChangeChannel() {
      this.methods.updateCounts();
    },
  },
  events: {
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
      // const todos = this.state.todos;
      // this.state.todos.splice(0, todos.length, ...todos.filter((todo) => !todo.completed));
      this.state.todos = this.state.todos.filter((todo) => !todo.completed);
      this.methods.updateCounts();
    },
  },
  children: [
    // ({ todos }) => {
    //   console.log({ todos });
    //   return { path: './header/header.component', base: import.meta.url };
    // },
    { path: './header/header.component', base: import.meta.url },
    // ({ todos }) => todos.length > 0 && createTodoList(todos),
    // ({ todos }) => todos.length > 0 && createFooter(),
    ({ todos }) => todos.length > 0 && [
      createTodoList(todos),
      createFooter(),
    ],
    // ({ todos }) =>
    //   // console.log(todos.length);
    // createTodoList(todos),
    // ({ todos }) => createTodoList(todos),
    // createFooter(),
  ],
});
