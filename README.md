# Swayer - schema based frontend framework 👀

[![npm version](https://img.shields.io/npm/v/swayer)](https://www.npmjs.com/package/swayer)
[![npm downloads/month](https://img.shields.io/npm/dm/swayer.svg)](https://www.npmjs.com/package/swayer)
[![npm downloads](https://img.shields.io/npm/dt/swayer.svg)](https://www.npmjs.com/package/swayer)
[![snyk](https://snyk.io/test/github/metarhia/swayer/badge.svg)](https://snyk.io/test/github/metarhia/swayer)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/metarhia/swayer/blob/main/LICENSE)

**UI web framework** for controllable and low overhead development.

## Description

Pure JavaScript framework, which enables **plain objects to describe document
structure, styling and behavior**. Swayer developers provide initial data to be
rendered and get **dynamic components** for further management. This instrument
is provided for **low-level development** and delivering fully **declarative
specific DDLs** describing
**application domains**.

#### Why not to stick with modified HTML like JSX?

While HTML syntax is really well known - it was created for describing static
web documents, not interactive apps. In any case we have to create abstractions
to make web page dynamic, so we use plain objects with the full power of
JavaScript to create DOM tree with almost no overhead in the fastest way.

#### Why not to stick with CSS preprocessors like Stylus or Sass?

You simply don't need to use different CSS-like syntax with Swayer. JavaScript
is more powerful and standardized language than any other style preprocessors.
Moreover, Swayer provides extended standard style declaration for convenience
and brings selector abstraction, so you can just share or toggle styles as a
simple JavaScript object.

**Important: Do not assume HTML or CSS to be legacy languages!**<br>
Swayer compiles application down to the pure HTML and CSS while making it
consistent with JavaScript.

## Features:

- Pure JavaScript everywhere
- Fast asynchronous rendering
- No need to use HTML/CSS preprocessors
- No 3rd party dependencies
- Declarative schema based components
- Configurable styles and animations
- Inline/preload/lazy component loading
- Module encapsulation
- Framework API injection
- Reflective component features
- Local state and methods
- System and custom bubbling events
- Scoped intercomponent messaging
- Component lifecycle hooks

## Quick start

- See
  online [Todo Application demo](https://metarhia.github.io/swayer/examples/todo-app/)
- Play with [examples](https://github.com/metarhia/swayer/tree/main/examples) to
  investigate how it works

Swayer component
example: [examples/todo-app/app/features/todo/todo.component.js](https://github.com/metarhia/swayer/blob/main/examples/todo-app/app/features/todo/todo.component.js)

```js
/** @returns {Schema} */
export default () => ({
  tag: 'section',
  meta: import.meta,
  styles: todoSectionStyle(),
  state: {
    isMainAdded: false,
  },
  methods: {
    addMain() {
      this.children.push(createMain(), createFooter());
      this.state.isMainAdded = true;
    },
    removeMain() {
      this.children.splice(1, 2);
      this.state.isMainAdded = false;
    },
    updateRemaining() {
      const footer = createFooter();
      this.children.splice(2, 1, footer);
    },
    addTodo(todo) {
      const scope = './main/main.component';
      this.emitMessage('addTodoChannel', todo, { scope });
    },
  },
  events: {
    addTodoEvent({ detail: todo }) {
      if (this.state.isMainAdded) this.methods.updateRemaining();
      else this.methods.addMain();
      this.methods.addTodo(todo);
    },
    todoChangeEvent() {
      if (todoStore.todos.length > 0) this.methods.updateRemaining();
      else this.methods.removeMain();
    },
  },
  hooks: {
    init() {
      if (todoStore.todos.length > 0) this.methods.addMain();
    },
  },
  children: [{ path: './header/header.component', base: import.meta.url }],
});
```

## Swayer documentation

### 1. Terminology

- **Developer** - you.
- **Framework** - Swayer framework.
- **Schema** - an object partially implementing component property interface.
  Includes initial data provided by a developer.
  - **Initial data** - data set associated with corresponding html node to be
    rendered.
  - **Schema config** - an object describing configuration data for lazy
    loaded schema.
  - **Lazy schema** - a schema loaded from a different module on demand.
- **Component** - an object instantiated by the framework using schema. Provides
  access to component API for developer.
  - **Children** - an object extending Array class. Provides methods for
    updating component children as a part of API.
  - **API** - a set of properties and methods to help developer with component
    management.
  - **Hook** - a component lifecycle handler.
- **Intercomponent messaging** - a way of organizing data flow between different
  components based on channels feature.
  - **Channel** - a pub/sub entity, that provides a name for scoped data
    emission and subscription based on event emitter.
- **Event management** - a way of organizing children-to-parent data flow based
  on native bubbling DOM events.
- **Reflection** - a technique of metaprogramming. Enables instant data updates
  of underlying DOM while changing component properties.
- **Styles** - an object extending native CSSStyleDeclaration interface. Enables
  component styling by abstracting CSS selectors and providing convenient
  properties for style management.

### 2. Startup

Application starts by serving static files from the app folder.<br>
Entry point: **index.html** - a single piece of html in the whole app.

```html
<!DOCTYPE html>
<script async type="module" src="./app/main.js"></script>
```

Bootstrap point: **app/main.js**<br>
Import bootstrap function from Swayer package and pass a schema or schema config
object:

```js
bootstrap({
  path: './pages/index.component',
  base: import.meta.url,
});
```

Important: you have to bootstrap with **html component** to be able to manage
components like title or meta.

### 3. Swayer component system

Basically all schemas in Swayer are converted into components during
runtime. These components represent **N-ary tree data structure** and are
traversed with
**Depth first preorder tree traversal algorithm**. With some performance
optimizations this approach delivers **fast asynchronous rendering** for best
user experience.
<br><br>
As the application grows it becomes hard to manage all component schemas in a
single file. To address this issue Swayer uses **ES6 standard modules** to separate
application parts and load them on demand.

- **Schema config** is used to lazily load schema and pass input arguments.
  <br><br>

  - Schema config declaration syntax:
    ```ts
    interface SchemaConfig {
      path: string; // absolute or relative path to module
      base?: string; // module url, usually import.meta.url, mandatory only if relative path is used
      args?: any; // optional arguments for component factory
    }
    ```
  - Schema config usage examples:
    ```js
    {
      path: '/app/features/header/header.component';
    }
    ```
    ```js
    {
      path: './header/header.component.js', // skipping .js extension is available
      base: import.meta.url,
      args: { title: 'Header title' },
    }
    ```
    ```js
    {
      path: '/app/features/header/header.component',
      args: 'Header title',
    }
    ```
    <br>

- **Schema factory** is used to construct lazily loaded schemas with input
  arguments. It should be declared in a module as a default export. Then it will be
  available for sharing with other components.
  <br><br>

  - Schema factory declaration syntax:
    ```js
    export default (args: any) => Schema;
    ```
  - Schema factory usage examples:
    ```js
    export default () => ({
      tag: 'h1',
      text: 'Here is my own title',
    });
    ```
    ```js
    export default ({ title }) => ({
      tag: 'h1',
      text: title,
    });
    ```
    <br>

- **Tag** is an HTML element name - the simplest possible schema.
  <br><br>

  - Tag declaration syntax:
    ```js
    tag: string; // any HTML element name
    ```
  - Tag usage example:
    ```js
    {
      tag: 'div';
    }
    ```
    <br>

- **Meta** is a configuration object for the component being created. You can
  use `import.meta`
  standard metadata object to pass some instructions to Swayer component. There
  is a **module url** declared inside module metadata by default. At the moment
  it is only used by channels feature, but it can be extended with other options
  in the future.
  <br><br>

  - Meta declaration syntax:
    ```js
    meta: ComponentMeta; // see types/index.d.ts for type info
    ```
  - Meta usage example:
    ```js
    {
      tag: 'div',
      meta: import.meta,
    }
    ```
    <br>

- **Text** property corresponds to element's text node.
  <br><br>

  - Text declaration syntax:
    ```ts
    text: string;
    ```
  - Text usage example:
    ```js
    {
      tag: 'button',
      text: 'Click me',
    }
    ```
    <br>

- **Children** include schemas, that belong to particular parent schema. Such
  approach is dictated by the tree-like nature of any web document. This
  extended array can hold **schema**, which is declared inside the same module,
  or **schema config** containing the path to the module with schema.
  <br><br>

  - Children declaration syntax:
    ```js
    children: ComponentChildren<Schema>;
    ```
  - Children usage examples:
    ```js
    {
      tag: 'div'
      children: [
        { tag: 'span', text: 'Hello ' },
        { tag: 'span', text: 'world' },
      ],
    }
    ```
    ```js
    {
      tag: 'div'
      children: [
        { path: '/absolute/path/to/hello.component' },
        {
          path: './relative/path/to/world.component',
          base: import.meta.url,
          args: { title: 'A simple title' },
        },
      ],
    }
    ```
    <br>

- **Attrs** object corresponds to a set of element's attributes.
  <br><br>
  - Attrs declaration syntax:
    ```ts
    interface Attrs {
      // key-value attribute, see types/index.d.ts for more type info
      attrName: string;
    }
    ```
  - Attrs usage example:
    ```js
    {
      tag: 'input',
      attrs: {
        name: 'age',
        type: 'text',
      },
    }
    ```
    <br>
- **Props** object corresponds to a set of element's properties.
  <br><br>

  - Props declaration syntax:
    ```ts
    interface Props {
      // key-value property, see types/index.d.ts for more type info
      propName: string;
    }
    ```
  - Props usage example:
    ```js
    {
      tag: 'input',
      props: {
        value: 'Initial input value',
      },
    }
    ```
    <br>

- **State** is a custom object, where developer should store component related
  data.
  <br><br>

  - State declaration syntax:
    ```ts
    state: object;
    ```
  - State usage example:
    ```js
    {
      tag: 'button',
      state: {
        clickCounter: 0,
      },
    }
    ```
    <br>

- **Methods** are used to share some UI related code between listeners,
  subscribers and hooks.
  <br><br>
  - Methods declaration syntax:
    ```ts
    interface Methods {
      methodName(args: any): any;
    }
    ```
  - Method usage example:
    ```js
    {
      tag: 'form',
      methods: {
        prepareData(data) {
          // `this` instance is a reference to component instance
          // do something with data
        },
      },
    }
    ```
    <br>
- **Events** are used to listen to system or synthetic DOM events. There is a
  native event mechanism used under the hood, so it's good to leverage
  **event delegation** for bubbling events. Common usage is reacting for user
  actions and gathering user information. Additionally, you can transfer data to
  parent components with custom events, what is a bit simpler than using
  channels.
  <br><br>
  - Listeners declaration syntax:
    ```ts
    interface Events {
      eventName(event: Event): void;
    }
    ```
  - Listeners usage example:
    ```js
    {
      tag: 'input',
      events: {
        // event name matches any system events like click, mouseover, etc
        input(event) {
          // `this` instance is a reference to component instance
          // do something with event
        },
      },
    }
    ```
    ```js
    {
      tag: 'ul',
      events: {
        // event name matches emitted custom event name
        removeTodoEvent({ detail: todo }) {
          // `this` instance is a reference to component instance
          // do something with todo data
        },
      },
    }
    ```
  - Custom event emission declaration syntax:
    ```ts
    // component API
    emitCustomEvent(name: string, data?: any): boolean;
    ```
  - Custom event emission usage example:
    ```js
    this.emitCustomEvent('removeTodoEvent', todo);
    ```
    <br>
- **Channels** feature implements **pub/sub** communication pattern and is used
  for **intercomponent messaging**. The implementation leverages **EventEmitter**
  under the hood to manage subscriptions. This is a powerful way of creating data
  flow between components whenever they are located in the project. To prevent
  channel name conflicts, what is highly possible in big apps, a sender has to
  provide a **scope** of subscribers, so that only selected components receive
  emitted messages.<br><br>
  **Important**: you have to add **{ meta: import.meta }** into schema if using
  channels.
  <br><br>

  - Subscribers declaration syntax:
    ```ts
    interface Channels {
      channelName(dataMessage: any): void;
    }
    ```
  - Subscribers usage example:
    ```js
    {
      tag: 'form',
      meta: import.meta,
      channels: {
        // channel name matches developer defined name on emission
        addTodoChannel(todo) {
          // `this` instance is a reference to component instance
          // do something with todo data
        },
      },
    }
    ```
  - Message emission declaration syntax:
    ```ts
    // component API
    emitMessage(name: string, data?: any, options?: ChannelOptions): void;
    ```
    ```ts
    // Component API
    interface MessageOptions {
      // path or array of paths to folder or module
      // defaults to current module
      scope?: string | string[];
    }
    ```
  - Message emission usage examples:
    ```js
    // subsribers declared only in the same module will receive todo message
    this.emitMessage('addTodoChannel', { todo });
    ```
    ```js
    // subsribers declared only in main.component.js module will receive todo message
    const scope = './main/main.component';
    this.emitMessage('addTodoChannel', { todo }, { scope });
    ```
    ```js
    // subsribers declared in all modules under main folder will receive todo message
    const scope = '/app/main';
    this.emitMessage('addTodoChannel', { todo }, { scope });
    ```
    ```js
    // subsribers declared in header and footer modules will receive todo message
    const scope = ['./header/header.component', './footer/footer.component'];
    this.emitMessage('addTodoChannel', { todo }, { scope });
    ```

- **Hooks** are the special component handlers. They are typically used to run
  code at some point of component lifecycle. For example, it's possible to
  initialize some data when component and its children are created and ready to
  be managed. Right now **init** hook is available.
  <br><br>
  - Hooks declaration syntax:
    ```ts
    interface Hooks {
      init(): void;
    }
    ```
  - Hooks usage example:
    ```js
    {
      tag: 'form',
      hooks: {
        init() {
          // `this` instance is a reference to component instance
          // run initialization code
        },
      },
    }
    ```

### 4. Component styling

Styles in Swayer are simple JavaScript objects extending **CSSStyleDeclaration**
standard interface. All CSS properties are available in camelCase. It's possible
to add **inline styles via attrs.style** attribute or create **CSSStyleSheets**.
Swayer extends styling syntax by adding intuitive properties like **hover** as
it would be another set of CSS. Such approach enables **CSS selector
abstraction**, so that developer's cognitive work is reduced. Pseudo-classes,
pseudo-elements and animations are implemented with this abstraction.

Styles declaration syntax see in **types/index.d.ts**.

Styles usage examples:

- Inline style (not preferred):
  ```js
  {
    tag: 'p',
    attrs: {
      style: {
        // these props will be inlined
        fontSize: '14px',
        color: 'red',
      },
    },
  }
  ```
- CSS style properties:
  ```js
  {
    tag: 'p',
    styles: {
      // simply add some CSS properties
      fontSize: '14px',
      color: 'red',
    },
  }
  ```
- Pseudo classes/elements:
  ```js
  {
    tag: 'p',
    styles: {
      transition: 'backgroundColor 0.2s ease',
      // make this component blue on hover
      hover: {
        backgroundColor: 'blue',
      },
      // make the first-of-type text red
      first: {
        color: 'red',
      },
    },
  }
  ```
  ```js
  {
    tag: 'p',
    styles: {
      color: 'red',
      // make the first-of-type blue on hover
      first: {
        transition: 'backgroundColor 0.2s ease',
        hover: {
          backgroundColor: 'blue',
        },
      },
    },
  }
  ```
  ```js
  {
    tag: 'p',
    styles: {
      position: 'relative',
      // add before pseudo-element
      before: {
        content: `''`,
        position: 'absolute',
        right: '0',
      },
    },
  }
  ```
- Functional pseudo-classes:
  ```js
  {
    tag: 'p',
    styles: {
      // apply style rule equivalently to nth-of-type(2n)
      nth: {
        arg: '2n',
        rule: {
          borderBottom: '1px solid red',
          color: 'red',
        },
      },
    },
  }
  ```
- Animations:
  ```js
  {
    tag: 'div',
    styles: {
      // create multiple animations and apply them to component
      animations: [
        {
          name: 'fadeIn',
          props: 'linear 3s',
          keyframes: {
            'from': {
              opacity: 0,
            },
            '50%': {
              opacity: 0.5,
            },
            'to': {
              opacity: 1,
            },
          },
        },
        {
          name: 'fadeOut',
          props: 'linear 3s',
          keyframes: {
            from: {
              opacity: 1,
            },
            to: {
              opacity: 0,
            },
          },
        },
      ],
    },
  }
  ```
  ```js
  {
    tag: 'p',
    styles: {
      // apply existing animations to component
      animations: [
        { name: 'fadeIn' },
        { name: 'fadeOut', props: 'ease-out 2s' },
      ],
    },
  }
  ```

### 5. Component reflection

Component properties are meant to be **live**. This behavior makes updates to be
automatically applied to underlying HTML elements. At the moment reflection is
supported for the following features:

- Text
- Attrs, including inline style
- Props
- Events

Reflection for other features is going to be added in future releases.

### 6. Component API

Swayer creates some instruments for component management enabling dynamic
application development. While bootstrapping a component Swayer **enriches
context** used in developer-defined methods, events, channels and hooks.
Only **object method** declaration syntax is applicable as it's impossible
to change the context of arrow functions. Basically **this** reference is
a reference to a component, not schema. Right now the list of component API
is the following:

- Properties:
  - `original` - reference to original schema.
    <br><br>
- Methods:
  - `emitCustomEvent(name: string, data?: any): boolean` - emits a synthetic
    DOM event bubbling up through the component hierarchy, see Events section
    for more details. Returns the result of
    native `dispatchEvent(event: Event): boolean`
  - `emitMessage(name: string, data?: any, options?: ChannelOptions): void` -
    emits a data message to the channel by name. See Channels section for more
    details. Returns void.
  - `destroy(): void` - remove component itself with its children and release memory.
  - `click(): void` - native click method.
  - `focus(): void` - native focus method.
  - `blur(): void` - native blur method.
    <br><br>
- Children methods:
  - `push(...schemas: Schema[]): Promise<Component[]>` - adds a new component
    to the end of children.
  - `pop(): Component` - removes the last child component.
  - `splice(start: number, deleteCount: number, ...replacements: Schema[]): Promise<Component[]>` -
    deletes or replaces several component children.

See types/index.d.ts for more type information. This API will be extended with
new properties and methods in future releases.

### 7. Application architecture and domain code

Swayer does not provide any restrictions of creating domain logics, but it's
very likely that the framework will implement some architectural best practises.
At the moment it's recommended to design apps with **feature components and
separated domain code**. Conventionally, developers should use only UI related
code in components and business code in separate modules using class instances
as singletons.
See [examples](https://github.com/metarhia/swayer/tree/main/examples) to learn
how it works.

## Browser compatibility

- Chromium based browsers (v84+)
- Firefox (v90+)
- Safari (v15+)
- Opera (v70+)

## License & Contributors

Copyright (c) 2021 Metarhia contributors.<br>
See GitHub for
full [contributors list](https://github.com/metarhia/swayer/graphs/contributors)
.<br>
Swayer framework is [MIT licensed](./LICENSE).<br>
Project coordinator: &lt;r.ogiyevich@gmail.com&gt;
