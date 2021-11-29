export class MetacomponentsError extends Error {
  constructor(message, name = 'MetacomponentsError') {
    super(message);
    this.name = name;
  }
}

export class BadRootSchemaError extends MetacomponentsError {
  name = BadRootSchemaError.name;
  constructor(tag) {
    super(`Root schema is not html, got ${tag}`);
  }
}

export class BadInputSchemaError extends MetacomponentsError {
  name = BadInputSchemaError.name;
  constructor(input) {
    super(`No tag or path found, got ${JSON.stringify(input)}`);
  }
}
