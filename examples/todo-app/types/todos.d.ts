interface TodoState {
  title: string;
  editing?: boolean;
  completed?: boolean;
}

declare class TodoModel implements Model {
  state: TodoState;
  remove(): void;
  updateTitle(title: string): void;
  startEditing(): void;
  endEditing(): void;
  toggleComplete(): void;
}

interface TodosState {
  show: boolean;
  todos: TodoState[];
  counts: {
    completed: number;
    remaining: number;
  },
}

declare class TodosModel implements Model {
  state: TodosState;
  addTodo(title: string): void;
  removeTodo(todoModel: TodoModel): void;
  clearCompleted(): void;
  calculateCounts(): void;
  save(): void;
}
