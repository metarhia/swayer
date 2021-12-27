interface SchemaConfig {
  path: string;
  base?: string;
  args?: any;
}

interface ComponentMeta extends ImportMeta {
  url: string;
}

type SchemaChildren = Array<Schema | SchemaConfig | false | null | undefined>;

interface Schema {
  tag: string;
  meta?: ComponentMeta;
  text?: string;
  styles?: Styles;
  props?: Partial<HTMLInputElement>;
  attrs?: Attrs;
  state?: any;
  methods?: Methods & ThisType<Component>;
  events?: Events & ThisType<Component>;
  channels?: Channels & ThisType<Component>;
  hooks?: Hooks & ThisType<Component>;
  children?: SchemaChildren;
}

interface Component extends Omit<Required<Schema>, 'children'> {
  original: Schema;
  children: ComponentChildren;
  emitCustomEvent(name: string, data?: any): boolean;
  emitMessage(name: string, data?: any, options?: ChannelOptions): void;
  destroy(): void;
  click(): void;
  focus(): void;
  blur(): void;
}

interface ComponentChildren
  extends Omit<Component[], 'push' | 'pop' | 'splice'> {
  push(...schemas: SchemaChildren): Promise<Component[]>;
  pop(): Component;
  splice(
    start: number,
    deleteCount: number,
    ...replacements: SchemaChildren
  ): Promise<Component[]>;
}

interface ChannelOptions {
  scope?: string | string[];
}

type CSSProps = Partial<Record<keyof CSSStyleDeclaration, string | number>>;

interface Attrs {
  style?: CSSProps;
  [attr: string]: string | number | boolean | undefined | CSSProps;
}

interface Methods {
  [method: string]: (...args: any[]) => any;
}

interface Events {
  [event: string]: (event?: any) => void;
}

interface Channels {
  [channel: string]: (data?: any) => void;
}

interface Hooks {
  init(): void;
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
