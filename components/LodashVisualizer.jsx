"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { DataCard, ResultView } from "./visualizer/CommonViews";
import CallbackExpressionEditor from "./visualizer/CallbackExpressionEditor";
import { buildCallbackContext, buildCallbackExpressionKey, getCallbackEditorMeta, getSimpleItemPropertyExpression } from "./visualizer/callbacks";
import { datasets, defaultDatasetName, groupKeyDefaults } from "./visualizer/data";
import { createFunctionConfigs, defaultFunctionId } from "./visualizer/functionConfigs";
import GroupByLab from "./visualizer/GroupByLab";
import JsonWorkbench from "./visualizer/JsonWorkbench";
import MapLab from "./visualizer/MapLab";
import OperationGraphLab from "./visualizer/OperationGraphLab";
import { formatCount, getGroupKeyChoices, getItemLabel, summarizeResult } from "./visualizer/utils";

export default function LodashVisualizer({ activeFnId = defaultFunctionId, initialDatasetName = defaultDatasetName, initialVisualizationView = "graph" }) {
  const normalizedDatasetName = datasets[initialDatasetName] ? initialDatasetName : defaultDatasetName;
  const normalizedVisualizationView = initialVisualizationView === "io" ? "io" : "graph";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [datasetName, setDatasetName] = useState(normalizedDatasetName);
  const [input, setInput] = useState(() => _.cloneDeep(datasets[normalizedDatasetName]));
  const [editorContent, setEditorContent] = useState(() => ({ json: _.cloneDeep(datasets[normalizedDatasetName]) }));
  const [jsonStatus, setJsonStatus] = useState("valid");
  const [groupKeys, setGroupKeys] = useState(groupKeyDefaults);
  const [callbackExpressions, setCallbackExpressions] = useState({});
  const [animationSeed, setAnimationSeed] = useState(0);
  const [activeVisualizationTab, setActiveVisualizationTab] = useState(normalizedVisualizationView);

  const groupKeyChoices = useMemo(() => getGroupKeyChoices(input, datasetName), [input, datasetName]);
  const activeGroupKey = groupKeys[datasetName] || groupKeyChoices[0] || groupKeyDefaults[datasetName] || "id";

  useEffect(() => {
    if (groupKeyChoices.length && !groupKeyChoices.includes(activeGroupKey)) {
      setGroupKeys((prev) => ({ ...prev, [datasetName]: groupKeyChoices[0] }));
    }
  }, [activeGroupKey, datasetName, groupKeyChoices]);

  useEffect(() => {
    setActiveVisualizationTab(normalizedVisualizationView);
  }, [normalizedVisualizationView]);

  const functions = useMemo(() => createFunctionConfigs(activeGroupKey), [activeGroupKey]);
  const activeFn = functions.find((fn) => fn.id === activeFnId) || functions.find((fn) => fn.id === defaultFunctionId) || functions[0];
  const activeCallbackExpressionKey = useMemo(() => buildCallbackExpressionKey(activeFn.id, datasetName), [activeFn.id, datasetName]);
  const activeCallbackContext = useMemo(
    () => buildCallbackContext({ fnId: activeFn.id, datasetName, groupKey: activeGroupKey, input, expression: callbackExpressions[activeCallbackExpressionKey] }),
    [activeCallbackExpressionKey, activeFn.id, activeGroupKey, callbackExpressions, datasetName, input]
  );
  const activeCallbackMeta = useMemo(() => getCallbackEditorMeta(activeFn.id, datasetName, activeGroupKey), [activeFn.id, activeGroupKey, datasetName]);
  const result = useMemo(() => activeFn.run(input, datasetName, activeCallbackContext), [activeCallbackContext, activeFn, datasetName, input]);
  const resultText = JSON.stringify(result, null, 2);
  const datasetNames = useMemo(() => Object.keys(datasets), []);
  const showGroupByDetail = activeFn.id === "groupBy";
  const showMapDetail = activeFn.id === "map";
  const showUnifiedGraph = activeVisualizationTab === "graph";
  const showInputOutput = activeVisualizationTab === "io";
  const selectedGroupKey = showGroupByDetail ? getSimpleItemPropertyExpression(activeCallbackContext?.inputExpression) : null;

  function buildHref(fnId, nextDataset = datasetName, nextView = activeVisualizationTab) {
    const nextQuery = new URLSearchParams(searchParams?.toString() ?? "");
    nextQuery.set("dataset", nextDataset);
    nextQuery.set("view", nextView);
    return `/${fnId}?${nextQuery.toString()}`;
  }

  function updateUrl(nextDataset = datasetName, nextView = activeVisualizationTab) {
    router.replace(buildHref(activeFn.id, nextDataset, nextView), { scroll: false });
  }

  function selectVisualizationTab(nextView) {
    setActiveVisualizationTab(nextView);
    updateUrl(datasetName, nextView);
  }

  function selectDataset(nextDataset) {
    const nextInput = _.cloneDeep(datasets[nextDataset]);
    setDatasetName(nextDataset);
    setInput(nextInput);
    setEditorContent({ json: nextInput });
    setJsonStatus("valid");
    setAnimationSeed((seed) => seed + 1);
    updateUrl(nextDataset, activeVisualizationTab);
  }

  function resetJson() {
    const nextInput = _.cloneDeep(datasets[datasetName]);
    setInput(nextInput);
    setEditorContent({ json: nextInput });
    setJsonStatus("valid");
    setAnimationSeed((seed) => seed + 1);
  }

  function updateEditor(content, _previousContent, status) {
    setEditorContent(content);

    if (status?.contentErrors?.length) {
      setJsonStatus("invalid syntax");
      return;
    }

    try {
      const parsed = content.json;
      if (!Array.isArray(parsed)) throw new Error("Root must be an array");
      setInput(parsed);
      setJsonStatus("valid");
    } catch {
      setJsonStatus("root must be an array");
    }
  }

  function formatEditorJson() {
    const parsed = editorContent.json;

    if (parsed === undefined) {
      return;
    }

    updateEditor({ json: parsed, text: JSON.stringify(parsed, null, 2) }, editorContent, { contentErrors: undefined, patchResult: undefined });
  }

  function updateCallbackExpression(nextExpression) {
    setCallbackExpressions((prev) => ({ ...prev, [activeCallbackExpressionKey]: nextExpression }));
  }

  function resetCallbackExpression() {
    setCallbackExpressions((prev) => {
      const next = { ...prev };
      delete next[activeCallbackExpressionKey];
      return next;
    });
  }

  function applyCallbackQuickKey(key) {
    updateCallbackExpression(`item.${key}`);

    if (activeFn.id === "groupBy") {
      setGroupKeys((prev) => ({ ...prev, [datasetName]: key }));
      setAnimationSeed((seed) => seed + 1);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Lodash functions">
        <div className="brand">
          <span className="brand-mark">_</span>
          <div>
            <h1>Lodash Visualizer</h1>
            <p>data in motion</p>
          </div>
        </div>
        <nav className="function-list" aria-label="Function list">
          {functions.map((fn) => (
            <Link className={`function-button ${fn.id === activeFn.id ? "is-active" : ""}`} href={buildHref(fn.id)} key={fn.id}>
              <span>{fn.name}</span>
              <small>{fn.category}</small>
            </Link>
          ))}
        </nav>
      </aside>

      <section className="workbench">
        <header className="topbar">
          <div>
            <p className="eyebrow">{activeFn.category}</p>
            <h2>{activeFn.name}</h2>
          </div>
          <div className="control-strip">
            <button className="icon-button" type="button" aria-label="Replay animation" title="Replay" onClick={() => setAnimationSeed((seed) => seed + 1)}>
              <span aria-hidden="true">&#8635;</span>
            </button>
            <button className="text-button" type="button" onClick={resetJson}>
              Reset JSON
            </button>
          </div>
        </header>

        <section className="spotlight">
          <div className="signature-line">
            <code>{activeFn.signature(datasetName, activeCallbackContext)}</code>
            <span>{summarizeResult(result)}</span>
          </div>
          <div className="code-preview">{activeFn.code(datasetName, activeCallbackContext)}</div>
        </section>

        {activeCallbackMeta ? (
          <section className="callback-editor">
            <div className="callback-editor-head">
              <div>
                <span>{activeCallbackMeta.label}</span>
                <strong style={{ color: activeCallbackContext?.errorMessage ? "#a43b2e" : undefined }}>
                  {activeCallbackContext?.usesFallback ? "using default callback" : "live callback"}
                </strong>
              </div>
              <button className="text-button is-compact" type="button" onClick={resetCallbackExpression}>
                Reset callback
              </button>
            </div>

            <CallbackExpressionEditor value={activeCallbackContext?.inputExpression ?? activeCallbackMeta.defaultExpression} onChange={updateCallbackExpression} />

            <div className="callback-editor-foot">
              <span>{activeCallbackMeta.description}</span>
              <strong>{activeCallbackMeta.note}</strong>
            </div>

            {groupKeyChoices.length ? (
              <div className="callback-suggestions" aria-label="Callback quick insert">
                {groupKeyChoices.map((key) => {
                  const expression = `item.${key}`;
                  const isActive = activeCallbackContext?.inputExpression?.trim() === expression;

                  return (
                    <button className={`key-button ${isActive ? "is-active" : ""}`} type="button" key={key} onClick={() => applyCallbackQuickKey(key)}>
                      {expression}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {activeCallbackContext?.errorMessage ? (
              <div className="callback-error">
                Invalid callback expression. Using default callback: <code>{`item => ${activeCallbackContext.defaultExpression}`}</code>
              </div>
            ) : (
              <div className="callback-status">
                Graph and result use: <code>{`item => ${activeCallbackContext?.resolvedExpression}`}</code>
              </div>
            )}
          </section>
        ) : null}

        <div className="mode-row mode-row-dual visualization-tabs" role="tablist" aria-label="Visualization mode">
          <button
            className={`mode-button ${showUnifiedGraph ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={showUnifiedGraph}
            onClick={() => selectVisualizationTab("graph")}
          >
            Data Graph
          </button>
          <button
            className={`mode-button ${showInputOutput ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={showInputOutput}
            onClick={() => selectVisualizationTab("io")}
          >
            Input / Output
          </button>
        </div>

        {showUnifiedGraph && showGroupByDetail ? (
          <GroupByLab
            key={`group-lab-${animationSeed}-${datasetName}-${activeGroupKey}-${input.length}`}
            input={input}
            result={result}
            groupKey={selectedGroupKey || ""}
            groupKeyChoices={groupKeyChoices}
            callbackContext={activeCallbackContext}
            onGroupKeyChange={(key) => {
              setGroupKeys((prev) => ({ ...prev, [datasetName]: key }));
              setCallbackExpressions((prev) => ({ ...prev, [buildCallbackExpressionKey("groupBy", datasetName)]: `item.${key}` }));
              setAnimationSeed((seed) => seed + 1);
            }}
          />
        ) : null}

        {showUnifiedGraph && showMapDetail ? <MapLab key={`map-lab-${animationSeed}-${datasetName}-${input.length}`} input={input} result={result} callbackContext={activeCallbackContext} /> : null}

        {showUnifiedGraph && !showGroupByDetail && !showMapDetail ? (
          <OperationGraphLab key={`operation-graph-${animationSeed}-${datasetName}-${activeFn.id}-${input.length}`} fnId={activeFn.id} input={input} result={result} datasetName={datasetName} callbackContext={activeCallbackContext} />
        ) : null}

        <section className="visual-grid" aria-label="Data transformation" hidden={!showInputOutput}>
          <div className="panel input-panel">
            <div className="panel-heading">
              <span>Input</span>
              <strong>{formatCount(input, "item")}</strong>
            </div>
            <div className="data-stage" key={`input-${animationSeed}-${activeFn.id}`}>
              {input.map((item, index) => (
                <DataCard
                  item={item}
                  index={index}
                  key={getItemLabel(item, index)}
                  muted={!activeFn.isIncluded(item, datasetName, input, index, activeCallbackContext)}
                  highlightKey={showGroupByDetail ? selectedGroupKey : null}
                />
              ))}
            </div>
          </div>

          <div className="flow-panel" aria-hidden="true">
            <div className="flow-line" />
            <div className="flow-node">{activeFn.flow}</div>
            <div className="flow-pulse" />
          </div>

          <div className="panel output-panel">
            <div className="panel-heading">
              <span>Output</span>
              <strong>{summarizeResult(result)}</strong>
            </div>
            <div className="data-stage" key={`output-${animationSeed}-${activeFn.id}`}>
              <ResultView result={result} />
            </div>
          </div>
        </section>

        <JsonWorkbench
          datasetName={datasetName}
          datasetNames={datasetNames}
          editorContent={editorContent}
          jsonStatus={jsonStatus}
          onDatasetChange={selectDataset}
          onEditorChange={updateEditor}
          onFormatJson={formatEditorJson}
          result={result}
          resultTextLength={resultText.length}
        />
      </section>
    </main>
  );
}
