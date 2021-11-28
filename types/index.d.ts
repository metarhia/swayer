interface Metacomponent {
  tag: string;
  text?: string;
  styles?: Styles;
  attrs?: Attrs;
  state?: any;
  events?: Events;
  hooks?: Hooks;
  children?: Array<Metacomponent | MetacomponentConfig>;
}

interface MetacomponentApi {
  triggerCustomEvent(name: string, data?: any): boolean;
}

interface MetacomponentConfig {
  path: string;
  base?: string;
  args?: Parameters<any>;
}

type CSSProps = Partial<CSSStyleDeclaration>;

interface Attrs {
  style?: CSSProps;
  [attr: string]: string | number | boolean | undefined | CSSProps;
}

type MetacomponentInstance = Required<Metacomponent & MetacomponentApi>;

interface Events {
  [event: string]: (this: MetacomponentInstance, data?: any) => void;
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
