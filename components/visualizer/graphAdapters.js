import { tones } from "./data";
import { getItemPropertyReferences } from "./callbacks";
import { defaultFrames, normalizeDataGraph } from "./dataGraphModel";
import { formatCount, formatValue, getItemLabel, getItemSubtitle, getObjectEntries, normalizeGroupValue, shortLabel, toneForIndex, toneForKey } from "./utils";

export function createGroupByGraph({ trace, entries, callbackExpression, groupKeys }) {
  const inputNodes = trace.map((step, index) => ({
    id: `input-${index}`,
    kind: "object",
    phase: 1,
    path: `input[${index}]`,
    tone: toneForKey(step.keyValue, groupKeys),
    eyebrow: `input[${index}]`,
    label: step.itemLabel,
    value: `callback -> ${step.keyValue}`
  }));

  const keyNodes = trace.map((step, index) => ({
    id: `key-${index}`,
    kind: "key",
    phase: 2,
    path: `callback(input[${index}])`,
    tone: toneForKey(step.keyValue, groupKeys),
    eyebrow: "callback result",
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
    id: `group-${safeGraphId(callbackExpression)}`,
    title: `${shortLabel(`item => ${callbackExpression}`, 46)} routes into buckets`,
    frames: defaultFrames,
    meta: { operation: "groupBy", callbackExpression },
    columns: [
      { id: "input", label: "Input objects", nodeIds: inputNodes.map((node) => node.id) },
      { id: "key", label: "Callback result", nodeIds: keyNodes.map((node) => node.id) },
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
        label: "run callback",
        phase: 1,
        meta: { item: step.item, expression: callbackExpression }
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

export function createMapGraph({ step, index, callbackExpression }) {
  const outputIsObject = step.output && typeof step.output === "object" && !Array.isArray(step.output);
  const outputIsArray = Array.isArray(step.output);
  const referencedKeys = getItemPropertyReferences(callbackExpression);
  const presentReferencedKeys = referencedKeys.filter((key) => Object.prototype.hasOwnProperty.call(step.item || {}, key));
  const outputKeys = outputIsObject ? Object.keys(step.output) : [];
  const returnKind = outputIsArray ? "array" : outputIsObject ? "object" : "value";
  const inputNode = {
    id: "input-object",
    kind: "object",
    phase: 1,
    path: `input[${index}]`,
    tone: toneForIndex(index),
    eyebrow: `input[${index}]`,
    label: step.itemLabel,
    value: "source object",
    fields: objectFields(step.item, { selectedKeys: presentReferencedKeys }),
    meta: { item: step.item }
  };

  const callbackNode = {
    id: "map-callback",
    kind: "operator",
    phase: 2,
    path: "callback",
    tone: toneForIndex(index),
    eyebrow: "map callback",
    label: "item => result",
    value: `reads ${presentReferencedKeys.length ? presentReferencedKeys.map((key) => `item.${key}`).join(", ") : "item"}`,
    detail: `returns ${returnKind}`,
    fields: [
      {
        key: "reads",
        value: presentReferencedKeys.length ? presentReferencedKeys.join(", ") : "item",
        selected: true
      },
      {
        key: "returns",
        value: outputIsObject ? `{ ${outputKeys.join(", ")} }` : returnKind,
        selected: true
      },
      {
        key: "expr",
        value: shortLabel(callbackExpression, 46)
      }
    ],
    meta: { expression: callbackExpression, reads: presentReferencedKeys, returns: step.output }
  };

  const outputNode = outputIsObject
    ? {
        id: "output-object",
        kind: "object",
        phase: 3,
        path: `output[${index}]`,
        tone: toneForIndex(index),
        eyebrow: `output[${index}]`,
        label: getItemLabel(step.output, index),
        value: "mapped object",
        fields: objectFields(step.output, { selectedKeys: outputKeys, valueOnly: true }),
        meta: { output: step.output }
      }
    : {
        id: "output-value",
        kind: "value",
        phase: 3,
        path: `output[${index}]`,
        tone: toneForIndex(index),
        eyebrow: `output[${index}]`,
        label: outputIsArray ? formatCount(step.output, "value") : formatValue(step.output),
        value: outputIsArray ? shortLabel(step.output.map((value) => formatValue(value)).join(", "), 42) : "mapped value",
        meta: { output: step.output }
      };

  return normalizeDataGraph({
    id: `map-${step.itemLabel}-${index}`,
    title: `${step.itemLabel} reads ${presentReferencedKeys.length ? presentReferencedKeys.map((key) => `item.${key}`).join(", ") : "item"} into callback result`,
    frames: defaultFrames,
    meta: { operation: "map", itemIndex: index, item: step.item, output: step.output },
    columns: [
      { id: "source", label: "Input element", nodeIds: [inputNode.id] },
      { id: "mapper", label: "Callback", nodeIds: [callbackNode.id] },
      { id: "output", label: "Output element", nodeIds: [outputNode.id] }
    ],
    nodes: [inputNode, callbackNode, outputNode],
    edges: [
      {
        id: "read-map",
        source: inputNode.id,
        target: callbackNode.id,
        kind: "read",
        tone: toneForIndex(index),
        label: presentReferencedKeys.length ? "read selected keys" : "read item",
        phase: 1,
        meta: { expression: callbackExpression, reads: presentReferencedKeys }
      },
      {
        id: "write-map",
        source: callbackNode.id,
        target: outputNode.id,
        kind: "copy",
        tone: toneForIndex(index),
        label: outputIsObject ? "write object" : "write value",
        phase: 3,
        meta: { output: step.output }
      }
    ]
  });
}

export function createOperationGraph({ fnId, input, result, datasetName, callbackContext }) {
  if (fnId === "reduce") return createReduceGraph({ input, result, callbackContext });
  if (fnId === "find") return createFindGraph({ input, result, callbackContext });
  if (fnId === "sortBy") return createSortByGraph({ input, result, callbackContext });
  if (fnId === "countBy") return createCountByGraph({ input, result, callbackContext });
  if (fnId === "filter") return createFilterGraph({ input, callbackContext });
  if (fnId === "orderBy") return createOrderByGraph({ input, result, callbackContext });
  if (fnId === "partition") return createPartitionGraph({ input, callbackContext });
  if (fnId === "chunk") return createChunkGraph({ input, result });
  if (fnId === "uniqBy") return createUniqByGraph({ input, callbackContext });
  if (fnId === "sumBy") return createSumByGraph({ input, result, callbackContext });
  if (fnId === "keyBy") return createKeyByGraph({ input, result, callbackContext });
  if (fnId === "flatMap") return createFlatMapGraph({ input, result, callbackContext });
  if (fnId === "some" || fnId === "every") return createQuantifierGraph({ fnId, input, result, callbackContext });
  if (fnId === "maxBy" || fnId === "minBy") return createExtremumByGraph({ fnId, input, result, callbackContext });
  if (fnId === "meanBy") return createMeanByGraph({ input, result, callbackContext });
  if (fnId === "take" || fnId === "drop") return createTakeDropGraph({ fnId, input, result });
  return createPassThroughGraph({ fnId, input, result });
}

function createReduceGraph({ input, result, callbackContext }) {
  const inputNodes = input.map((item, index) => ({
    ...itemNode(item, index),
    fields: objectFields(item, { selectedKeys: getItemPropertyReferences(callbackContext.resolvedExpression) })
  }));
  let accumulator = 0;
  const accumulatorNodes = input.map((item, index) => {
    const previous = accumulator;
    accumulator = callbackContext.run(item, index, input, accumulator);
    return {
      id: `acc-${index}`,
      kind: "operator",
      tone: toneForIndex(index),
      eyebrow: "accumulator",
      label: `step ${index + 1}`,
      value: `${formatValue(previous)} -> ${formatValue(accumulator)}`,
      meta: { previous, next: accumulator, item }
    };
  });
  const outputNode = { id: "result", kind: "value", tone: "tone-green", eyebrow: "output value", label: formatValue(result), value: "final accumulator", meta: { result } };

  return columnGraph({
    id: `reduce-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: "fold each item into one accumulated result",
    columns: [
      ["input", "Input array", inputNodes],
      ["acc", "Accumulator", accumulatorNodes],
      ["output", "Output", [outputNode]]
    ],
    edges: [
      ...input.map((_, index) => edge(`fold-${index}`, `input-${index}`, `acc-${index}`, toneForIndex(index), "fold", index)),
      ...input.slice(1).map((_, index) => edge(`carry-${index}`, `acc-${index}`, `acc-${index + 1}`, toneForIndex(index + 1), "carry", index + input.length)),
      ...(input.length ? [edge("return-result", `acc-${input.length - 1}`, "result", "tone-green", "return", input.length * 2)] : [])
    ]
  });
}

function createFindGraph({ input, result, callbackContext }) {
  const checks = input.map((item, index) => Boolean(callbackContext.run(item, index, input)));
  const matchIndex = checks.findIndex(Boolean);
  const visitedLimit = matchIndex === -1 ? input.length - 1 : matchIndex;
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const predicateNodes = input.map((item, index) => {
    const wasVisited = index <= visitedLimit;
    const isMatch = index === matchIndex;
    return {
      id: `predicate-${index}`,
      kind: "operator",
      tone: isMatch ? "tone-green" : wasVisited ? "tone-coral" : "tone-gold",
      eyebrow: wasVisited ? "predicate" : "not visited",
      label: expressionLabel,
      value: isMatch ? "first match" : wasVisited ? "skip" : "stopped"
    };
  });
  const outputNode = {
    id: "found",
    kind: result === undefined ? "value" : "object",
    tone: matchIndex === -1 ? "tone-coral" : "tone-green",
    eyebrow: "output",
    label: result === undefined ? "undefined" : getItemLabel(result, matchIndex),
    value: matchIndex === -1 ? "no match" : `input[${matchIndex}]`,
    fields: result && typeof result === "object" && !Array.isArray(result) ? objectFields(result, { valueOnly: true }) : undefined,
    meta: { result, matchIndex }
  };

  return columnGraph({
    id: `find-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: "scan until the first matching item is found",
    columns: [
      ["input", "Input array", inputNodes],
      ["predicate", "Predicate scan", predicateNodes],
      ["output", "First match", [outputNode]]
    ],
    edges: [
      ...input.map((_, index) => edge(`test-${index}`, `input-${index}`, `predicate-${index}`, predicateNodes[index].tone, index <= visitedLimit ? "test" : "stopped", index)),
      ...(matchIndex === -1
        ? input.length
          ? [edge("not-found", `predicate-${input.length - 1}`, "found", "tone-coral", "return", input.length)]
          : []
        : [edge("found", `predicate-${matchIndex}`, "found", "tone-green", "return", input.length)])
    ]
  });
}

function createSortByGraph({ input, result, callbackContext }) {
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const keyValues = input.map((item, index) => callbackContext.run(item, index, input));
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const keyNodes = input.map((item, index) => ({
    id: `key-${index}`,
    kind: "key",
    tone: toneForIndex(index),
    eyebrow: getItemLabel(item, index),
    label: formatValue(keyValues[index]),
    value: expressionLabel
  }));
  const outputNodes = result.map((item, index) => ({
    id: `rank-${index}`,
    kind: "object",
    tone: toneForIndex(index),
    eyebrow: `output[${index}]`,
    label: getItemLabel(item, index),
    value: `ascending rank ${index + 1}`
  }));

  return columnGraph({
    id: `sortBy-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: "sort by callback result ascending",
    columns: [
      ["input", "Input array", inputNodes],
      ["key", "Sort key", keyNodes],
      ["output", "Sorted output", outputNodes]
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

function createCountByGraph({ input, result, callbackContext }) {
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const keyValues = input.map((item, index) => normalizeGroupValue(callbackContext.run(item, index, input)));
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const keyNodes = input.map((item, index) => ({
    id: `key-${index}`,
    kind: "key",
    tone: toneForIndex(index),
    eyebrow: getItemLabel(item, index),
    label: keyValues[index],
    value: expressionLabel
  }));
  const outputNodes = Object.entries(result).map(([key, count], index) => ({
    id: `count-${safeGraphId(key)}`,
    kind: "bucket",
    tone: toneForIndex(index),
    eyebrow: "output count",
    label: key,
    value: formatCount(count, "item"),
    meta: { key, count }
  }));

  return columnGraph({
    id: `countBy-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: "callback keys increment output counts",
    columns: [
      ["input", "Input array", inputNodes],
      ["key", "Count key", keyNodes],
      ["output", "Output counts", outputNodes]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `input-${index}`, `key-${index}`, toneForIndex(index), "read key", index)),
      ...input.map((_, index) => edge(`count-${index}`, `key-${index}`, `count-${safeGraphId(keyValues[index])}`, toneForIndex(index), "increment", index + input.length))
    ]
  });
}

function createQuantifierGraph({ fnId, input, result, callbackContext }) {
  const checks = input.map((item, index) => Boolean(callbackContext.run(item, index, input)));
  const stopIndex = fnId === "some" ? checks.findIndex(Boolean) : checks.findIndex((value) => !value);
  const visitedLimit = stopIndex === -1 ? input.length - 1 : stopIndex;
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const predicateNodes = input.map((item, index) => {
    const wasVisited = index <= visitedLimit;
    const passed = checks[index];
    return {
      id: `predicate-${index}`,
      kind: "operator",
      tone: !wasVisited ? "tone-gold" : passed ? "tone-green" : "tone-coral",
      eyebrow: wasVisited ? "predicate" : "not visited",
      label: expressionLabel,
      value: !wasVisited ? "short-circuited" : passed ? "true" : "false"
    };
  });
  const outputNode = {
    id: "result",
    kind: "value",
    tone: result ? "tone-green" : "tone-coral",
    eyebrow: "output boolean",
    label: String(result),
    value: fnId === "some" ? "any item matched" : "all visited items matched",
    meta: { result, checks }
  };

  return columnGraph({
    id: `${fnId}-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: fnId === "some" ? "stop when any predicate returns true" : "stop when any predicate returns false",
    columns: [
      ["input", "Input array", inputNodes],
      ["predicate", "Predicate scan", predicateNodes],
      ["output", "Boolean result", [outputNode]]
    ],
    edges: [
      ...input.map((_, index) => edge(`test-${index}`, `input-${index}`, `predicate-${index}`, predicateNodes[index].tone, index <= visitedLimit ? "test" : "stopped", index)),
      ...(input.length ? [edge("return-result", `predicate-${Math.max(0, visitedLimit)}`, "result", outputNode.tone, "return", input.length)] : [])
    ]
  });
}

function createFilterGraph({ input, callbackContext }) {
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const predicateNodes = input.map((item, index) => {
    const passed = Boolean(callbackContext.run(item, index, input));
    return {
      id: `predicate-${index}`,
      kind: "operator",
      tone: passed ? "tone-green" : "tone-coral",
      eyebrow: "predicate",
      label: expressionLabel,
      value: passed ? "keep" : "drop"
    };
  });
  const outputNodes = input.map((item, index) => {
    const passed = Boolean(callbackContext.run(item, index, input));
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
    id: `filter-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: "callback keeps or drops each item",
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

function createOrderByGraph({ input, result, callbackContext }) {
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const keyValues = input.map((item, index) => callbackContext.run(item, index, input));
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const keyNodes = input.map((item, index) => ({
    id: `key-${index}`,
    kind: "key",
    tone: toneForIndex(index),
    eyebrow: getItemLabel(item, index),
    label: formatValue(keyValues[index]),
    value: expressionLabel
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
    id: `orderBy-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: "sort by callback result descending",
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

function createPartitionGraph({ input, callbackContext }) {
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const predicateNodes = input.map((item, index) => {
    const passed = Boolean(callbackContext.run(item, index, input));
    return {
      id: `predicate-${index}`,
      kind: "operator",
      tone: passed ? "tone-teal" : "tone-gold",
      eyebrow: "predicate",
      label: expressionLabel,
      value: passed ? "true" : "false"
    };
  });
  const bucketNodes = [
    { id: "bucket-true", kind: "bucket", tone: "tone-teal", eyebrow: "output[0]", label: "truthy bucket", value: "matched items" },
    { id: "bucket-false", kind: "bucket", tone: "tone-gold", eyebrow: "output[1]", label: "falsey bucket", value: "remaining items" }
  ];

  return columnGraph({
    id: `partition-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: "callback splits one array into two arrays",
    columns: [
      ["input", "Input array", inputNodes],
      ["predicate", "Predicate gate", predicateNodes],
      ["output", "Output buckets", bucketNodes]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `input-${index}`, `predicate-${index}`, predicateNodes[index].tone, "test", index)),
      ...input.map((item, index) => {
        const passed = Boolean(callbackContext.run(item, index, input));
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

function createUniqByGraph({ input, callbackContext }) {
  const seen = new Set();
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const keyValues = input.map((item, index) => callbackContext.run(item, index, input));
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const keyNodes = input.map((item, index) => {
    const value = formatValue(keyValues[index]);
    const first = !seen.has(value);
    seen.add(value);
    return {
      id: `key-${index}`,
      kind: "key",
      tone: first ? "tone-green" : "tone-coral",
      eyebrow: "callback value",
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
    id: `uniqBy-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: `keep the first item for each ${expressionLabel}`,
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

function createSumByGraph({ input, result, callbackContext }) {
  const callbackValues = input.map((item, index) => Number(callbackContext.run(item, index, input)) || 0);
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const valueNodes = input.map((item, index) => ({
    id: `value-${index}`,
    kind: "field",
    tone: toneForIndex(index),
    eyebrow: getItemLabel(item, index),
    label: formatValue(callbackValues[index]),
    value: expressionLabel
  }));
  let running = 0;
  const accumulatorNodes = input.map((item, index) => {
    running += callbackValues[index];
    return {
      id: `acc-${index}`,
      kind: "operator",
      tone: toneForIndex(index),
      eyebrow: "accumulator",
      label: `sum + ${formatValue(callbackValues[index])}`,
      value: formatValue(running)
    };
  });
  const totalNode = { id: "total", kind: "value", tone: "tone-green", eyebrow: "output value", label: "total", value: formatValue(result) };

  return columnGraph({
    id: `sumBy-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: "add every callback result into one number",
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

function createExtremumByGraph({ fnId, input, result, callbackContext }) {
  const isMax = fnId === "maxBy";
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const referencedKeys = getItemPropertyReferences(callbackContext.resolvedExpression);
  const callbackValues = input.map((item, index) => callbackContext.run(item, index, input));
  const resultIndex = input.indexOf(result);
  const resultValue = resultIndex === -1 ? undefined : callbackValues[resultIndex];
  const inputNodes = input.map((item, index) => ({
    ...itemNode(item, index),
    fields: objectFields(item, { selectedKeys: referencedKeys.filter((key) => Object.prototype.hasOwnProperty.call(item || {}, key)) })
  }));
  const keyNodes = input.map((item, index) => {
    const isWinner = index === resultIndex;
    return {
      id: `key-${index}`,
      kind: "key",
      tone: isWinner ? "tone-green" : toneForIndex(index),
      eyebrow: getItemLabel(item, index),
      label: formatValue(callbackValues[index]),
      value: isWinner ? `selected ${isMax ? "max" : "min"}` : expressionLabel
    };
  });
  const outputNode =
    result && typeof result === "object" && !Array.isArray(result)
      ? {
          id: "selected",
          kind: "object",
          tone: "tone-green",
          eyebrow: "output item",
          label: getItemLabel(result, resultIndex),
          value: `${isMax ? "largest" : "smallest"} ${formatValue(resultValue)}`,
          fields: objectFields(result, { valueOnly: true }),
          meta: { result, resultIndex, resultValue }
        }
      : {
          id: "selected",
          kind: "value",
          tone: "tone-coral",
          eyebrow: "output item",
          label: "undefined",
          value: "no input items",
          meta: { result, resultIndex, resultValue }
        };

  return columnGraph({
    id: `${fnId}-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: `compare callback values and return the ${isMax ? "largest" : "smallest"} item`,
    columns: [
      ["input", "Input array", inputNodes],
      ["key", "Comparison value", keyNodes],
      ["output", "Selected item", [outputNode]]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `input-${index}`, `key-${index}`, keyNodes[index].tone, "read key", index)),
      ...input.map((_, index) => edge(`compare-${index}`, `key-${index}`, "selected", keyNodes[index].tone, index === resultIndex ? "winner" : "compare", index + input.length))
    ]
  });
}

function createMeanByGraph({ input, result, callbackContext }) {
  const callbackValues = input.map((item, index) => Number(callbackContext.run(item, index, input)) || 0);
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const valueNodes = input.map((item, index) => ({
    id: `value-${index}`,
    kind: "field",
    tone: toneForIndex(index),
    eyebrow: getItemLabel(item, index),
    label: formatValue(callbackValues[index]),
    value: expressionLabel
  }));
  let running = 0;
  const accumulatorNodes = input.map((item, index) => {
    running += callbackValues[index];
    return {
      id: `mean-${index}`,
      kind: "operator",
      tone: toneForIndex(index),
      eyebrow: "sum / count",
      label: `sum ${formatValue(running)}`,
      value: formatCount(index + 1, "value")
    };
  });
  const total = callbackValues.reduce((sum, value) => sum + value, 0);
  const meanNode = {
    id: "mean",
    kind: "value",
    tone: "tone-green",
    eyebrow: "output value",
    label: "average",
    value: input.length ? `${formatValue(total)} / ${formatCount(input, "item")} = ${formatValue(result)}` : formatValue(result)
  };

  return columnGraph({
    id: `meanBy-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: "sum callback values and divide by item count",
    columns: [
      ["value", "Input values", valueNodes],
      ["acc", "Running sum", accumulatorNodes],
      ["output", "Average", [meanNode]]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `value-${index}`, `mean-${index}`, toneForIndex(index), "add", index)),
      ...input.map((_, index) => edge(`route-${index}`, `mean-${index}`, "mean", toneForIndex(index), "average", index + input.length))
    ]
  });
}

function createTakeDropGraph({ fnId, input, result }) {
  const size = 3;
  const isTake = fnId === "take";
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const indexNodes = input.map((item, index) => {
    const kept = isTake ? index < size : index >= size;
    return {
      id: `index-${index}`,
      kind: "operator",
      tone: kept ? "tone-green" : "tone-coral",
      eyebrow: "index boundary",
      label: `index ${index}`,
      value: kept ? "keep" : "drop"
    };
  });
  const outputIndexes = new Map();
  result.forEach((item, index) => outputIndexes.set(item, index));
  const outputNodes = input.map((item, index) => {
    const kept = isTake ? index < size : index >= size;
    return {
      id: `out-${index}`,
      kind: kept ? "object" : "bucket",
      tone: kept ? "tone-green" : "tone-coral",
      eyebrow: kept ? `output[${outputIndexes.get(item) ?? 0}]` : "not included",
      label: kept ? getItemLabel(item, index) : "dropped",
      value: kept ? `input[${index}] kept` : `input[${index}] removed`
    };
  });

  return columnGraph({
    id: `${fnId}-${size}`,
    title: isTake ? `keep the first ${size} items` : `drop the first ${size} items`,
    columns: [
      ["input", "Input array", inputNodes],
      ["index", "Index check", indexNodes],
      ["output", "Output array", outputNodes]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `input-${index}`, `index-${index}`, indexNodes[index].tone, "index", index)),
      ...input.map((_, index) => edge(`route-${index}`, `index-${index}`, `out-${index}`, indexNodes[index].tone, indexNodes[index].value, index + input.length))
    ]
  });
}

function createKeyByGraph({ input, result, callbackContext }) {
  const propertyKeys = input.map((item, index) => String(callbackContext.run(item, index, input)));
  const expressionLabel = shortLabel(callbackContext.resolvedExpression, 28);
  const inputNodes = input.map((item, index) => ({
    ...itemNode(item, index),
    value: "whole item value",
    fields: objectFields(item),
    meta: { item }
  }));
  const keyNodes = input.map((item, index) => ({
    id: `key-${index}`,
    kind: "key",
    tone: toneForIndex(index),
    eyebrow: "callback key",
    label: propertyKeys[index],
    value: expressionLabel
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
    id: `keyBy-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: "callback result becomes the output object key",
    columns: [
      ["input", "Input array", inputNodes],
      ["key", "Property key", keyNodes],
      ["output", "Output object", outputNodes]
    ],
    edges: [
      ...input.map((_, index) => edge(`read-${index}`, `input-${index}`, `key-${index}`, toneForIndex(index), "read key", index)),
      ...input.map((_, index) => edge(`route-${index}`, `key-${index}`, `property-${safeGraphId(propertyKeys[index])}`, toneForIndex(index), "assign", index + input.length))
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

function createFlatMapGraph({ input, result, callbackContext }) {
  const inputNodes = input.map((item, index) => itemNode(item, index));
  const emitted = [];
  input.forEach((item, inputIndex) => {
    const callbackValue = callbackContext.run(item, inputIndex, input);
    emittedValues(callbackValue).forEach((value, valueIndex) => {
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
    id: `flatMap-${safeGraphId(callbackContext.resolvedExpression)}`,
    title: "callback emits values that are flattened into one array",
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

function emittedValues(value) {
  return Array.isArray(value) ? value : [value];
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
  if (["keep", "drop", "true", "false", "append", "assign", "winner"].includes(label)) return "route";
  if (["read key", "test", "index", "read id"].includes(label)) return "read";
  if (["rank 1", "rank 2", "rank 3", "rank 4", "rank 5", "rank 6"].includes(label)) return "reorder";
  if (["add", "average", "contribute", "fold", "carry", "return", "increment"].includes(label)) return "accumulate";
  if (["emit", "flatten"].includes(label)) return "emit";
  return label || "flow";
}

function phaseForEdgeKind(kind, label) {
  if (kind === "read") return 1;
  if (kind === "accumulate" && ["add", "fold", "carry", "increment"].includes(label)) return 2;
  if (kind === "emit" && label === "emit") return 2;
  return 3;
}

function safeGraphId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}
