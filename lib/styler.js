import SchemaHasher from './hasher.js';
import { camelToKebabCase } from './utils.js';

const PSEUDO_CLASSES = [
  ['first', 'first-of-type'],
  ['last', 'last-of-type'],
  ['hover', 'hover'],
  ['focus', 'focus'],
  ['checked', 'checked'],
  ['active', 'active'],
  ['disabled', 'disabled'],
  ['link', 'link'],
  ['visited', 'visited'],
];

const PSEUDO_ELEMENTS = [
  ['before', 'before'],
  ['after', 'after'],
  ['placeholder', 'placeholder'],
];

const PSEUDO_FUNCTIONS = [
  ['nth', 'nth-of-type'],
  ['not', 'not'],
];

const SYNTHETIC_FEATURES = [
  'animations',
  'compute',
];

const collectSyntheticProps = () => {
  const map = PSEUDO_CLASSES.concat(PSEUDO_ELEMENTS).concat(PSEUDO_FUNCTIONS);
  return Object.keys(Object.fromEntries(map)).concat(SYNTHETIC_FEATURES);
};

export default class Styler {
  static #syntheticProps = collectSyntheticProps();
  #classes = new Set();
  #handleRule;

  constructor(ruleHandler) {
    this.#handleRule = ruleHandler;
  }

  changeStyles(context, prevStyles, curStyles) {
    if (!curStyles) return;
    const { binding, schema } = context;
    const className = this.#makeClass(curStyles, schema.tag);
    const prevHash = SchemaHasher.hashStyles(prevStyles);
    const prevClassName = `swr-${prevHash}`;
    binding.toggleClass(prevClassName, false);
    binding.toggleClass(className, true);
  }

  setStyles(binding, styles) {
    if (!styles || Object.keys(styles).length === 0) return;
    const className = this.#makeClass(styles);
    binding.toggleClass(className, true);
  }

  #makeClass(styles, tag = '') {
    const hash = SchemaHasher.hashStyles(styles);
    const className = `swr-${hash}`;
    const isClassRegistered = this.#classes.has(className);
    if (isClassRegistered) return className;
    const selector = `${tag}.${className}`;
    this.#createPseudo(selector, styles);
    this.#createAnimations(selector, styles);
    this.#createStyleRule(selector, styles);
    this.#classes.add(className);
    return className;
  }

  #createPseudo(selector, styles) {
    this.#createPseudoSelectors(selector, styles, ':');
    this.#createPseudoSelectors(selector, styles, '::');
    this.#createPseudoFunctions(selector, styles);
  }

  #createPseudoSelectors(selector, styles, delimiter) {
    const syntaxMap = delimiter === ':' ? PSEUDO_CLASSES : PSEUDO_ELEMENTS;
    for (const [prop, pseudo] of syntaxMap) {
      const pseudoStyles = styles[prop];
      if (pseudoStyles) {
        const rule = Styler.#createRule(pseudoStyles);
        const pseudoSelector = selector + delimiter + pseudo;
        if (rule) this.#addRule(pseudoSelector, rule);
        this.#createPseudo(pseudoSelector, pseudoStyles);
      }
    }
  }

  #createPseudoFunctions(selector, styles) {
    for (const [prop, pseudoClass] of PSEUDO_FUNCTIONS) {
      const pseudoStyles = styles[prop];
      if (pseudoStyles) {
        const { arg, rule: ruleConfig } = pseudoStyles;
        const pseudoSelector = `${selector}:${pseudoClass}(${arg})`;
        const rule = Styler.#createRule(ruleConfig);
        if (rule) this.#addRule(pseudoSelector, rule);
        this.#createPseudo(pseudoSelector, pseudoStyles);
      }
    }
  }

  #createAnimations(selector, styles) {
    const animations = styles.animations;
    if (!Array.isArray(animations)) return;
    for (const animation of animations) {
      const { name, keyframes } = animation;
      if (!keyframes) continue;
      let keyframesRule = '';
      for (const key in keyframes) {
        const rule = Styler.#createRule(keyframes[key]);
        keyframesRule += `${key} { ${rule} }`;
      }
      this.#addRule(`@keyframes ${name}`, keyframesRule);
    }
  }

  #createStyleRule(selector, styles) {
    const rule = Styler.#createRule(styles);
    this.#addRule(selector, rule);
  }

  #addRule(statement, rule) {
    this.#handleRule(`${statement} { ${rule} }`);
  }

  static #createRule(styles) {
    return Object.entries(styles).reduce((rule, [prop, value]) => {
      if (this.#syntheticProps.includes(prop)) return rule;
      const style = camelToKebabCase(prop);
      return (rule += `${style}: ${value};`);
    }, '');
  }
}
