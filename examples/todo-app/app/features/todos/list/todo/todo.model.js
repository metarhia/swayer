export class TodoModel {
  #todosModel;
  /** @type {TodoState} */
  state = {
    title: '',
    editing: false,
    completed: false,
  };

  constructor(todosModel, data) {
    this.#todosModel = todosModel;
    this.state = data || this.state;
    this.state.title = (data.title ?? '').trim();
    this.state.editing = data.editing ?? false;
    this.state.completed = data.completed ?? false;
  }

  remove() {
    this.#todosModel.removeTodo(this);
  }

  updateTitle(title) {
    this.state.title = title.trim();
    this.#todosModel.save();
  }

  startEditing() {
    this.state.editing = true;
    this.#todosModel.save();
  }

  endEditing() {
    this.state.editing = false;
    this.#todosModel.save();
  }

  toggleComplete() {
    this.state.completed = !this.state.completed;
    this.#todosModel.calculateCounts();
    this.#todosModel.save();
  }
}
