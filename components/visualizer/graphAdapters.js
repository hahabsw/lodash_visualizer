import { tones } from "./data";
import { defaultFrames, normalizeDataGraph } from "./dataGraphModel";
import { formatCount, formatValue, getItemLabel, getItemSubtitle, getMapFieldRoutes, getObjectEntries, shortLabel, toneForIndex, toneForKey } from "./utils";

export function createGroupByGraph({ trace, entries, groupKey, groupKeys }) {
  const inputNodes = trace.map((step, index) => ({
    id: `input-${index}`,
    kind: "object",
    phase: 1,
    path: `input[${index}]`,
    tone: toneForKey(step.keyValue, groupKeys),
    eyebrow: `input[${index}]`,
    label: step.itemLabel,
    value: `${groupKey}: ${step.keyValue}`
  }));

  const keyNodes = trace.map((step, index) => ({
    id: `key-${index}`,
    kind: "key",
    phase: 2,
    path: `input[${index}].${groupKey}`,
    tone: toneForKey(step.keyValue, groupKeys),
    eyebrow: `item.${groupKey}`,
    label: step.keyValue,
    value: step.created ? "create bucket" : "append"
  }));

  const bucketNodes = entries.map(([key, items], index) => ({
    id: `bucket-${safeGraphId(key)}`,
    kind: "bucket",
    phase: 3,
    path: `output.${key}`,
    tone: tones[index % tones.length],
    eyebrow: "output bucket",
    label: String(key),
    value: formatCount(items, "item"),
    detail: shortLabel(items.map((item, itemIndex) => getItemLabel(item, itemIndex)).join(", "), 32)
  }));

  return normalizeDataGraph({
    id: `group-${groupKey}`,
    title: `item.${groupKey} routes into buckets`,
    frames: defaultFrames,
    meta: { operation: "groupBy", groupKey },
    columns: [
      { id: "input", label: "Input objects", nodeIds: inputNodes.map((node) => node.id) },
      { id: "key", label: "Extracted key", nodeIds: keyNodes.map((node) => node.id) },
      { id: "bucket", label: "Output object", nodeIds: bucketNodes.map((node) => node.id) }
    ],
    nodes: [...inputNodes, ...keyNodes, ...bucketNodes],
    edges: [
      ...trace.map((step, index) => ({
        id: `read-${index}`,
        source: `input-${index}`,
        target: `key-${index}`,
        kind: "read",
        tone: toneForKey(step.keyValue, groupKeys),
        label: "read key",
        phase: 1,
        meta: { item: step.item, path: `input[${index}].${groupKey}` }
      })),
      ...trace.map((step, index) => ({
        id: `route-${index}`,
        source: `key-${index}`,
        target: `bucket-${safeGraphId(step.keyValue)}`,
        kind: "route",
        tone: toneForKey(step.keyValue, groupKeys),
        label: "append item",
        phase: step.created ? 2 : 3,
        meta: { item: step.item, bucket: step.keyValue }
      }))
    ]
  });
}

export function createMapGraph({ step, index }) {
  const routes = getMapFieldRoutes(step);
  const selectedKeys = routes.map((route) => route.source.key).filter((key) => key !== "fallback");
  const inputNode = {
    id: "input-object",
    kind: "object",
    phase: 1,
    path: `input[${index}]`,
    tone: toneForIndex(index),
    eyebrow: `input[${index}]`,
    label: step.itemLabel,
    value: "source object",
    fields: objectFields(step.item, {
      selectedKeys,
      renameMap: Object.fromEntries(routes.map((route) => [route.source.key, route.outputKey]))
    }),
    meta: { item: step.item }
  };

  const mapperNodes = routes.map((route, routeIndex) => ({
    id: `mapper-${route.outputKey}`,
    kind: "operator",
    phase: 2,
    path: `mapper.${route.outputKey}`,
    tone: toneForIndex(routeIndex),
    eyebrow: "mapper expression",
    label: `${route.outputKey}: ${route.source.key === "fallback" ? "fallback" : `item.${route.source.key}`}`,
    value: formatValue(route.source.value)
  }));

  const outputNode = {
    id: "output-object",
    kind: "object",
    phase: 3,
    path: `output[${index}]`,
    tone: toneForIndex(index),
    eyebrow: `output[${index}]`,
    label: step.output.source || step.itemLabel,
    value: "mapped object",
    fields: objectFields(step.output, {
      selectedKeys: routes.map((route) => route.outputKey),
      derivedMap: Object.fromEntries(routes.map((route) => [route.outputKey, route.source.key]))
    }),
    meta: { output: step.output }
  };

  return normalizeDataGraph({
    id: `map-${step.itemLabel}-${index}`,
    title: `${step.itemLabel} object shape becomes output[${index}]`,
    frames: defaultFrames,
    meta: { operation: "map", itemIndex: index, item: step.item, output: step.output },
    columns: [
      { id: "source", label: "Input element", nodeIds: [inputNode.id] },
      { id: "mapper", label: "Callback writes", nodeIds: mapperNodes.map((node) => node.id) },
      { id: "output", label: "Output element", nodeIds: [outputNode.id] }
    ],
    nodes: [inputNode, ...mapperNodes, outputNode],
    edges: [
      ...routes.map((route, routeIndex) => ({
        id: `read-${route.outputKey}`,
        source: inputNode.id,
        target: `mapper-${route.outputKey}`,
        kind: "read",
        tone: toneForIndex(routeIndex),
        label: `${route.source.key} -> ${route.outputKey}`,
        phase: 1,
        meta: { source: route.source, outputKey: route.outputKey }
      })),
      ...routes.map((route, routeIndex) => ({
        id: `write-${route.outputKey}`,
        source: `mapper-${route.outputKey}`,
        target: outputNode.id,
        kind: "copy",
        tone: toneForIndex(routeIndex),
        label: `write ${route.outputKey}`,
        phase: 3,
        meta: { outputKey: route.outputKey, value: route.outputValue }
      }))
    ]
  });
}

export function createOperationGraph({ fnId, input, result, datasetName }) {
  if (fnId === "filter") return createFilterGraph({ input, datasetName });
  if (fnId === "orderBy") return createOrderByGraph({ input, result, datasetName });
  if (fnId === "partition") return createPartitionGraph({ input, datasetName });
  if (fnId === "chunk") return createChunkGraph({ input, result });
  if (fnId === "uniqBy") return createUniqByGraph({ input, datasetName });
  if (fnId === "sumBy") return createSumByGraph({ input, result, datasetName });
  if (fnId === "keyBy") return createKeyByGraph({ input, result });
  if (fnId === "flatMap") return createFlatMapGraph({ input, result, datasetName });
  return createPassThroughGraph({ fnId, input, result });
}

function createFilterGraph({ input, datasetName }) {
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const predicateNodes = input.map((item, index) => {
    const passed = matchesFilter(item, datasetName);
    return {
      id: `predicate-${index}`,
      kind: "operator",
      tone: passed ? "tone-green" : "tone-coral",
      eyebrow: "predicate",
      label: filterLabel(datasetName),
      value: passed ? "keep" : "drop"
    };
  });
  const outputNodes = input.map((item, index) => {
    const passed = matchesFilter(item, datasetName);
    return {
      id: `out-${index}`,
      kind: passed ? "object" : "bucket",
      tone: passed ? "tone-green" : "tone-coral",
      eyebrow: passed ? "output item" : "not included",
      label: passed ? getItemLabel(item, index) : "dropped",
      value: passed ? "flows to output array" : getItemLabel(item, index)
    };
  });

  return columnGraph({
    id: `filter-${datasetName}`,
    title: "predicate keeps or drops each item",
    columns: [
      ["input", "Input array", inputNodes],
      ["predicate", "Predicate gate", predicateNodes],
      ["output", "Output array", outputNodes]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `input-${index}`, `predicate-${index}`, predicateNodes[index].tone, "test", index)),
      ...input.map((_, index) => edge(`route-${index}`, `predicate-${index}`, `out-${index}`, predicateNodes[index].tone, predicateNodes[index].value, index + input.length))
    ]
  });
}

function createOrderByGraph({ input, result, datasetName }) {
  const key = orderKey(datasetName);
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const keyNodes = input.map((item, index) => ({
    id: `key-${index}`,
    kind: "key",
    tone: toneForIndex(index),
    eyebrow: `item.${key}`,
    label: key,
    value: formatValue(item?.[key])
  }));
  const outputNodes = result.map((item, index) => ({
    id: `rank-${index}`,
    kind: "object",
    tone: toneForIndex(index),
    eyebrow: `output[${index}]`,
    label: getItemLabel(item, index),
    value: `rank ${index + 1}`
  }));

  return columnGraph({
    id: `orderBy-${datasetName}`,
    title: `sort by item.${key} descending`,
    columns: [
      ["input", "Input array", inputNodes],
      ["key", "Sort key", keyNodes],
      ["output", "Reordered output", outputNodes]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `input-${index}`, `key-${index}`, toneForIndex(index), "read key", index)),
      ...input.map((item, index) => {
        const rank = Math.max(0, result.indexOf(item));
        return edge(`place-${index}`, `key-${index}`, `rank-${rank}`, toneForIndex(index), `rank ${rank + 1}`, index + input.length);
      })
    ]
  });
}

function createPartitionGraph({ input, datasetName }) {
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const predicateNodes = input.map((item, index) => {
    const passed = matchesPartition(item, datasetName);
    return {
      id: `predicate-${index}`,
      kind: "operator",
      tone: passed ? "tone-teal" : "tone-gold",
      eyebrow: "predicate",
      label: partitionLabel(datasetName),
      value: passed ? "true" : "false"
    };
  });
  const bucketNodes = [
    { id: "bucket-true", kind: "bucket", tone: "tone-teal", eyebrow: "output[0]", label: "truthy bucket", value: "matched items" },
    { id: "bucket-false", kind: "bucket", tone: "tone-gold", eyebrow: "output[1]", label: "falsey bucket", value: "remaining items" }
  ];

  return columnGraph({
    id: `partition-${datasetName}`,
    title: "predicate splits one array into two arrays",
    columns: [
      ["input", "Input array", inputNodes],
      ["predicate", "Predicate gate", predicateNodes],
      ["output", "Output buckets", bucketNodes]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `input-${index}`, `predicate-${index}`, predicateNodes[index].tone, "test", index)),
      ...input.map((item, index) => {
        const passed = matchesPartition(item, datasetName);
        return edge(`route-${index}`, `predicate-${index}`, passed ? "bucket-true" : "bucket-false", predicateNodes[index].tone, passed ? "true" : "false", index + input.length);
      })
    ]
  });
}

function createChunkGraph({ input, result }) {
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const indexNodes = input.map((item, index) => ({
    id: `index-${index}`,
    kind: "operator",
    tone: toneForIndex(Math.floor(index / 2)),
    eyebrow: "index / size",
    label: `index ${index}`,
    value: `chunk ${Math.floor(index / 2) + 1}`
  }));
  const chunkNodes = result.map((items, index) => ({
    id: `chunk-${index}`,
    kind: "bucket",
    tone: toneForIndex(index),
    eyebrow: `output[${index}]`,
    label: `chunk ${index + 1}`,
    value: formatCount(items, "item")
  }));

  return columnGraph({
    id: "chunk-2",
    title: "array index groups items into fixed-size chunks",
    columns: [
      ["input", "Input array", inputNodes],
      ["index", "Index grouping", indexNodes],
      ["output", "Chunk arrays", chunkNodes]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `input-${index}`, `index-${index}`, toneForIndex(Math.floor(index / 2)), "index", index)),
      ...input.map((_, index) => edge(`route-${index}`, `index-${index}`, `chunk-${Math.floor(index / 2)}`, toneForIndex(Math.floor(index / 2)), "append", index + input.length))
    ]
  });
}

function createUniqByGraph({ input, datasetName }) {
  const key = uniqKey(datasetName);
  const seen = new Set();
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const keyNodes = input.map((item, index) => {
    const value = formatValue(item?.[key]);
    const first = !seen.has(value);
    seen.add(value);
    return {
      id: `key-${index}`,
      kind: "key",
      tone: first ? "tone-green" : "tone-coral",
      eyebrow: `item.${key}`,
      label: value,
      value: first ? "first seen" : "duplicate"
    };
  });
  const outputNodes = keyNodes.map((node, index) => ({
    id: `out-${index}`,
    kind: node.tone === "tone-green" ? "object" : "bucket",
    tone: node.tone,
    eyebrow: node.tone === "tone-green" ? "output item" : "not included",
    label: node.tone === "tone-green" ? getItemLabel(input[index], index) : "duplicate",
    value: node.label
  }));

  return columnGraph({
    id: `uniqBy-${datasetName}`,
    title: `keep the first item for each item.${key}`,
    columns: [
      ["input", "Input array", inputNodes],
      ["key", "Uniq key", keyNodes],
      ["output", "Deduped output", outputNodes]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `input-${index}`, `key-${index}`, keyNodes[index].tone, "read key", index)),
      ...input.map((_, index) => edge(`route-${index}`, `key-${index}`, `out-${index}`, keyNodes[index].tone, keyNodes[index].value, index + input.length))
    ]
  });
}

function createSumByGraph({ input, result, datasetName }) {
  const key = sumKey(datasetName);
  const valueNodes = input.map((item, index) => ({
    id: `value-${index}`,
    kind: "field",
    tone: toneForIndex(index),
    eyebrow: `item.${key}`,
    label: getItemLabel(item, index),
    value: formatValue(item?.[key])
  }));
  let running = 0;
  const accumulatorNodes = input.map((item, index) => {
    running += Number(item?.[key]) || 0;
    return {
      id: `acc-${index}`,
      kind: "operator",
      tone: toneForIndex(index),
      eyebrow: "accumulator",
      label: `sum + ${formatValue(item?.[key])}`,
      value: formatValue(running)
    };
  });
  const totalNode = { id: "total", kind: "value", tone: "tone-green", eyebrow: "output value", label: "total", value: formatValue(result) };

  return columnGraph({
    id: `sumBy-${datasetName}`,
    title: `add every item.${key} into one number`,
    columns: [
      ["value", "Input values", valueNodes],
      ["acc", "Running sum", accumulatorNodes],
      ["output", "Output", [totalNode]]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `value-${index}`, `acc-${index}`, toneForIndex(index), "add", index)),
      ...input.map((_, index) => edge(`route-${index}`, `acc-${index}`, "total", toneForIndex(index), "contribute", index + input.length))
    ]
  });
}

function createKeyByGraph({ input, result }) {
  const inputNodes = input.map((item, index) => ({
    ...itemNode(item, index),
    value: "whole item value",
    fields: objectFields(item, { selectedKeys: ["id"], renameMap: { id: `output.${formatValue(item?.id)}` } }),
    meta: { item }
  }));
  const keyNodes = input.map((item, index) => ({
    id: `key-${index}`,
    kind: "key",
    tone: toneForIndex(index),
    eyebrow: "item.id",
    label: formatValue(item?.id),
    value: "object property"
  }));
  const outputNodes = Object.entries(result).map(([key, item], index) => ({
    id: `property-${safeGraphId(key)}`,
    kind: "object",
    tone: toneForIndex(index),
    eyebrow: "output property",
    label: key,
    value: `output.${key}`,
    path: `output.${key}`,
    fields: objectFields(item, { valueOnly: true }),
    meta: { property: key, value: item }
  }));

  return columnGraph({
    id: "keyBy-id",
    title: "item.id becomes the output object key",
    columns: [
      ["input", "Input array", inputNodes],
      ["key", "Property key", keyNodes],
      ["output", "Output object", outputNodes]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `input-${index}`, `key-${index}`, toneForIndex(index), "read id", index)),
      ...input.map((item, index) => edge(`route-${index}`, `key-${index}`, `property-${safeGraphId(item?.id)}`, toneForIndex(index), "assign", index + input.length))
    ]
  });
}

function objectFields(value, options = {}) {
  const selectedKeys = options.selectedKeys || [];
  const renameMap = options.renameMap || {};
  const derivedMap = options.derivedMap || {};
  return getObjectEntries(value).map(([key, fieldValue]) => ({
    key,
    value: formatValue(fieldValue),
    selected: selectedKeys.includes(key),
    muted: options.valueOnly ? false : selectedKeys.length > 0 && !selectedKeys.includes(key),
    renamedTo: renameMap[key],
    derivedFrom: derivedMap[key]
  }));
}

function createFlatMapGraph({ input, result, datasetName }) {
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const emitted = [];
  input.forEach((item, inputIndex) => {
    flatMapValues(item, datasetName).forEach((value, valueIndex) => {
      emitted.push({ inputIndex, valueIndex, value, outputIndex: emitted.length });
    });
  });

  const emitNodes = emitted.map((entry) => ({
    id: `emit-${entry.inputIndex}-${entry.valueIndex}`,
    kind: "value",
    tone: toneForIndex(entry.inputIndex),
    eyebrow: `input[${entry.inputIndex}] emits`,
    label: formatValue(entry.value),
    value: `flat index ${entry.outputIndex}`
  }));
  const outputNodes = result.map((value, index) => ({
    id: `flat-${index}`,
    kind: "value",
    tone: toneForIndex(index),
    eyebrow: `output[${index}]`,
    label: formatValue(value),
    value: "flattened"
  }));

  return columnGraph({
    id: `flatMap-${datasetName}`,
    title: "each item emits values that are flattened into one array",
    columns: [
      ["input", "Input array", inputNodes],
      ["emit", "Emitted values", emitNodes],
      ["output", "Flat output", outputNodes]
    ],
    edges: [
      ...emitted.map((entry) => edge(`emit-${entry.inputIndex}-${entry.valueIndex}`, `input-${entry.inputIndex}`, `emit-${entry.inputIndex}-${entry.valueIndex}`, toneForIndex(entry.inputIndex), "emit", entry.outputIndex)),
      ...emitted.map((entry) => edge(`flat-${entry.outputIndex}`, `emit-${entry.inputIndex}-${entry.valueIndex}`, `flat-${entry.outputIndex}`, toneForIndex(entry.inputIndex), "flatten", entry.outputIndex + emitted.length))
    ]
  });
}

function createPassThroughGraph({ fnId, input, result }) {
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const output = Array.isArray(result) ? result : [result];
  const outputNodes = output.map((item, index) => ({
    id: `out-${index}`,
    kind: "value",
    tone: toneForIndex(index),
    eyebrow: `output[${index}]`,
    label: formatValue(item),
    value: "result"
  }));

  return columnGraph({
    id: `generic-${fnId}`,
    title: `${fnId} data graph`,
    columns: [
      ["input", "Input", inputNodes],
      ["output", "Output", outputNodes]
    ],
    edges: inputNodes.map((node, index) => edge(`flow-${index}`, node.id, outputNodes[Math.min(index, outputNodes.length - 1)]?.id, toneForIndex(index), "flow", index)).filter((item) => item.target)
  });
}

function columnGraph({ id, title, columns, edges }) {
  const normalizedColumns = columns.map(([columnId, label, nodes]) => ({
    id: columnId,
    label,
    nodeIds: nodes.map((node) => node.id)
  }));

  const phasedNodes = columns.flatMap(([, , nodes], columnIndex) =>
    nodes.map((node) => ({
      phase: Math.min(3, columnIndex + 1),
      ...node
    }))
  );

  return normalizeDataGraph({
    id,
    title,
    frames: defaultFrames,
    meta: { layout: "columns" },
    columns: normalizedColumns,
    nodes: phasedNodes,
    edges
  });
}

function itemNode(item, index) {
  return {
    id: `input-${index}`,
    kind: "object",
    phase: 1,
    path: `input[${index}]`,
    tone: toneForIndex(index),
    eyebrow: `input[${index}]`,
    label: getItemLabel(item, index),
    value: getItemSubtitle(item)
  };
}

function edge(id, source, target, tone, label, phase) {
  const kind = edgeKind(label);
  return { id, source, target, tone, label, phase: phaseForEdgeKind(kind, label), kind, meta: { step: phase } };
}

function edgeKind(label) {
  if (["keep", "drop", "true", "false", "append", "assign"].includes(label)) return "route";
  if (["read key", "test", "index", "read id"].includes(label)) return "read";
  if (["rank 1", "rank 2", "rank 3", "rank 4", "rank 5", "rank 6"].includes(label)) return "reorder";
  if (["add", "contribute"].includes(label)) return "accumulate";
  if (["emit", "flatten"].includes(label)) return "emit";
  return label || "flow";
}

function phaseForEdgeKind(kind, label) {
  if (kind === "read") return 1;
  if (kind === "accumulate" && label === "add") return 2;
  if (kind === "emit" && label === "emit") return 2;
  return 3;
}

function matchesFilter(item, datasetName) {
  if (datasetName === "orders") return item.total >= 100;
  if (datasetName === "people") return item.active;
  return item.device === "mobile";
}

function matchesPartition(item, datasetName) {
  if (datasetName === "orders") return item.status === "paid";
  if (datasetName === "people") return item.score >= 85;
  return item.device === "mobile";
}

function filterLabel(datasetName) {
  if (datasetName === "orders") return "total >= 100";
  if (datasetName === "people") return "active === true";
  return 'device === "mobile"';
}

function partitionLabel(datasetName) {
  if (datasetName === "orders") return 'status === "paid"';
  if (datasetName === "people") return "score >= 85";
  return 'device === "mobile"';
}

function orderKey(datasetName) {
  if (datasetName === "events") return "minute";
  if (datasetName === "people") return "score";
  return "total";
}

function uniqKey(datasetName) {
  if (datasetName === "orders") return "region";
  if (datasetName === "people") return "team";
  return "page";
}

function sumKey(datasetName) {
  if (datasetName === "people") return "score";
  if (datasetName === "events") return "value";
  return "total";
}

function flatMapValues(item, datasetName) {
  if (datasetName === "orders") return item.items || [];
  if (datasetName === "people") return item.skills || [];
  return [item.page, item.kind];
}

function safeGraphId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}
