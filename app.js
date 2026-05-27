const datasets = {
  orders: [
    { id: "A-101", customer: "Mina", status: "paid", total: 128, items: ["desk", "lamp"], region: "Seoul", priority: 2 },
    { id: "A-102", customer: "Joon", status: "pending", total: 76, items: ["chair"], region: "Busan", priority: 3 },
    { id: "A-103", customer: "Ara", status: "paid", total: 214, items: ["monitor", "arm"], region: "Seoul", priority: 1 },
    { id: "A-104", customer: "Noah", status: "refunded", total: 48, items: ["cable"], region: "Jeju", priority: 4 },
    { id: "A-105", customer: "Sora", status: "pending", total: 165, items: ["shelf", "box"], region: "Daegu", priority: 2 },
    { id: "A-106", customer: "Liam", status: "paid", total: 92, items: ["lamp"], region: "Seoul", priority: 5 }
  ],
  people: [
    { id: "P-01", name: "Ivy", team: "Design", skills: ["figma", "motion"], score: 91, active: true },
    { id: "P-02", name: "Theo", team: "Data", skills: ["sql", "python"], score: 84, active: true },
    { id: "P-03", name: "Nari", team: "Design", skills: ["research"], score: 77, active: false },
    { id: "P-04", name: "Ken", team: "Frontend", skills: ["react", "css"], score: 96, active: true },
    { id: "P-05", name: "Yuna", team: "Data", skills: ["python", "viz"], score: 88, active: false },
    { id: "P-06", name: "Sol", team: "Frontend", skills: ["react", "testing"], score: 82, active: true }
  ],
  events: [
    { id: "E-01", kind: "click", page: "Home", value: 1, device: "mobile", minute: 1 },
    { id: "E-02", kind: "view", page: "Pricing", value: 3, device: "desktop", minute: 3 },
    { id: "E-03", kind: "click", page: "Docs", value: 2, device: "desktop", minute: 4 },
    { id: "E-04", kind: "submit", page: "Pricing", value: 7, device: "mobile", minute: 7 },
    { id: "E-05", kind: "view", page: "Home", value: 2, device: "tablet", minute: 9 },
    { id: "E-06", kind: "click", page: "Docs", value: 4, device: "mobile", minute: 11 }
  ]
};

const tones = ["tone-teal", "tone-coral", "tone-gold", "tone-violet", "tone-green"];

const groupKeyDefaults = {
  orders: "status",
  people: "team",
  events: "kind"
};

const preferredGroupKeys = {
  orders: ["status", "region", "priority", "customer"],
  people: ["team", "active", "score", "skills"],
  events: ["kind", "page", "device", "minute"]
};

const functions = [
  {
    id: "groupBy",
    name: "_.groupBy",
    category: "Collection",
    flow: "group",
    signature: (datasetName) => `_.groupBy(${datasetName}, "${getActiveGroupKey()}")`,
    code: () => {
      const key = getActiveGroupKey();
      return `const key = "${key}";\nconst result = _.groupBy(input, key);`;
    },
    run: (input) => _.groupBy(input, getActiveGroupKey()),
    isIncluded: () => true
  },
  {
    id: "map",
    name: "_.map",
    category: "Collection",
    flow: "shape",
    signature: (datasetName) => `_.map(${datasetName}, item => pickLabel(item))`,
    code: () => `const result = _.map(input, item => ({\n  label: item.customer || item.name || item.page,\n  value: item.total || item.score || item.value\n}));`,
    run: (input) =>
      _.map(input, (item) => ({
        label: item.customer || item.name || item.page,
        value: item.total ?? item.score ?? item.value,
        source: item.id
      })),
    isIncluded: () => true
  },
  {
    id: "filter",
    name: "_.filter",
    category: "Collection",
    flow: "keep",
    signature: (datasetName) =>
      datasetName === "orders"
        ? '_.filter(orders, order => order.total >= 100)'
        : datasetName === "people"
          ? "_.filter(people, { active: true })"
          : '_.filter(events, event => event.device === "mobile")',
    code: (datasetName) => {
      if (datasetName === "orders") return "const result = _.filter(input, item => item.total >= 100);";
      if (datasetName === "people") return "const result = _.filter(input, { active: true });";
      return 'const result = _.filter(input, item => item.device === "mobile");';
    },
    run: (input, datasetName) => {
      if (datasetName === "orders") return _.filter(input, (item) => item.total >= 100);
      if (datasetName === "people") return _.filter(input, { active: true });
      return _.filter(input, (item) => item.device === "mobile");
    },
    isIncluded: (item, datasetName) => {
      if (datasetName === "orders") return item.total >= 100;
      if (datasetName === "people") return item.active;
      return item.device === "mobile";
    }
  },
  {
    id: "orderBy",
    name: "_.orderBy",
    category: "Collection",
    flow: "sort",
    signature: (datasetName) => `_.orderBy(${datasetName}, ["${datasetName === "events" ? "minute" : datasetName === "people" ? "score" : "total"}"], ["desc"])`,
    code: (datasetName) => {
      const key = datasetName === "events" ? "minute" : datasetName === "people" ? "score" : "total";
      return `const result = _.orderBy(input, ["${key}"], ["desc"]);`;
    },
    run: (input, datasetName) => _.orderBy(input, [datasetName === "events" ? "minute" : datasetName === "people" ? "score" : "total"], ["desc"]),
    isIncluded: () => true
  },
  {
    id: "partition",
    name: "_.partition",
    category: "Collection",
    flow: "split",
    signature: (datasetName) =>
      datasetName === "orders"
        ? '_.partition(orders, { status: "paid" })'
        : datasetName === "people"
          ? "_.partition(people, item => item.score >= 85)"
          : '_.partition(events, { device: "mobile" })',
    code: (datasetName) => {
      if (datasetName === "orders") return 'const result = _.partition(input, { status: "paid" });';
      if (datasetName === "people") return "const result = _.partition(input, item => item.score >= 85);";
      return 'const result = _.partition(input, { device: "mobile" });';
    },
    run: (input, datasetName) => {
      if (datasetName === "orders") return _.partition(input, { status: "paid" });
      if (datasetName === "people") return _.partition(input, (item) => item.score >= 85);
      return _.partition(input, { device: "mobile" });
    },
    isIncluded: (item, datasetName) => {
      if (datasetName === "orders") return item.status === "paid";
      if (datasetName === "people") return item.score >= 85;
      return item.device === "mobile";
    }
  },
  {
    id: "chunk",
    name: "_.chunk",
    category: "Array",
    flow: "batch",
    signature: (datasetName) => `_.chunk(${datasetName}, 2)`,
    code: () => "const result = _.chunk(input, 2);",
    run: (input) => _.chunk(input, 2),
    isIncluded: () => true
  },
  {
    id: "uniqBy",
    name: "_.uniqBy",
    category: "Array",
    flow: "dedupe",
    signature: (datasetName) => `_.uniqBy(${datasetName}, "${datasetName === "orders" ? "region" : datasetName === "people" ? "team" : "page"}")`,
    code: (datasetName) => {
      const key = datasetName === "orders" ? "region" : datasetName === "people" ? "team" : "page";
      return `const result = _.uniqBy(input, "${key}");`;
    },
    run: (input, datasetName) => _.uniqBy(input, datasetName === "orders" ? "region" : datasetName === "people" ? "team" : "page"),
    isIncluded: (item, datasetName, input) => {
      const key = datasetName === "orders" ? "region" : datasetName === "people" ? "team" : "page";
      return _.findIndex(input, [key, item[key]]) === input.indexOf(item);
    }
  },
  {
    id: "sumBy",
    name: "_.sumBy",
    category: "Math",
    flow: "sum",
    signature: (datasetName) => `_.sumBy(${datasetName}, "${datasetName === "people" ? "score" : datasetName === "events" ? "value" : "total"}")`,
    code: (datasetName) => {
      const key = datasetName === "people" ? "score" : datasetName === "events" ? "value" : "total";
      return `const result = _.sumBy(input, "${key}");`;
    },
    run: (input, datasetName) => _.sumBy(input, datasetName === "people" ? "score" : datasetName === "events" ? "value" : "total"),
    isIncluded: () => true
  },
  {
    id: "keyBy",
    name: "_.keyBy",
    category: "Collection",
    flow: "index",
    signature: (datasetName) => `_.keyBy(${datasetName}, "id")`,
    code: () => 'const result = _.keyBy(input, "id");',
    run: (input) => _.keyBy(input, "id"),
    isIncluded: () => true
  },
  {
    id: "flatMap",
    name: "_.flatMap",
    category: "Collection",
    flow: "expand",
    signature: (datasetName) =>
      datasetName === "orders"
        ? "_.flatMap(orders, order => order.items)"
        : datasetName === "people"
          ? "_.flatMap(people, person => person.skills)"
          : "_.flatMap(events, event => [event.page, event.kind])",
    code: (datasetName) => {
      if (datasetName === "orders") return "const result = _.flatMap(input, item => item.items);";
      if (datasetName === "people") return "const result = _.flatMap(input, item => item.skills);";
      return "const result = _.flatMap(input, item => [item.page, item.kind]);";
    },
    run: (input, datasetName) => {
      if (datasetName === "orders") return _.flatMap(input, (item) => item.items);
      if (datasetName === "people") return _.flatMap(input, (item) => item.skills);
      return _.flatMap(input, (item) => [item.page, item.kind]);
    },
    isIncluded: () => true
  }
];

const state = {
  datasetName: "orders",
  fnId: "groupBy",
  groupKeys: { ...groupKeyDefaults },
  input: _.cloneDeep(datasets.orders)
};

const els = {
  functionList: document.querySelector("#functionList"),
  categoryLabel: document.querySelector("#categoryLabel"),
  functionTitle: document.querySelector("#functionTitle"),
  signatureText: document.querySelector("#signatureText"),
  resultMeta: document.querySelector("#resultMeta"),
  codePreview: document.querySelector("#codePreview"),
  inputStage: document.querySelector("#inputStage"),
  outputStage: document.querySelector("#outputStage"),
  inputCount: document.querySelector("#inputCount"),
  outputCount: document.querySelector("#outputCount"),
  flowNode: document.querySelector("#flowNode"),
  groupByLab: document.querySelector("#groupByLab"),
  groupDataFlowDiagram: document.querySelector("#groupDataFlowDiagram"),
  groupBlockFlow: document.querySelector("#groupBlockFlow"),
  groupInputBlocks: document.querySelector("#groupInputBlocks"),
  groupExtractorCode: document.querySelector("#groupExtractorCode"),
  groupKeyBlocks: document.querySelector("#groupKeyBlocks"),
  groupRouteBlocks: document.querySelector("#groupRouteBlocks"),
  groupOutputBlocks: document.querySelector("#groupOutputBlocks"),
  groupKeySelector: document.querySelector("#groupKeySelector"),
  groupKeySummary: document.querySelector("#groupKeySummary"),
  groupTraceCount: document.querySelector("#groupTraceCount"),
  groupTraceList: document.querySelector("#groupTraceList"),
  groupBucketCount: document.querySelector("#groupBucketCount"),
  groupBucketBoard: document.querySelector("#groupBucketBoard"),
  jsonEditor: document.querySelector("#jsonEditor"),
  jsonStatus: document.querySelector("#jsonStatus"),
  resultJson: document.querySelector("#resultJson"),
  resultSize: document.querySelector("#resultSize"),
  playButton: document.querySelector("#playButton"),
  resetButton: document.querySelector("#resetButton")
};

function bootstrap() {
  renderFunctionList();
  bindEvents();
  setEditorFromState();
  render();
}

function bindEvents() {
  document.querySelectorAll("[data-dataset]").forEach((button) => {
    button.addEventListener("click", () => {
      state.datasetName = button.dataset.dataset;
      state.input = _.cloneDeep(datasets[state.datasetName]);
      ensureGroupKey();
      document.querySelectorAll("[data-dataset]").forEach((item) => item.classList.toggle("is-active", item === button));
      setEditorFromState();
      render();
    });
  });

  els.groupKeySelector.addEventListener("click", (event) => {
    const button = event.target.closest("[data-group-key]");
    if (!button) return;
    state.groupKeys[state.datasetName] = button.dataset.groupKey;
    render();
  });

  els.playButton.addEventListener("click", render);
  els.resetButton.addEventListener("click", () => {
    state.input = _.cloneDeep(datasets[state.datasetName]);
    setEditorFromState();
    render();
  });

  els.jsonEditor.addEventListener("input", _.debounce(() => {
    try {
      const parsed = JSON.parse(els.jsonEditor.value);
      if (!Array.isArray(parsed)) throw new Error("Root must be an array");
      state.input = parsed;
      els.jsonStatus.textContent = "valid";
      els.jsonStatus.style.color = "";
      render(false);
    } catch (error) {
      els.jsonStatus.textContent = "invalid";
      els.jsonStatus.style.color = "#b53224";
    }
  }, 180));
}

function renderFunctionList() {
  els.functionList.innerHTML = functions
    .map(
      (fn) => `
        <button class="function-button${fn.id === state.fnId ? " is-active" : ""}" type="button" data-fn="${fn.id}">
          <span>${fn.name}</span>
          <small>${fn.category}</small>
        </button>
      `
    )
    .join("");

  els.functionList.querySelectorAll("[data-fn]").forEach((button) => {
    button.addEventListener("click", () => {
      state.fnId = button.dataset.fn;
      els.functionList.querySelectorAll("[data-fn]").forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });
}

function render(resetAnimation = true) {
  const fn = getActiveFunction();
  if (fn.id === "groupBy") ensureGroupKey();
  const result = fn.run(state.input, state.datasetName);
  const resultText = JSON.stringify(result, null, 2);

  els.categoryLabel.textContent = fn.category;
  els.functionTitle.textContent = fn.name;
  els.signatureText.textContent = fn.signature(state.datasetName);
  els.codePreview.textContent = fn.code(state.datasetName);
  els.flowNode.textContent = fn.flow;
  els.inputCount.textContent = formatCount(state.input, "item");
  els.outputCount.textContent = summarizeResult(result);
  els.resultMeta.textContent = summarizeResult(result);
  els.resultJson.textContent = resultText;
  els.resultSize.textContent = `${resultText.length} chars`;

  renderInputCards(fn, resetAnimation);
  renderGroupByDetail(fn, result, resetAnimation);
  renderOutput(result, resetAnimation);
}

function renderInputCards(fn, resetAnimation) {
  const highlightKey = fn.id === "groupBy" ? getActiveGroupKey() : null;
  els.inputStage.innerHTML = state.input
    .map((item, index) => cardTemplate(item, index, !fn.isIncluded(item, state.datasetName, state.input), highlightKey))
    .join("");
  if (resetAnimation) restartAnimations(els.inputStage);
}

function renderGroupByDetail(fn, result, resetAnimation) {
  const isGroupBy = fn.id === "groupBy";
  els.groupByLab.hidden = !isGroupBy;
  if (!isGroupBy) return;

  const groupKey = getActiveGroupKey();
  const trace = buildGroupTrace(state.input, groupKey);
  const entries = Object.entries(result);
  const groupKeys = entries.map(([key]) => key);
  const values = groupKeys.join(", ") || "no buckets";

  els.groupKeySummary.textContent = `item.${groupKey} -> ${values}`;
  els.groupTraceCount.textContent = formatCount(trace, "flow");
  els.groupBucketCount.textContent = formatCount(entries, "bucket");
  renderGroupKeySelector();
  renderGroupBlockFlow(trace, entries, groupKeys, groupKey);

  els.groupTraceList.innerHTML = trace.map((step, index) => traceStepTemplate(step, groupKeys, index)).join("");
  els.groupBucketBoard.innerHTML = entries.map(([key, items], index) => bucketTemplate(key, items, index)).join("");

  if (resetAnimation) restartAnimations(els.groupByLab);
}

function renderOutput(result, resetAnimation) {
  if (Array.isArray(result)) {
    els.outputStage.innerHTML = result.map((item, index) => renderArrayResult(item, index)).join("");
  } else if (_.isPlainObject(result)) {
    els.outputStage.innerHTML = Object.entries(result)
      .map(([key, value], index) => groupTemplate(key, value, index))
      .join("");
  } else {
    els.outputStage.innerHTML = scalarTemplate(result);
  }

  if (resetAnimation) restartAnimations(els.outputStage);
}

function renderArrayResult(item, index) {
  if (Array.isArray(item)) return groupTemplate(`batch ${index + 1}`, item, index);
  if (_.isPlainObject(item)) return cardTemplate(item, index, false);
  return primitiveTemplate(item, index);
}

function cardTemplate(item, index, muted, highlightKey = null) {
  const title = item.id || item.name || item.customer || item.page || `item ${index + 1}`;
  const subtitle = item.status || item.team || item.kind || item.device || "object";
  const fields = Object.entries(item)
    .slice(0, 6)
    .map(
      ([key, value]) =>
        `<span class="field-chip${key === highlightKey ? " is-key-field" : ""}"><mark>${escapeHtml(key)}</mark>: ${escapeHtml(formatValue(value))}</span>`
    )
    .join("");

  return `
    <article class="data-card${muted ? " is-muted" : ""}" style="--delay:${index * 48}ms">
      <div class="card-title">
        <span>${escapeHtml(String(title))}</span>
        <em class="pill">${escapeHtml(String(subtitle))}</em>
      </div>
      <div class="field-grid">${fields}</div>
    </article>
  `;
}

function groupTemplate(key, value, index) {
  const items = Array.isArray(value) ? value : [value];
  const body = items
    .map((item) => {
      if (_.isPlainObject(item)) {
        const label = item.id || item.name || item.customer || item.page || "object";
        const metric = item.total ?? item.score ?? item.value ?? item.status ?? item.team ?? "";
        return `<div class="mini-card"><strong>${escapeHtml(String(label))}</strong><span>${escapeHtml(formatValue(metric))}</span></div>`;
      }
      return `<div class="mini-card"><strong>${escapeHtml(formatValue(item))}</strong><span>value</span></div>`;
    })
    .join("");

  return `
    <article class="group-card ${tones[index % tones.length]}" style="--delay:${index * 72}ms">
      <div class="group-head">
        <span>${escapeHtml(String(key))}</span>
        <small>${formatCount(items, "item")}</small>
      </div>
      <div class="group-body">${body}</div>
    </article>
  `;
}

function primitiveTemplate(value, index) {
  return `
    <article class="data-card" style="--delay:${index * 42}ms">
      <div class="card-title">
        <span>${escapeHtml(formatValue(value))}</span>
        <em class="pill">value</em>
      </div>
    </article>
  `;
}

function scalarTemplate(value) {
  return `
    <article class="group-card tone-green" style="--delay:0ms">
      <div class="group-head">
        <span>total</span>
        <small>number</small>
      </div>
      <div class="group-body">
        <div class="mini-card"><strong>${escapeHtml(formatValue(value))}</strong><span>sum</span></div>
      </div>
    </article>
  `;
}

function renderGroupKeySelector() {
  const keys = getGroupKeyChoices();
  const activeKey = getActiveGroupKey();
  els.groupKeySelector.innerHTML = keys
    .map(
      (key) => `
        <button class="key-button${key === activeKey ? " is-active" : ""}" type="button" data-group-key="${escapeHtml(key)}">
          ${escapeHtml(key)}
        </button>
      `
    )
    .join("");
}

function renderGroupBlockFlow(trace, entries, groupKeys, groupKey) {
  els.groupDataFlowDiagram.innerHTML = dataFlowDiagramTemplate(trace, entries, groupKeys, groupKey);
  els.groupExtractorCode.textContent = `item.${groupKey}`;
  els.groupInputBlocks.innerHTML = trace.map((step, index) => processItemBlockTemplate(step, groupKeys, index)).join("");
  els.groupKeyBlocks.innerHTML = trace.map((step, index) => keyBlockTemplate(step, groupKeys, index)).join("");
  els.groupRouteBlocks.innerHTML = trace.map((step, index) => routeBlockTemplate(step, groupKeys, index)).join("");
  els.groupOutputBlocks.innerHTML = entries.map(([key, items], index) => objectRowTemplate(key, items, index)).join("");
}

function dataFlowDiagramTemplate(trace, entries, groupKeys, groupKey) {
  const rowGap = 76;
  const top = 70;
  const itemHeight = 48;
  const bucketHeight = 74;
  const height = Math.max(340, top * 2 + Math.max(0, trace.length - 1) * rowGap, top * 2 + Math.max(0, entries.length - 1) * 112);
  const itemX = 28;
  const keyX = 330;
  const bucketX = 748;
  const itemWidth = 188;
  const keyWidth = 160;
  const bucketWidth = 238;
  const bucketStep = entries.length > 1 ? (height - top * 2) / (entries.length - 1) : 0;
  const bucketPositions = Object.fromEntries(entries.map(([key], index) => [String(key), entries.length > 1 ? top + index * bucketStep : height / 2]));

  const itemNodes = trace.map((step, index) => flowSvgItem(step, groupKeys, index, itemX, top + index * rowGap, itemWidth, itemHeight)).join("");
  const keyNodes = trace.map((step, index) => flowSvgKey(step, groupKeys, index, groupKey, keyX, top + index * rowGap, keyWidth, itemHeight)).join("");
  const inputLinks = trace.map((step, index) => flowSvgInputLink(step, groupKeys, index, itemX + itemWidth, top + index * rowGap, keyX)).join("");
  const bucketLinks = trace
    .map((step, index) => flowSvgBucketLink(step, groupKeys, index, keyX + keyWidth, top + index * rowGap, bucketX, bucketPositions[step.keyValue]))
    .join("");
  const bucketNodes = entries.map(([key, items], index) => flowSvgBucket(key, items, index, bucketX, bucketPositions[String(key)], bucketWidth, bucketHeight)).join("");

  return `
    <svg class="flow-svg" viewBox="0 0 1024 ${height}" role="img" aria-label="Input data blocks converge into grouped output buckets">
      <defs>
        <marker id="arrow-teal" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
          <path d="M2,2 L10,6 L2,10 Z" fill="#138f8f"></path>
        </marker>
        <marker id="arrow-coral" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
          <path d="M2,2 L10,6 L2,10 Z" fill="#df634f"></path>
        </marker>
        <marker id="arrow-gold" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
          <path d="M2,2 L10,6 L2,10 Z" fill="#b9831f"></path>
        </marker>
        <marker id="arrow-violet" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
          <path d="M2,2 L10,6 L2,10 Z" fill="#6f58c9"></path>
        </marker>
        <marker id="arrow-green" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
          <path d="M2,2 L10,6 L2,10 Z" fill="#3d8b49"></path>
        </marker>
      </defs>
      <text class="flow-svg-label" x="${itemX}" y="28">Input item blocks</text>
      <text class="flow-svg-label" x="${keyX}" y="28">Grouping value: item.${escapeHtml(groupKey)}</text>
      <text class="flow-svg-label" x="${bucketX}" y="28">Output buckets</text>
      ${inputLinks}
      ${bucketLinks}
      ${itemNodes}
      ${keyNodes}
      ${bucketNodes}
    </svg>
  `;
}

function flowSvgItem(step, groupKeys, index, x, centerY, width, height) {
  const tone = toneForKey(step.keyValue, groupKeys);
  const y = centerY - height / 2;
  return `
    <g class="flow-svg-node flow-svg-item ${tone}" style="--delay:${index * 70}ms">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8"></rect>
      <text class="flow-svg-title" x="${x + 12}" y="${y + 20}">${escapeHtml(shortLabel(step.itemLabel, 20))}</text>
      <text class="flow-svg-subtitle" x="${x + 12}" y="${y + 38}">${escapeHtml(shortLabel(getItemSubtitle(step.item), 22))}</text>
    </g>
  `;
}

function flowSvgKey(step, groupKeys, index, groupKey, x, centerY, width, height) {
  const tone = toneForKey(step.keyValue, groupKeys);
  const y = centerY - height / 2;
  const value = normalizeGroupValue(getItemValue(step.item, groupKey));
  return `
    <g class="flow-svg-node flow-svg-key ${tone}" style="--delay:${120 + index * 70}ms">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8"></rect>
      <text class="flow-svg-code" x="${x + 12}" y="${y + 20}">${escapeHtml(shortLabel(groupKey, 16))}</text>
      <text class="flow-svg-title" x="${x + 12}" y="${y + 38}">${escapeHtml(shortLabel(value, 18))}</text>
    </g>
  `;
}

function flowSvgBucket(key, items, index, x, centerY, width, height) {
  const y = centerY - height / 2;
  const labels = items.map((item, itemIndex) => getItemLabel(item, itemIndex)).join(", ");
  return `
    <g class="flow-svg-node flow-svg-bucket ${tones[index % tones.length]}" style="--delay:${240 + index * 90}ms">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8"></rect>
      <text class="flow-svg-title" x="${x + 12}" y="${y + 23}">${escapeHtml(shortLabel(String(key), 24))}</text>
      <text class="flow-svg-subtitle" x="${x + 12}" y="${y + 43}">${formatCount(items, "item")}</text>
      <text class="flow-svg-items" x="${x + 12}" y="${y + 62}">${escapeHtml(shortLabel(`[${labels}]`, 30))}</text>
    </g>
  `;
}

function flowSvgInputLink(step, groupKeys, index, startX, centerY, endX) {
  const tone = toneForKey(step.keyValue, groupKeys);
  const marker = markerForTone(tone);
  return `
    <path class="flow-svg-path input-path ${tone}" style="--delay:${index * 70}ms" marker-end="url(#${marker})" d="M ${startX + 8} ${centerY} C ${startX + 44} ${centerY}, ${endX - 52} ${centerY}, ${endX - 10} ${centerY}"></path>
  `;
}

function flowSvgBucketLink(step, groupKeys, index, startX, startY, endX, endY) {
  const tone = toneForKey(step.keyValue, groupKeys);
  const marker = markerForTone(tone);
  const curve = Math.max(80, Math.abs(endY - startY) * 0.38);
  return `
    <path class="flow-svg-path bucket-path ${tone}" style="--delay:${160 + index * 70}ms" marker-end="url(#${marker})" d="M ${startX + 8} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX - 12} ${endY}"></path>
  `;
}

function toneForKey(keyValue, groupKeys) {
  return tones[Math.max(0, groupKeys.indexOf(keyValue)) % tones.length];
}

function markerForTone(tone) {
  return `arrow-${tone.replace("tone-", "")}`;
}

function shortLabel(value, maxLength) {
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}...` : text;
}

function buildGroupTrace(input, groupKey) {
  const buckets = {};
  return input.map((item, index) => {
    const rawValue = getItemValue(item, groupKey);
    const keyValue = normalizeGroupValue(rawValue);
    const hadBucket = Object.prototype.hasOwnProperty.call(buckets, keyValue);
    buckets[keyValue] = buckets[keyValue] || [];
    buckets[keyValue].push(item);

    return {
      item,
      itemIndex: index,
      itemLabel: getItemLabel(item, index),
      keyName: groupKey,
      keyValue,
      created: !hadBucket,
      bucketSize: buckets[keyValue].length
    };
  });
}

function processItemBlockTemplate(step, groupKeys, index) {
  const tone = tones[Math.max(0, groupKeys.indexOf(step.keyValue)) % tones.length];
  const fieldValue = normalizeGroupValue(getItemValue(step.item, step.keyName));

  return `
    <div class="process-block item-process-block ${tone}" style="--delay:${index * 65}ms">
      <strong>${escapeHtml(step.itemLabel)}</strong>
      <span>${escapeHtml(step.keyName)}: ${escapeHtml(fieldValue)}</span>
    </div>
  `;
}

function keyBlockTemplate(step, groupKeys, index) {
  const tone = tones[Math.max(0, groupKeys.indexOf(step.keyValue)) % tones.length];
  return `
    <div class="process-block key-process-block ${tone}" style="--delay:${120 + index * 65}ms">
      <code>${escapeHtml(step.keyName)}</code>
      <strong>${escapeHtml(step.keyValue)}</strong>
    </div>
  `;
}

function routeBlockTemplate(step, groupKeys, index) {
  const tone = tones[Math.max(0, groupKeys.indexOf(step.keyValue)) % tones.length];

  return `
    <div class="process-block route-process-block ${tone}" style="--delay:${240 + index * 65}ms">
      <span>${escapeHtml(step.itemLabel)}</span>
      <strong>${escapeHtml(step.keyValue)}</strong>
      <small>flows into bucket</small>
    </div>
  `;
}

function objectRowTemplate(key, items, index) {
  const labels = items.map((item, itemIndex) => getItemLabel(item, itemIndex)).join(", ");

  return `
    <div class="object-row ${tones[index % tones.length]}" style="--delay:${360 + index * 90}ms">
      <code>${escapeHtml(String(key))}</code>
      <span>[${escapeHtml(labels)}]</span>
    </div>
  `;
}

function traceStepTemplate(step, groupKeys, index) {
  const tone = tones[Math.max(0, groupKeys.indexOf(step.keyValue)) % tones.length];
  return `
    <article class="trace-step ${tone}" style="--delay:${index * 82}ms">
      <div class="step-index">${String(index + 1).padStart(2, "0")}</div>
      <div class="step-item">
        <strong>${escapeHtml(step.itemLabel)}</strong>
        <span>${escapeHtml(getItemSubtitle(step.item))}</span>
      </div>
      <div class="step-key">
        <code>item.${escapeHtml(step.keyName)}</code>
        <strong>${escapeHtml(step.keyValue)}</strong>
      </div>
      <div class="step-route" aria-hidden="true">&rarr;</div>
      <div class="step-bucket">
        <span class="bucket-dot"></span>
        <strong>${escapeHtml(step.keyValue)}</strong>
        <small>destination bucket</small>
      </div>
    </article>
  `;
}

function bucketTemplate(key, items, index) {
  const itemCards = items
    .map(
      (item, itemIndex) => `
        <div class="bucket-token" style="--delay:${(index * 120) + (itemIndex * 70)}ms">
          <span>${String(itemIndex + 1).padStart(2, "0")}</span>
          <strong>${escapeHtml(getItemLabel(item, itemIndex))}</strong>
        </div>
      `
    )
    .join("");

  return `
    <article class="bucket-column ${tones[index % tones.length]}" style="--delay:${index * 90}ms">
      <div class="bucket-column-head">
        <strong>${escapeHtml(String(key))}</strong>
        <span>${formatCount(items, "item")}</span>
      </div>
      <div class="bucket-stack">${itemCards}</div>
    </article>
  `;
}

function restartAnimations(container) {
  container.querySelectorAll(".data-card, .group-card, .trace-step, .bucket-column, .bucket-token, .process-block, .object-row, .flow-svg-node, .flow-svg-path").forEach((node) => {
    node.style.animation = "none";
    node.offsetHeight;
    node.style.animation = "";
  });
}

function setEditorFromState() {
  els.jsonEditor.value = JSON.stringify(state.input, null, 2);
  els.jsonStatus.textContent = "valid";
  els.jsonStatus.style.color = "";
}

function getActiveFunction() {
  return functions.find((fn) => fn.id === state.fnId) || functions[0];
}

function getActiveGroupKey() {
  return state.groupKeys[state.datasetName] || groupKeyDefaults[state.datasetName] || getGroupKeyChoices()[0] || "id";
}

function ensureGroupKey() {
  const choices = getGroupKeyChoices();
  const activeKey = state.groupKeys[state.datasetName];
  if (!activeKey || (choices.length && !choices.includes(activeKey))) {
    state.groupKeys[state.datasetName] = choices[0] || groupKeyDefaults[state.datasetName] || "id";
  }
}

function getGroupKeyChoices() {
  const discovered = [];
  state.input.forEach((item) => {
    if (!_.isPlainObject(item)) return;
    Object.keys(item).forEach((key) => {
      if (!discovered.includes(key)) discovered.push(key);
    });
  });

  const preferred = preferredGroupKeys[state.datasetName] || [];
  const keys = [...preferred, ...discovered].filter((key, index, list) => key && list.indexOf(key) === index);
  return keys.slice(0, 8);
}

function getItemValue(item, key) {
  if (!_.isPlainObject(item)) return undefined;
  return item[key];
}

function normalizeGroupValue(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return String(value);
  if (_.isPlainObject(value)) return JSON.stringify(value);
  return String(value);
}

function getItemLabel(item, index) {
  if (!_.isPlainObject(item)) return `item ${index + 1}`;
  return item.id || item.name || item.customer || item.page || `item ${index + 1}`;
}

function getItemSubtitle(item) {
  if (!_.isPlainObject(item)) return "value";
  return item.status || item.team || item.kind || item.device || item.region || "object";
}

function summarizeResult(result) {
  if (Array.isArray(result)) return formatCount(result, Array.isArray(result[0]) ? "batch" : "item");
  if (_.isPlainObject(result)) return formatCount(Object.keys(result), "group");
  return "1 value";
}

function formatCount(list, noun) {
  const count = Array.isArray(list) ? list.length : Number(list) || 0;
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function formatValue(value) {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (_.isPlainObject(value)) return JSON.stringify(value);
  return String(value);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.addEventListener("load", () => {
  if (!window._) {
    document.body.innerHTML = '<main class="fallback"><h1>Lodash CDN을 불러오지 못했습니다.</h1></main>';
    return;
  }

  bootstrap();
});
