export class TodoModel {
  state = {
    title: '',
    editing: false,
    completed: false,
  };

  constructor(data) {
    this.state = data || this.state;
    this.state.title = (data.title ?? '').trim();
    this.state.editing = data.editing ?? false;
    this.state.completed = data.completed ?? false;
  }

  updateTitle(title) {
    this.state.title = title.trim();
  }

  startEditing() {
    this.state.editing = true;
  }

  endEditing() {
    this.state.editing = false;
  }

  toggleComplete() {
    this.state.completed = !this.state.completed;
  }
}
