interface SchemaRef {
  path: string;
  base?: string;
  args?: unknown;
}

interface ComponentConfig {
  // moduleUrl?: string;
  macroTaskSize?: number;
}

type DefaultState = Record<string, unknown>;

type SchemaChild<State extends DefaultState> =
  Schema<State>
  | SchemaRef
  | string
  | false
  | null
  | undefined;

interface Schema<State extends DefaultState> {
  tag: string;
  config?: ComponentConfig;
  text?: string;
  styles?: Styles;
  props?: Partial<HTMLInputElement>;
  attrs?: Attrs;
  state?: State;
  methods?: Methods & ThisType<Component<State>>;
  events?: Events & ThisType<Component<State>>;
  channels?: Channels & ThisType<Component<State>>;
  hooks?: Partial<Hooks> & ThisType<Component<State>>;
  children?: SchemaChild<State>[];
}

type OmittedArrayMethods<State extends DefaultState> =
     Omit<Component<State>[], 'push' | 'pop' | 'splice'>;

interface ComponentChildren<State extends DefaultState>
          extends OmittedArrayMethods<State> {
  push(...schemas: SchemaChild<State>[]): Promise<Component<State>[]>;
  pop(): Component<State>;
  splice(
    start: number,
    deleteCount: number,
    ...replacements: SchemaChild<State>[]
  ): Promise<Component<State>[]>;
}

interface ChannelOptions {
  scope?: string | string[];
}

interface Component<State extends DefaultState>
          extends Omit<Required<Schema<State>>, 'children'> {
  original: Schema<State>;
  children: ComponentChildren<State>;
  emitCustomEvent(name: string, data?): boolean;
  emitMessage(name: string, data?, options?: ChannelOptions): void;
  destroy(): void;
  click(): void;
  focus(): void;
  blur(): void;
}

type CSSProps = Partial<Record<keyof CSSStyleDeclaration, string | number>>;

interface Attrs {
  style?: CSSProps;
  [attr: string]: string | number | boolean | undefined | CSSProps;
}

interface Methods {
  [method: string]: (...args) => void;
}

interface Events {
  [event: string]: (event) => void;
}

interface Channels {
  [channel: string]: (data?) => void;
}

interface Hooks {
  init(): void | Promise<void>;
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
