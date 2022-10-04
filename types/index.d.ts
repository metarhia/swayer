interface SchemaRef {
  path: string;
  base?: string;
  args?: unknown;
}

type DefaultState = Record<string, unknown>;

type Reaction<State extends DefaultState, Result> = (state: State) => Result;

type SchemaValue<State extends DefaultState> =
  Schema<State>
  | SchemaRef
  | string
  | false
  | null
  | undefined;

type SchemaChild<State extends DefaultState> =
  SchemaValue<State>
  | Reaction<State, SchemaValue<State> | SchemaValue<State>[]>;

type SchemaProps = HTMLInputElement;
type PartialProps = Partial<SchemaProps>;

type Props<State extends DefaultState> = Partial<{
  [P in keyof SchemaProps]: SchemaProps[P] | Reaction<State, SchemaProps[P]>;
}>;

interface Schema<State extends DefaultState> {
  tag: string;
  text?: string | Reaction<State, unknown>;
  styles?: Styles<State> | Reaction<State, CSSPropsValue>;
  props?: Props<State> | Reaction<State, PartialProps> & PartialProps;
  attrs?: Attrs<State> | Reaction<State, Attrs<State>>;
  state?: State;
  methods?: Methods & ThisType<Component<State>>;
  events?: Events & ThisType<Component<State>>;
  channels?: Channels & ThisType<Component<State>>;
  hooks?: Partial<Hooks> & ThisType<Component<State>>;
  children?: SchemaChild<State>[] | Reaction<State, SchemaChild<State>[]>;
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
  emitEvent(name: string, data?): boolean;
  emitMessage(name: string, data?, options?: ChannelOptions): void;
  destroy(): void;
  click(): void;
  focus(): void;
  blur(): void;
}

type CSSPropsValue<State extends DefaultState = DefaultState> = Partial<
  Record<
    keyof CSSStyleDeclaration,
    string | number | Reaction<State, string | number>
  >
>;

type CSSProps<State extends DefaultState> =
  CSSPropsValue<State> | Reaction<State, CSSPropsValue<State>>;

type AttrValue<State extends DefaultState> =
  string | number | boolean | undefined | CSSProps<State>;

interface Attrs<State extends DefaultState> {
  style?: CSSProps<State> | Reaction<State, CSSProps<State>>;
  [attr: string]: AttrValue<State> | Reaction<State, AttrValue<State>>;
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
  destroy(): void | Promise<void>;
}

interface PseudoFunction {
  arg: string;
  rule: PseudoStyles;
}

interface PseudoStyles extends CSSPropsValue {
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
  keyframes: {
    [key: string]: CSSPropsValue;
  };
}

interface Styles<State extends DefaultState> extends PseudoStyles {
  animations?: CssAnimation[];
  compute?: Reaction<State, CSSPropsValue> | Reaction<State, CSSPropsValue>[];
}
