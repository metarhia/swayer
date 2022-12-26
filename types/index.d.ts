// eslint-disable-next-line
type UserObject = Record<string, any>;

interface SchemaRef {
  path: string;
  input?: UserObject;
}

interface Route<TModel extends Model> {
  pattern: string;
  component: SchemaValue<TModel> | RouteComponentResolver<TModel>;
}

interface Routes<TModel extends Model> {
  routes: Route<TModel>[];
}

interface RouteResolution {
  params: Record<string, string>;
}

interface Router {
  go(path: string): void;
}

interface Model<State = UserObject> extends UserObject {
  state: State;
}

type RouteComponentResolver<TModel extends Model> = (
  resolution: RouteResolution
) => SchemaValue<TModel> | Promise<SchemaValue<TModel>>;

type BasicPrimitives = string | boolean | number | bigint | symbol;

type NullishPrimitives = null | undefined;

type Reaction<State, Result> = (state: State) => Result;

type SchemaValue<TModel extends Model> = Schema<TModel>
  | SchemaRef
  | Routes<TModel>
  | BasicPrimitives
  | NullishPrimitives;

type SchemaChild<TModel extends Model> = SchemaValue<TModel>
  | Reaction<TModel['state'], SchemaValue<TModel> | SchemaValue<TModel>[]>;

type SchemaProps = HTMLInputElement;

type Props<State> = Partial<{
  [P in keyof SchemaProps]: SchemaProps[P] | Reaction<State, SchemaProps[P]>;
}>;

interface Schema<TModel extends Model, State = TModel['state']> {
  tag: string;
  namespaces?: Record<string, string>,
  text?: BasicPrimitives | Reaction<State, BasicPrimitives>;
  styles?: Styles<State> | Reaction<State, CSSPropsValue>;
  props?: Props<State>;
  attrs?: Attrs<State> | Reaction<State, Attrs<State>>;
  model?: TModel;
  methods?: Methods & ThisType<Component<TModel>>;
  events?: Events & ThisType<Component<TModel>>;
  channels?: Channels & ThisType<Component<TModel>>;
  hooks?: Partial<Hooks> & ThisType<Component<TModel>>;
  children?: SchemaChild<TModel>[] | Reaction<State, SchemaChild<TModel>[]>;
}

interface ChannelOptions {
  scope?: string | string[];
}

interface Component<TModel extends Model>
          extends Omit<Required<Schema<TModel>>, 'children'> {
  isServer: boolean;
  isBrowser: boolean;
  moduleUrl: string;
  router: Router;
  emitEvent(name: string, data?): boolean;
  emitMessage(name: string, data?, options?: ChannelOptions): void;
  click(): void;
  focus(): void;
  blur(): void;
}

type CSSPropsValue<State = UserObject> = Partial<
  Record<
    keyof CSSStyleDeclaration,
    string | number | Reaction<State, string | number>
  >
>;

type CSSProps<State> =
  CSSPropsValue<State> | Reaction<State, CSSPropsValue<State>>;

type AttrValue<State> = BasicPrimitives | NullishPrimitives | CSSProps<State>;

interface Attrs<State> {
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

interface Styles<State> extends PseudoStyles {
  animations?: CssAnimation[];
  compute?: Reaction<State, CSSPropsValue> | Reaction<State, CSSPropsValue>[];
}
