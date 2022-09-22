// Support Firefox and Safari, used polyfill
// https://www.npmjs.com/package/construct-style-sheets-polyfill
class StylerSheetPolyfill {
  static polyfillUrl =
    'https://unpkg.com/construct-style-sheets-polyfill@3.0.4/dist/adoptedStyleSheets.js';
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
        await import(StylerSheetPolyfill.polyfillUrl);
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

  #createNewAdoptedSheet() {
    const { CSSStyleSheet, document } = this.#webApi;
    const sheet = new CSSStyleSheet();
    document.adoptedStyleSheets = [sheet];
    const rules = this.#cssRulesBuffer;
    while (rules.length > 0) sheet.insertRule(rules.pop());
    this.#polyfillSheet = sheet;
  }
}

// todo implement style transition

export default class Styler {
  static camelCasePattern = /[A-Z]/g;
  static pseudoClassesMap = new Map([
    ['first', 'first-of-type'],
    ['last', 'last-of-type'],
    ['hover', 'hover'],
    ['focus', 'focus'],
    ['checked', 'checked'],
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
    ['placeholder', 'placeholder'],
  ]);
  polyfill;
  #styleMap = new Map();
  // #document;

  #webApi;
  #style;

  constructor(webApi, context) {
    this.#webApi = webApi;
    this.#style = context.parent?.styler.style || this.#createStyle();
  }

  get style() {
    return this.#style;
  }

  // get #styleSheet() {
  //   const sheets = this.#document.adoptedStyleSheets;
  //   if (sheets && sheets[0]) return sheets[0];
  //   return this.polyfill;
  // }

  get #rulesLength() {
    return this.#style.sheet.cssRules.length;
  }

  #createStyle() {
    const doc = this.#webApi.document;
    const style = doc.createElement('style');
    style.id = 'swr-style';
    const existing = doc.querySelector('#swr-style');
    // if (existing) existing.replaceWith(style);
    // else doc.head.append(style);
    if (existing) return existing;
    doc.head.append(style);
    return style;
  }

  createStyles(context) {
    const { tag, styles } = context.schema;
    const elementBinding = context.binding;
    if (!styles) return;
    const sharedStyles = JSON.stringify(styles);
    const sharedClass = this.#styleMap.get(sharedStyles);
    if (sharedClass) return elementBinding.toggleClass(sharedClass, true);
    const className = `sw-${tag}-${elementBinding.id}`;
    const selector = `.${className}`;
    this.#createPseudo(selector, styles);
    this.#createAnimations(selector, styles);
    this.#createStyleRule(selector, styles);
    this.#styleMap.set(sharedStyles, className);
    elementBinding.toggleClass(className, true);
  }

  #createPseudo(selector, styles) {
    this.#createPseudoSelectors(selector, styles, ':');
    this.#createPseudoSelectors(selector, styles, '::');
    this.#createPseudoFunctions(selector, styles);
  }

  #createPseudoSelectors(selector, styles, delimiter) {
    const { pseudoClassesMap, pseudoElementsMap } = Styler;
    const syntaxMap = delimiter === ':' ? pseudoClassesMap : pseudoElementsMap;
    for (const [prop, pseudo] of syntaxMap) {
      const pseudoStyles = styles[prop];
      if (pseudoStyles) {
        const rule = this.#createRule(pseudoStyles);
        const pseudoSelector = selector + delimiter + pseudo;
        if (rule) this.#addRule(pseudoSelector, rule);
        this.#createPseudo(pseudoSelector, pseudoStyles);
      }
    }
  }

  #createPseudoFunctions(selector, styles) {
    for (const [prop, pseudoClass] of Styler.pseudoFunctionsMap) {
      const pseudoStyles = styles[prop];
      if (pseudoStyles) {
        const { arg, rule: ruleConfig } = pseudoStyles;
        const pseudoSelector = `${selector}:${pseudoClass}(${arg})`;
        const rule = this.#createRule(ruleConfig);
        if (rule) this.#addRule(pseudoSelector, rule);
        this.#createPseudo(pseudoSelector, pseudoStyles);
      }
    }
  }

  #createAnimations(selector, styles) {
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

  #createStyleRule(selector, styles) {
    const rule = this.#createRule(styles);
    this.#addRule(selector, rule);
  }

  #addRule(statement, rule) {
    this.#style.sheet.insertRule(`${statement} { ${rule} }`, this.#rulesLength);

    // this.#testSheet = this.#document.getElementById('testSheet');
    // if (!this.#testSheet) {
    //   this.#testSheet = this.#document.createElement('style');
    //   this.#testSheet.id = 'testSheet';
    //   // this.#document.head.append(this.#testSheet);
    // }
    // this.#testSheet.textContent += `${statement} { ${rule} }\n`;
  }

  #createRule(styles) {
    return Object.entries(styles).reduce((rule, [prop, value]) => {
      const style = Styler.#camelToKebabCase(prop);
      return (rule += `${style}: ${value};`);
    }, '');
  }

  static #camelToKebabCase(str) {
    return str.replace(
      Styler.camelCasePattern,
      (letter) => `-${letter.toLowerCase()}`,
    );
  }
}
