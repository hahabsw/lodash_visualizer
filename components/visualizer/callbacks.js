const callbackEditorConfigs = {
  groupBy: {
    label: "Grouping callback",
    description: "Return the bucket key for each item.",
    defaultExpression: (_datasetName, groupKey) => `item.${groupKey || "id"}`
  },
  map: {
    label: "Map callback",
    description: "Return the mapped value or object for each item.",
    defaultExpression: () => "({ label: item.customer ?? item.name ?? item.page, value: item.total ?? item.score ?? item.value, source: item.id })"
  },
  filter: {
    label: "Predicate callback",
    description: "Return true to keep an item in the output array.",
    defaultExpression: (datasetName) => {
      if (datasetName === "orders") return "item.total >= 100";
      if (datasetName === "people") return "item.active === true";
      return 'item.device === "mobile"';
    }
  },
  orderBy: {
    label: "Sort callback",
    description: "Return the sort key for each item.",
    defaultExpression: (datasetName) => {
      if (datasetName === "events") return "item.minute";
      if (datasetName === "people") return "item.score";
      return "item.total";
    }
  },
  partition: {
    label: "Partition callback",
    description: "Return true for the first bucket and false for the second.",
    defaultExpression: (datasetName) => {
      if (datasetName === "orders") return 'item.status === "paid"';
      if (datasetName === "people") return "item.score >= 85";
      return 'item.device === "mobile"';
    }
  },
  uniqBy: {
    label: "Uniq callback",
    description: "Return the value used to detect duplicates.",
    defaultExpression: (datasetName) => {
      if (datasetName === "orders") return "item.region";
      if (datasetName === "people") return "item.team";
      return "item.page";
    }
  },
  sumBy: {
    label: "Sum callback",
    description: "Return the number to add for each item.",
    defaultExpression: (datasetName) => {
      if (datasetName === "people") return "item.score";
      if (datasetName === "events") return "item.value";
      return "item.total";
    }
  },
  keyBy: {
    label: "Key callback",
    description: "Return the output object key for each item.",
    defaultExpression: () => "item.id"
  },
  flatMap: {
    label: "FlatMap callback",
    description: "Return a value or an array of values to emit.",
    defaultExpression: (datasetName) => {
      if (datasetName === "orders") return "item.items";
      if (datasetName === "people") return "item.skills";
      return "[item.page, item.kind]";
    }
  }
};

export const callbackEnabledFunctionIds = new Set(Object.keys(callbackEditorConfigs));

export function hasCallbackEditor(fnId) {
  return callbackEnabledFunctionIds.has(fnId);
}

export function buildCallbackExpressionKey(fnId, datasetName) {
  return `${fnId}:${datasetName}`;
}

export function getDefaultCallbackExpression(fnId, datasetName, groupKey) {
  const config = callbackEditorConfigs[fnId];
  if (!config) return "";
  return config.defaultExpression(datasetName, groupKey);
}

export function getCallbackEditorMeta(fnId, datasetName, groupKey) {
  const config = callbackEditorConfigs[fnId];

  if (!config) {
    return null;
  }

  return {
    label: config.label,
    description: config.description,
    note: "Use item, index, array.",
    defaultExpression: config.defaultExpression(datasetName, groupKey)
  };
}

export function buildCallbackContext({ fnId, datasetName, groupKey, input, expression }) {
  const meta = getCallbackEditorMeta(fnId, datasetName, groupKey);

  if (!meta) {
    return null;
  }

  const nextExpression = expression?.trim() ? expression : meta.defaultExpression;
  const fallbackRunner = compileExpression(meta.defaultExpression);
  let runner = fallbackRunner;
  let resolvedExpression = meta.defaultExpression;
  let errorMessage = null;

  try {
    const candidate = compileExpression(nextExpression);

    (input || []).forEach((item, index, array) => {
      candidate(item, index, array);
    });

    runner = candidate;
    resolvedExpression = nextExpression;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Invalid callback expression";
  }

  return {
    fnId,
    label: meta.label,
    description: meta.description,
    note: meta.note,
    inputExpression: nextExpression,
    resolvedExpression,
    defaultExpression: meta.defaultExpression,
    errorMessage,
    usesFallback: resolvedExpression !== nextExpression,
    run: runner
  };
}

export function getSimpleItemPropertyExpression(expression) {
  const match = expression?.trim().match(/^item\.([A-Za-z_$][\w$]*)$/);
  return match ? match[1] : null;
}

export function getItemPropertyReferences(expression) {
  const matches = expression?.matchAll(/\bitem\.([A-Za-z_$][\w$]*)\b/g) || [];
  return [...new Set([...matches].map((match) => match[1]))];
}

function compileExpression(expression) {
  return new Function("item", "index", "array", `return (${expression});`);
}