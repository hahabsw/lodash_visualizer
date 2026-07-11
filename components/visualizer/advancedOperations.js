import _ from "lodash";

export const advancedFunctionIds = new Set([
  "get",
  "set",
  "merge",
  "defaultsDeep",
  "flattenDeep",
  "flattenDepth",
  "cloneDeep",
  "isEqual",
  "debounce",
  "throttle"
]);

export const advancedOptionFunctionIds = new Set(["get", "set", "merge", "defaultsDeep", "flattenDeep", "flattenDepth", "debounce", "throttle"]);

export function getDefaultAdvancedOptions(fnId, datasetName, availablePaths, arrayPaths) {
  const defaultPath = defaultPathForDataset(datasetName, availablePaths);
  return {
    path: fnId === "flattenDeep" || fnId === "flattenDepth" ? arrayPaths[0] || "" : defaultPath,
    valueText: datasetName === "orders" ? "999" : '"updated"',
    value: datasetName === "orders" ? 999 : "updated",
    overlay: defaultOverlay(datasetName),
    depth: 2,
    wait: 3
  };
}

export function parseOptionValue(valueText, fallback) {
  try {
    return JSON.parse(valueText);
  } catch {
    return valueText === "" ? fallback : valueText;
  }
}

export function simulateRateLimit(fnId, input, wait = 3) {
  const events = (input || []).map((item, index) => ({ item, index, time: eventTime(item, index) })).sort((a, b) => a.time - b.time || a.index - b.index);
  return fnId === "debounce" ? simulateDebounce(events, wait) : simulateThrottle(events, wait);
}

function defaultPathForDataset(datasetName, availablePaths) {
  const preferred = datasetName === "orders" ? "total" : datasetName === "people" ? "score" : "page";
  return availablePaths.includes(preferred) ? preferred : availablePaths[0] || "";
}

function defaultOverlay(datasetName) {
  if (datasetName === "people") return { active: false, profile: { verified: true } };
  if (datasetName === "events") return { device: "server", metadata: { sampled: true } };
  return { status: "reviewed", metadata: { source: "overlay" } };
}

function eventTime(item, index) {
  const value = Number(item?.minute ?? item?.time ?? index * 2 + 1);
  return Number.isFinite(value) ? value : index * 2 + 1;
}

function simulateDebounce(events, wait) {
  const trace = events.map((event) => ({ ...event, decision: "schedule", emittedAt: null }));
  const emitted = [];
  let pending = null;

  events.forEach((event, traceIndex) => {
    if (pending && event.time >= pending.deadline) {
      trace[pending.traceIndex].decision = "emit";
      trace[pending.traceIndex].emittedAt = pending.deadline;
      emitted.push({ ...pending.item, _emittedAt: pending.deadline });
      pending = null;
    }

    if (pending) trace[pending.traceIndex].decision = "cancel";
    pending = { ...event, traceIndex, deadline: event.time + wait };
  });

  if (pending) {
    trace[pending.traceIndex].decision = "emit";
    trace[pending.traceIndex].emittedAt = pending.deadline;
    emitted.push({ ...pending.item, _emittedAt: pending.deadline });
  }

  return { result: emitted, trace };
}

function simulateThrottle(events, wait) {
  const trace = [];
  const emitted = [];
  let nextAllowed = Number.NEGATIVE_INFINITY;

  events.forEach((event) => {
    const shouldEmit = event.time >= nextAllowed;
    trace.push({ ...event, decision: shouldEmit ? "emit" : "suppress", emittedAt: shouldEmit ? event.time : null, nextAllowed });
    if (shouldEmit) {
      emitted.push({ ...event.item, _emittedAt: event.time });
      nextAllowed = event.time + wait;
    }
  });

  return { result: emitted, trace };
}

export function applyAdvancedOperation(fnId, input, options) {
  if (fnId === "get") return _.map(input, (item) => _.get(item, options.path));
  if (fnId === "set") return _.map(input, (item) => _.set(_.cloneDeep(item), options.path, options.value));
  if (fnId === "merge") return _.map(input, (item) => _.merge({}, item, options.overlay));
  if (fnId === "defaultsDeep") return _.map(input, (item) => _.defaultsDeep({}, item, options.overlay));
  if (fnId === "flattenDeep") return _.map(input, (item) => _.flattenDeep(_.get(item, options.path, [])));
  if (fnId === "flattenDepth") return _.map(input, (item) => _.flattenDepth(_.get(item, options.path, []), options.depth));
  if (fnId === "cloneDeep") return _.cloneDeep(input);
  if (fnId === "isEqual") return _.isEqual(input, _.cloneDeep(input));
  if (fnId === "debounce" || fnId === "throttle") return simulateRateLimit(fnId, input, options.wait).result;
  return input;
}
