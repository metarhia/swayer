import Reporter from './reporter.js';
import { is, isBrowser } from './utils.js';

const PATH_DELIMITER = '/';
const EMPTY_PATTERN = '';
const PARAM_PATTERN = ':';
const ANY_PATTERN = '**';

const patternToSegments = (pattern) => pattern.split(PATH_DELIMITER);

const pathToSegments = (path) =>
  path.split(PATH_DELIMITER).filter((seg) => seg !== '');

const segmentsToPath = (segments) => segments.join(PATH_DELIMITER);

export default class Router {
  #routes;
  #path;
  #pathSegments;
  #isRoutingFailed = false;
  engine;
  children = [];
  context;
  reload;
  route;

  constructor(engine, context, routes, reload) {
    this.#routes = this.#initRoutes(routes);
    this.engine = engine;
    this.context = context;
    this.reload = reload;
    this.path = this.parent?.path || '';
    this.parent?.children.push(this);
  }

  get parent() {
    return this.context?.parent?.router;
  }

  get originalPath() {
    return this.#path;
  }

  get path() {
    return segmentsToPath(this.#pathSegments);
  }

  set path(path) {
    this.#path = path;
    this.#pathSegments = pathToSegments(path);
  }

  static registerHistoryChanges(router) {
    const webApi = router.engine.webApi;
    webApi.addEventListener('popstate', () => {
      const path = webApi.location.pathname;
      router.setInitialPath(path);
      router.reload();
    });
  }

  setInitialPath(path) {
    this.path = path;
  }

  destroy() {
    const index = this.parent?.children.indexOf(this);
    if (index && index > -1) this.parent.children.splice(index, 1);
  }

  go(path) {
    const fromRoot = path.startsWith(PATH_DELIMITER);
    if (fromRoot) {
      this.#pushState(path);
      let router = this;
      while (router.parent) router = router.parent;
      router.setInitialPath(path);
      router.reload();
    } else {
      this.path = path;
      this.#pushState(this.#concatChildPath(path));
      this.reload();
    }
  }

  async matchSchema() {
    const route = this.route = await this.#findRoute();
    if (route) {
      const { pattern, component, params } = route;
      const routeLength = pathToSegments(pattern).length;
      this.#pathSegments = this.#pathSegments.slice(routeLength);
      if (is.fn(component)) return component(params);
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
    if (isNotFound) {
      this.#isRoutingFailed = true;
      const anyRoute = hasSegments
        ? this.#routes.find((route) => route.pattern === ANY_PATTERN)
        : null;
      if (anyRoute) this.reload(anyRoute.component);
      else this.#reportNotFound();
    }
  }

  #concatChildPath(path) {
    const parentPath = this.parent?.originalPath || PATH_DELIMITER;
    const parentSegments = pathToSegments(parentPath);
    const segments = pathToSegments(path);
    let needShift = true;
    while (needShift) {
      const lastParentSeg = parentSegments[parentSegments.length - 1];
      const firstChildSeg = segments[0];
      if ((needShift = lastParentSeg === firstChildSeg)) segments.shift();
    }
    const fullPath = parentSegments.concat(segments);
    return PATH_DELIMITER + segmentsToPath(fullPath);
  }

  async #findRoute() {
    const params = {};
    let match;
    let maxScore = 0;
    for (const route of this.#routes) {
      const isParentAny = this.parent?.route.pattern === ANY_PATTERN;
      if (isParentAny && route.pattern === ANY_PATTERN) {
        match = route;
        break;
      }
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
      }
      if (route.canMatch) {
        const canMatch = await route.canMatch(params);
        if (!canMatch) continue;
      }
      if (score > maxScore) {
        maxScore = score;
        match = route;
      }
    }
    if (!match) return null;
    this.#drainAnyPattern(match.pattern);
    return {
      ...match,
      params,
    };
  }

  #initRoutes(routesArray) {
    const routes = routesArray.slice();
    for (let i = 0; i < routes.length; ++i) {
      const { pattern, ...route } = routes[i];
      if (is.arr(pattern)) {
        const variants = pattern.map(
          (path) => ({ ...route, pattern: path }),
        );
        routes.splice(i, 1, ...variants);
        i += variants.length - 1;
      }
    }
    return routes;
  }

  #pushState(path, state = {}) {
    if (isBrowser) this.engine.webApi.history.pushState(state, '', path);
  }

  #drainAnyPattern(pattern) {
    const hasAnySlug = pattern.endsWith(ANY_PATTERN);
    const shouldDrain = hasAnySlug && this.#pathSegments.length > 0;
    if (shouldDrain) this.#pathSegments.length = 0;
  }

  #reportNotFound() {
    const { schema, module } = this.context;
    const errorParams = {
      path: this.#path,
      moduleUrl: module.url,
      tag: schema.tag,
    };
    Reporter.errorLog('RouteNotFound', errorParams);
  }
}
