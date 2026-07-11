import _ from "lodash";
import { preferredGroupKeys, tones } from "./data";

export function buildGroupTrace(input, callbackContext) {
  const buckets = {};
  return input.map((item, index, array) => {
    const rawValue = callbackContext.run(item, index, array);
    const keyValue = normalizeGroupValue(rawValue);
    const hadBucket = Object.prototype.hasOwnProperty.call(buckets, keyValue);
    buckets[keyValue] = buckets[keyValue] || [];
    buckets[keyValue].push(item);

    return {
      item,
      itemIndex: index,
      itemLabel: getItemLabel(item, index),
      keyName: callbackContext.resolvedExpression,
      keyValue,
      created: !hadBucket,
      bucketSize: buckets[keyValue].length
    };
  });
}

export function buildMapTrace(input, result) {
  return input.map((item, index) => {
    return {
      item,
      itemIndex: index,
      itemLabel: getItemLabel(item, index),
      output: result[index]
    };
  });
}

export function getMapFieldRoutes(step) {
  return [
    {
      source: step.labelSource,
      outputKey: "label",
      outputValue: step.output.label
    },
    {
      source: step.valueSource,
      outputKey: "value",
      outputValue: step.output.value
    },
    {
      source: step.sourceSource,
      outputKey: "source",
      outputValue: step.output.source
    }
  ];
}

export function pickFirstSource(item, keys, fallback) {
  if (!_.isPlainObject(item)) return { key: "value", value: fallback ?? item };
  const key = keys.find((candidate) => item[candidate] !== undefined && item[candidate] !== null);
  if (!key) return { key: "fallback", value: fallback };
  return { key, value: item[key] };
}

export function getGroupKeyChoices(input, datasetName) {
  const discovered = [];
  input.forEach((item) => {
    if (!_.isPlainObject(item)) return;
    Object.keys(item).forEach((key) => {
      if (!discovered.includes(key)) discovered.push(key);
    });
  });

  if (!discovered.length) {
    return (preferredGroupKeys[datasetName] || []).slice(0, 8);
  }

  const preferred = (preferredGroupKeys[datasetName] || []).filter((key) => discovered.includes(key));
  const remaining = discovered.filter((key) => !preferred.includes(key));

  return [...preferred, ...remaining].slice(0, 8);
}

export function getItemValue(item, key) {
  if (!_.isPlainObject(item)) return undefined;
  return item[key];
}

export function normalizeGroupValue(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return String(value);
  if (_.isPlainObject(value)) return JSON.stringify(value);
  return String(value);
}

export function getItemLabel(item, index) {
  if (!_.isPlainObject(item)) return `item ${index + 1}`;
  return item.id || item.name || item.customer || item.page || `item ${index + 1}`;
}

export function getItemSubtitle(item) {
  if (!_.isPlainObject(item)) return "value";
  return item.status || item.team || item.kind || item.device || item.region || "object";
}

export function summarizeResult(result) {
  if (Array.isArray(result)) return formatCount(result, Array.isArray(result[0]) ? "batch" : "item");
  if (_.isPlainObject(result) && (result.id || result.name || result.customer || result.page)) return "1 item";
  if (_.isPlainObject(result)) return formatCount(Object.keys(result), "group");
  return "1 value";
}

export function formatCount(list, noun) {
  const count = Array.isArray(list) ? list.length : Number(list) || 0;
  const plural = noun === "batch" ? "batches" : `${noun}s`;
  return `${count} ${count === 1 ? noun : plural}`;
}

export function formatValue(value) {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (_.isPlainObject(value)) return JSON.stringify(value);
  return String(value);
}

export function getObjectEntries(value) {
  if (_.isPlainObject(value)) return Object.entries(value).slice(0, 8);
  return [["value", value]];
}

export function toneForKey(keyValue, groupKeys) {
  return tones[Math.max(0, groupKeys.indexOf(keyValue)) % tones.length];
}

export function toneForIndex(index) {
  return tones[index % tones.length];
}

export function shortLabel(value, maxLength) {
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}...` : text;
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
