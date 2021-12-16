interface Metacomponent {
  tag: string;
  meta?: ImportMeta;
  text?: string;
  styles?: Styles;
  props?: Partial<HTMLInputElement>;
  attrs?: Attrs;
  state?: any;
  methods?: Methods;
  events?: Events;
  channels?: Channels;
  hooks?: Hooks;
  children?: Array<
    Metacomponent | MetacomponentConfig | false | null | undefined
  >;
}

interface ImportMeta {
  url: string;
}

interface ChannelOptions {
  scope?: string | string[];
}

interface MetacomponentApi {
  emitCustomEvent(name: string, data?: any): boolean;
  emitMessage(name: string, data?: any, options?: ChannelOptions): boolean;
  click(): void;
  focus(): void;
  blur(): void;
}

interface MetacomponentConfig {
  path: string;
  base?: string;
  args?: Parameters<any>;
}

type CSSProps = Partial<Record<keyof CSSStyleDeclaration, string | number>>;

interface Attrs {
  style?: CSSProps;
  [attr: string]: string | number | boolean | undefined | CSSProps;
}

type MetacomponentInstance = Required<Metacomponent & MetacomponentApi>;

interface Methods {
  [method: string]: (this: MetacomponentInstance, ...args) => any;
}

interface Events {
  [event: string]: (this: MetacomponentInstance, event?: any) => void;
}

interface Channels {
  [channel: string]: (this: MetacomponentInstance, data?: any) => void;
}

interface Hooks {
  init(this: MetacomponentInstance): void;
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
