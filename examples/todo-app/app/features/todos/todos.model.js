import storageService from './todo-storage.service.js';

export class TodosModel {
  #storage = storageService;
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
    this.load();
    this.updateVisibility();
    this.calculateCounts();
  }

  addTodo(title) {
    const data = { title, editing: false, completed: false };
    this.state.todos.push(data);
    this.handleChanges();
  }

  removeTodo(todoModel) {
    const index = this.state.todos.indexOf(todoModel.state);
    this.state.todos.splice(index, 1);
    this.handleChanges();
  }

  clearCompleted() {
    const todos = this.state.todos;
    this.state.todos = todos.filter(({ completed }) => !completed);
    this.handleChanges();
  }

  handleChanges() {
    this.updateVisibility();
    this.calculateCounts();
    this.save();
  }

  updateVisibility() {
    this.state.show = this.state.todos.length > 0;
  }

  calculateCounts() {
    const todos = this.state.todos;
    const completed = todos.filter(({ completed }) => completed).length;
    const remaining = todos.length - completed;
    this.state.counts = { completed, remaining };
  }

  load() {
    this.state.todos = this.#storage.retrieve();
  }

  save() {
    this.#storage.save(this.state.todos);
  }
}
