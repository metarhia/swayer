import Storage from '../../utils/storage.js';

export class TodosModel {
  #storage = new Storage('swayer-todos');
  /** @type {TodosState} */
  state = {
    show: false,
    todos: [],
    counts: {
      completed: 0,
      remaining: 0,
    },
  };

  constructor() {
    this.#load();
    this.#updateVisibility();
    this.calculateCounts();
  }

  addTodo(title) {
    const data = { title, editing: false, completed: false };
    this.state.todos.push(data);
    this.#handleChanges();
  }

  removeTodo(index) {
    this.state.todos.splice(index, 1);
    this.#handleChanges();
  }

  clearCompleted() {
    const todos = this.state.todos;
    this.state.todos = todos.filter(({ completed }) => !completed);
    this.#handleChanges();
  }

  calculateCounts() {
    const todos = this.state.todos;
    const completed = todos.filter(({ completed }) => completed).length;
    const remaining = todos.length - completed;
    this.state.counts = { completed, remaining };
  }

  save() {
    this.#storage.save(this.state.todos);
  }

  #load() {
    this.state.todos = this.#storage.retrieve();
  }

  #handleChanges() {
    this.#updateVisibility();
    this.calculateCounts();
    this.save();
  }

  #updateVisibility() {
    this.state.show = this.state.todos.length > 0;
  }
}
