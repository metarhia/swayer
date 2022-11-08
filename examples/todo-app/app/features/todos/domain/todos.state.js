import storageService from './todo-storage.service.js';

class TodoState {
  #todosState;
  model = {};

  constructor(todosState, data = {}) {
    this.#todosState = todosState;
    this.model = data;
    this.model.title = (data.title ?? '').trim();
    this.model.editing = data.editing ?? false;
    this.model.completed = data.completed ?? false;
    this.model.getState = () => this;
  }

  remove() {
    this.#todosState.removeTodo(this);
  }

  updateTitle(title) {
    this.model.title = title.trim();
    this.#todosState.save();
  }

  startEditing() {
    this.model.editing = true;
    this.#todosState.save();
  }

  endEditing() {
    this.model.editing = false;
    this.#todosState.save();
  }

  toggleComplete() {
    this.model.completed = !this.model.completed;
    this.#todosState.calculateCounts();
    this.#todosState.save();
  }
}

export class TodosState {
  #storage = storageService;
  model = {};

  constructor() {
    const todos = this.#storage.retrieve();
    this.model.todos = todos.map((data) => this.#createTodo(data));
    this.updateVisibility();
    this.calculateCounts();
  }

  #createTodo(data) {
    const todo = new TodoState(this, data);
    return todo.model;
  }

  addTodo(data) {
    const todoModel = this.#createTodo(data);
    this.model.todos.push(todoModel);
    this.handleChanges();
  }

  removeTodo(todoState) {
    const index = this.model.todos.indexOf(todoState.model);
    this.model.todos.splice(index, 1);
    this.handleChanges();
  }

  clearCompleted() {
    const todos = this.model.todos;
    this.model.todos = todos.filter(({ completed }) => !completed);
    this.handleChanges();
  }

  handleChanges() {
    this.updateVisibility();
    this.calculateCounts();
    this.save();
  }

  updateVisibility() {
    this.model.show = this.model.todos.length > 0;
  }

  calculateCounts() {
    const todos = this.model.todos;
    const completed = todos.filter(({ completed }) => completed).length;
    const remaining = todos.length - completed;
    this.model.counts = { completed, remaining };
  }

  save() {
    this.#storage.save(this.model.todos);
  }
}
