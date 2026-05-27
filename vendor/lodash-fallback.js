(function () {
  if (window._) return;

  const getByPath = (item, path) => {
    if (typeof path === "function") return path(item);
    return String(path)
      .split(".")
      .reduce((value, key) => (value == null ? undefined : value[key]), item);
  };

  const matches = (predicate) => {
    if (typeof predicate === "function") return predicate;
    if (Array.isArray(predicate)) {
      const [key, value] = predicate;
      return (item) => getByPath(item, key) === value;
    }
    if (predicate && typeof predicate === "object") {
      return (item) => Object.entries(predicate).every(([key, value]) => getByPath(item, key) === value);
    }
    return Boolean;
  };

  const api = {
    VERSION: "fallback-used-functions",
    cloneDeep(value) {
      return JSON.parse(JSON.stringify(value));
    },
    debounce(fn, wait) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
      };
    },
    groupBy(collection, iteratee) {
      return collection.reduce((groups, item) => {
        const key = getByPath(item, iteratee);
        groups[key] = groups[key] || [];
        groups[key].push(item);
        return groups;
      }, {});
    },
    map(collection, iteratee) {
      return collection.map(iteratee);
    },
    filter(collection, predicate) {
      return collection.filter(matches(predicate));
    },
    orderBy(collection, keys, orders) {
      const key = keys[0];
      const direction = orders[0] === "desc" ? -1 : 1;
      return [...collection].sort((left, right) => {
        const a = getByPath(left, key);
        const b = getByPath(right, key);
        if (a === b) return 0;
        return a > b ? direction : -direction;
      });
    },
    partition(collection, predicate) {
      const check = matches(predicate);
      return collection.reduce(
        (parts, item) => {
          parts[check(item) ? 0 : 1].push(item);
          return parts;
        },
        [[], []]
      );
    },
    chunk(collection, size) {
      const chunks = [];
      for (let index = 0; index < collection.length; index += size) {
        chunks.push(collection.slice(index, index + size));
      }
      return chunks;
    },
    uniqBy(collection, iteratee) {
      const seen = new Set();
      return collection.filter((item) => {
        const key = getByPath(item, iteratee);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    sumBy(collection, iteratee) {
      return collection.reduce((sum, item) => sum + Number(getByPath(item, iteratee) || 0), 0);
    },
    keyBy(collection, iteratee) {
      return collection.reduce((index, item) => {
        index[getByPath(item, iteratee)] = item;
        return index;
      }, {});
    },
    flatMap(collection, iteratee) {
      return collection.flatMap(iteratee);
    },
    findIndex(collection, predicate) {
      return collection.findIndex(matches(predicate));
    },
    isPlainObject(value) {
      return Object.prototype.toString.call(value) === "[object Object]";
    }
  };

  window._ = api;
})();
