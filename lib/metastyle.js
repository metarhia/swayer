// Support Firefox and Safari, used polyfill https://www.npmjs.com/package/construct-style-sheets-polyfill?activeTab=readme
class MetastyleSheetPolyfill {
  static polyfillUrl = 'https://unpkg.com/construct-style-sheets-polyfill@3.0.4/dist/adoptedStyleSheets.js';
  #webApi;
  #cssRulesBuffer = [];
  #polyfillSheet;

  constructor(webApi) {
    this.#webApi = webApi;
  }

  get cssRules() {
    if (this.#polyfillSheet) return this.#polyfillSheet.cssRules;
    return this.#cssRulesBuffer;
  }

  load() {
    const { adoptedStyleSheets, documentElement } = this.#webApi.document;
    if (adoptedStyleSheets) return;
    const callback = async (mutations, observer) => {
      const { type, addedNodes } = mutations[0];
      if (type === 'childList' && addedNodes[0].nodeName === 'BODY') {
        await import(MetastyleSheetPolyfill.polyfillUrl);
        this.#createNewAdoptedSheet();
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(documentElement, { childList: true });
  }

  insertRule(rule, index) {
    const sheets = this.#webApi.document.adoptedStyleSheets;
    if (sheets && sheets[0]) return sheets[0].insertRule(rule, index);
    this.#cssRulesBuffer.push(rule);
  }

  deleteRule() {
    throw new Error('Not implemented in MetastyleSheetPolyfill');
  }

  #createNewAdoptedSheet() {
    const { CSSStyleSheet, document } = this.#webApi;
    const [sheet] = document.adoptedStyleSheets = [new CSSStyleSheet()];
    const rules = this.#cssRulesBuffer;
    while (rules.length > 0) sheet.insertRule(rules.pop());
    this.#polyfillSheet = sheet;
  }
}

export default class Metastyle {
  static camelCasePattern = /[A-Z]/g;
  static pseudoClassesMap = new Map([
    ['first', 'first-of-type'],
    ['last', 'last-of-type'],
    ['hover', 'hover'],
    ['focus', 'focus'],
    ['active', 'active'],
    ['disabled', 'disabled'],
    ['link', 'link'],
    ['visited', 'visited'],
  ]);
  static pseudoFunctionsMap = new Map([
    ['nth', 'nth-of-type'],
    ['not', 'not'],
  ]);
  static pseudoElementsMap = new Map([
    ['before', 'before'],
    ['after', 'after'],
  ]);
  polyfill;
  #styleMap = new Map();
  #document;
  #CSS;

  constructor(webApi) {
    const { CSSStyleSheet, document, CSS } = webApi;
    this.#document = document;
    this.#CSS = CSS;
    const sheets = document.adoptedStyleSheets;
    if (sheets) document.adoptedStyleSheets = [new CSSStyleSheet()];
    else this.polyfill = new MetastyleSheetPolyfill(webApi);
  }

  get #styleSheet() {
    const sheets = this.#document.adoptedStyleSheets;
    if (sheets && sheets[0]) return sheets[0];
    return this.polyfill;
  }

  get #rulesLength() {
    return this.#styleSheet.cssRules.length;
  }

  apply(schema, id) {
    const { tag, attrs, styles } = schema;
    if (!styles) return;
    const sharedStyles = JSON.stringify(styles);
    const sharedClass = this.#styleMap.get(sharedStyles);
    if (sharedClass) {
      attrs.class = sharedClass;
      return;
    }
    const className = `meta-${tag}-${id}`;
    const selector = `.${className}`;
    attrs.class = className;
    this.#applyPseudo(selector, styles);
    this.#applyAnimations(selector, styles);
    this.#applyStyleRule(selector, styles);
    this.#styleMap.set(sharedStyles, className);
  }

  #applyPseudo(selector, styles) {
    this.#applyPseudoSelectors(selector, styles, ':');
    this.#applyPseudoSelectors(selector, styles, '::');
    this.#applyPseudoFunctions(selector, styles);
  }

  #applyPseudoSelectors(selector, styles, delimiter) {
    const { pseudoClassesMap, pseudoElementsMap } = Metastyle;
    const syntaxMap = delimiter === ':' ? pseudoClassesMap : pseudoElementsMap;
    for (const [prop, pseudo] of syntaxMap) {
      const pseudoStyles = styles[prop];
      if (pseudoStyles) {
        const rule = this.#createRule(pseudoStyles);
        const pseudoSelector = selector + delimiter + pseudo;
        if (rule) this.#addRule(pseudoSelector, rule);
        this.#applyPseudo(pseudoSelector, pseudoStyles);
      }
    }
  }

  #applyPseudoFunctions(selector, styles) {
    for (const [prop, pseudoClass] of Metastyle.pseudoFunctionsMap) {
      const pseudoStyles = styles[prop];
      if (pseudoStyles) {
        const { arg, rule: ruleConfig } = pseudoStyles;
        const pseudoSelector = `${selector}:${pseudoClass}(${arg})`;
        const rule = this.#createRule(ruleConfig);
        if (rule) this.#addRule(pseudoSelector, rule);
        this.#applyPseudo(pseudoSelector, pseudoStyles);
      }
    }
  }

  #applyAnimations(selector, styles) {
    const animations = styles.animations;
    if (!Array.isArray(animations)) return;
    for (const animation of animations) {
      const { name, props, keyframes } = animation;
      const anim = props ? `${props} ${name}` : name;
      if (styles.animation) styles.animation += `,${anim}`;
      else styles.animation = anim;
      if (!keyframes) continue;
      let keyframesRule = '';
      for (const key in keyframes) {
        const rule = this.#createRule(keyframes[key]);
        keyframesRule += `${key} { ${rule} }`;
      }
      this.#addRule(`@keyframes ${name}`, keyframesRule);
    }
  }

  #applyStyleRule(selector, styles) {
    const rule = this.#createRule(styles);
    this.#addRule(selector, rule);
  }

  #addRule(statement, rule) {
    this.#styleSheet.insertRule(`${statement} { ${rule} }`, this.#rulesLength);
  }

  #createRule(styles) {
    return Object.entries(styles).reduce(
      (rule, [prop, value]) => {
        const style = Metastyle.#camelToKebabCase(prop);
        const isValidProp = this.#CSS.supports(style, value);
        if (isValidProp) return (rule += `${style}: ${value};`);
        return rule;
      },
      '',
    );
  }

  static #camelToKebabCase(str) {
    return str.replace(
      Metastyle.camelCasePattern,
      (letter) => `-${letter.toLowerCase()}`,
    );
  }
}