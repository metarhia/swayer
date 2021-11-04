interface Metacomponent {
  tag: string;
  text?: string;
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

interface Attrs {
  style?: Partial<CSSStyleDeclaration>;
  [attr: string]:
    | string
    | number
    | boolean
    | undefined
    | Partial<CSSStyleDeclaration>;
}

type MetacomponentInstance = Required<Metacomponent & MetacomponentApi>;

interface Events {
  [event: string]: (this: MetacomponentInstance, data?: any) => void;
}

interface Hooks {
  init(this: MetacomponentInstance): void;
}
