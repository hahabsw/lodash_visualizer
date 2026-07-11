import _ from "lodash";

const preferredPaths = {
  orders: ["id", "customer", "total"],
  people: ["id", "name", "score"],
  events: ["id", "kind", "page"]
};

export function discoverObjectPaths(input, maxDepth = 3) {
  const paths = new Set();

  (input || []).forEach((item) => visitObject(item, "", 0, maxDepth, paths));
  return [...paths].slice(0, 18);
}

export function discoverArrayPaths(input, maxDepth = 3) {
  const paths = new Map();
  (input || []).forEach((item) => visitArrays(item, "", 0, maxDepth, paths));
  return [...paths.entries()]
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .map(([path]) => path)
    .slice(0, 12);
}

export function getDefaultObjectPaths(datasetName, availablePaths) {
  const preferred = (preferredPaths[datasetName] || []).filter((path) => availablePaths.includes(path));
  return preferred.length ? preferred : availablePaths.slice(0, 3);
}

export function rootPath(path) {
  return String(path).split(".")[0];
}

function visitObject(value, prefix, depth, maxDepth, paths) {
  if (!_.isPlainObject(value) || depth >= maxDepth) {
    if (prefix) paths.add(prefix);
    return;
  }

  const entries = Object.entries(value);
  if (!entries.length && prefix) paths.add(prefix);

  entries.forEach(([key, child]) => {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (_.isPlainObject(child) && depth + 1 < maxDepth) {
      visitObject(child, nextPath, depth + 1, maxDepth, paths);
      return;
    }
    paths.add(nextPath);
  });
}

function visitArrays(value, prefix, depth, maxDepth, paths) {
  if (!_.isPlainObject(value) || depth >= maxDepth) return;
  Object.entries(value).forEach(([key, child]) => {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(child)) {
      const isNested = child.some(Array.isArray);
      paths.set(nextPath, Boolean(paths.get(nextPath) || isNested));
      return;
    }
    if (_.isPlainObject(child)) visitArrays(child, nextPath, depth + 1, maxDepth, paths);
  });
}
