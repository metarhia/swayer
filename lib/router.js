import Reporter from './reporter.js';
import { is } from './utils.js';

const PATH_DELIMITER = '/';
const EMPTY_PATTERN = '';
const PARAM_PATTERN = ':';
const ANY_PATTERN = '**';

const patternToSegments = (pattern) => pattern.split(PATH_DELIMITER);

const pathToSegments = (path) =>
  path.split(PATH_DELIMITER).filter((seg) => seg !== '');

export default class Router {
  #context;
  #routes;
  #path;
  #pathSegments;
  #isRoutingFailed = false;
  children = [];
  reload;

  constructor(context, routes, reload, initialPath = '') {
    this.#context = context;
    this.#routes = routes;
    this.reload = reload;
    this.path = this.parent?.path || initialPath;
    this.parent?.children.push(this);
  }

  get parent() {
    return this.#context?.parent?.router;
  }

  get path() {
    return this.#pathSegments.join(PATH_DELIMITER);
  }

  set path(path) {
    this.#path = path;
    this.#pathSegments = pathToSegments(path);
  }

  // todo add navigation

  go(path) {
    // todo webApi
    history.pushState({}, '', path);
    if (path.startsWith(PATH_DELIMITER)) {
      let root = this;
      while (root.parent) root = root.parent;
      root.path = path;
      root.reload(path);
    }
  }

  matchSchema() {
    const route = this.#findRoute();
    if (route) {
      const { pattern, component, params } = route;
      const routeLength = pathToSegments(pattern).length;
      this.#pathSegments = this.#pathSegments.slice(routeLength);
      if (is.fn(component)) return component({ params });
      return component;
    }
    this.#isRoutingFailed = true;
    this.#pathSegments = pathToSegments(this.#path);
    this.#reportNotFound();
  }

  finishRouting() {
    const noChildren = this.children.length === 0;
    const hasSegments = this.#pathSegments.length > 0;
    const isNotFound = noChildren && hasSegments && !this.#isRoutingFailed;
    this.#isRoutingFailed = false;
    if (isNotFound) {
      const anyRoute = hasSegments
        ? this.#routes.find((route) => route.pattern === ANY_PATTERN)
        : null;
      if (anyRoute) this.reload(anyRoute.component);
      else this.#reportNotFound();
    }
  }

  #findRoute() {
    const params = {};
    let match;
    let maxScore = 0;
    for (const route of this.#routes) {
      const routeSegments = patternToSegments(route.pattern);
      const routeLen = routeSegments.length;
      const pathLen = this.#pathSegments.length;
      if (pathLen > 0 && routeLen > pathLen) continue;
      let score = 0;
      for (let i = 0; i < routeLen; ++i) {
        const routeSegment = routeSegments[i];
        const pathSegment = this.#pathSegments[i];
        const isParam = routeSegment.startsWith(PARAM_PATTERN);
        const isUndef = pathSegment === undefined;
        const matches = isParam
          || routeSegment === pathSegment
          || routeSegment === EMPTY_PATTERN && isUndef
          || routeSegment === ANY_PATTERN;
        if (matches) ++score;
        else break;
        if (isParam && !isUndef) {
          const paramName = routeSegment.slice(1);
          params[paramName] = decodeURIComponent(pathSegment);
        }
        if (score > maxScore) {
          maxScore = score;
          match = route;
        }
      }
    }
    if (!match) return null;
    this.#drainAnyPattern(match.pattern);
    return {
      ...match,
      params,
    };
  }

  #drainAnyPattern(pattern) {
    const hasAnySlug = pattern.endsWith(ANY_PATTERN);
    const shouldDrain = hasAnySlug && this.#pathSegments.length > 0;
    if (shouldDrain) this.#pathSegments.length = 0;
  }

  #reportNotFound() {
    const { schema, module } = this.#context;
    const errorParams = {
      path: this.#path,
      moduleUrl: module.url,
      tag: schema.tag,
    };
    Reporter.errorLog('RouteNotFound', errorParams);
  }
}
