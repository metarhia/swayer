interface Schema {
  tag: string;
  meta?: ComponentMeta;
  text?: string;
  styles?: Styles;
  props?: Partial<HTMLInputElement>;
  attrs?: Attrs;
  state?: any;
  methods?: Methods;
  events?: Events;
  channels?: Channels;
  hooks?: Hooks;
  children?: ComponentChildren<
    Schema | SchemaConfig | false | null | undefined
  >;
}

interface SchemaConfig {
  path: string;
  base?: string;
  args?: Parameters<any>;
}

interface ComponentMeta extends ImportMeta {
  url: string;
}

interface ChannelOptions {
  scope?: string | string[];
}

interface ComponentAPI {
  original: Schema;
  emitCustomEvent(name: string, data?: any): boolean;
  emitMessage(name: string, data?: any, options?: ChannelOptions): void;
  click(): void;
  focus(): void;
  blur(): void;
}

// @ts-ignore
interface ComponentChildren<T> extends Array<T> {
  push(...schemas: T[]): Promise<Component[]>;
  pop(): Component;
  splice(
    start: number,
    deleteCount: number,
    ...replacements: T[]
  ): Promise<Component[]>;
}

type CSSProps = Partial<Record<keyof CSSStyleDeclaration, string | number>>;

interface Attrs {
  style?: CSSProps;
  [attr: string]: string | number | boolean | undefined | CSSProps;
}

type Component = Required<Schema & ComponentAPI>;

interface Methods {
  [method: string]: (this: Component, ...args) => any;
}

interface Events {
  [event: string]: (this: Component, event?: any) => void;
}

interface Channels {
  [channel: string]: (this: Component, data?: any) => void;
}

interface Hooks {
  init(this: Component): void;
}

interface PseudoFunction {
  arg: string;
  rule: PseudoStyles;
}

interface PseudoStyles extends CSSProps {
  hover?: PseudoStyles;
  focus?: PseudoStyles;
  checked?: PseudoStyles;
  active?: PseudoStyles;
  disabled?: PseudoStyles;
  link?: PseudoStyles;
  visited?: PseudoStyles;
  first?: PseudoStyles;
  last?: PseudoStyles;
  before?: PseudoStyles;
  after?: PseudoStyles;
  placeholder?: PseudoStyles;
  nth?: PseudoFunction;
  not?: PseudoFunction;
}

interface CssAnimation {
  name: string;
  props: string;
  keyframes: {
    [key: string]: CSSProps;
  };
}

interface Styles extends PseudoStyles {
  animations?: CssAnimation[];
}
