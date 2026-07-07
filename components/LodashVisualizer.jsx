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

const shellClass = "app-shell grid min-h-screen grid-cols-[minmax(250px,300px)_minmax(0,1fr)] max-[1040px]:grid-cols-1";
const sidebarClass =
  "sidebar flex flex-col gap-[22px] border-r border-[var(--line)] bg-[#f9fbfd] p-6 max-[1040px]:sticky max-[1040px]:top-0 max-[1040px]:z-[5] max-[1040px]:border-r-0 max-[1040px]:border-b max-[760px]:p-4";
const brandHeaderClass = "flex items-start justify-between gap-3";
const brandClass = "brand flex items-center gap-[13px]";
const brandMarkClass = "brand-mark grid size-11 place-items-center rounded-lg bg-[var(--ink)] text-[28px] font-extrabold leading-none text-white";
const githubLinkClass =
  "text-button flex min-h-[34px] items-center px-3 text-[12px] no-underline";
const functionListClass = "function-list grid gap-2 overflow-auto pr-[3px] max-[1040px]:max-h-44 max-[1040px]:grid-cols-2";
const workbenchClass =
  "workbench grid min-w-0 grid-rows-[auto_auto_auto_auto_minmax(410px,1fr)_minmax(220px,0.48fr)] gap-[18px] p-6 max-[1040px]:grid-rows-[auto_auto_auto_auto_auto_auto] max-[760px]:p-4";
const topbarClass = "topbar flex items-center justify-between gap-4 max-[760px]:flex-col max-[760px]:items-start";
const controlStripClass = "control-strip flex items-center gap-2";
const panelShellClass = "rounded-lg border border-[var(--line)] bg-white/85 shadow-[var(--shadow)]";
const spotlightClass = `${panelShellClass} spotlight grid grid-cols-[minmax(0,1fr)_minmax(280px,0.78fr)] items-stretch gap-[18px] p-4 max-[1040px]:grid-cols-1`;
const callbackEditorClass = `${panelShellClass} callback-editor grid gap-3 p-4`;
const callbackHeadClass = "callback-editor-head flex items-start justify-between gap-3.5";
const compactButtonClass = "text-button is-compact min-h-[34px] px-3";
const visualTabsClass = "visualization-tabs grid w-full max-w-[460px] grid-cols-2 gap-1.5 self-start rounded-lg bg-[#e9eef6] p-1";
const visualGridClass = "visual-grid grid min-h-0 grid-cols-[minmax(260px,1fr)_minmax(110px,0.23fr)_minmax(260px,1fr)] gap-3.5 max-[760px]:grid-cols-1";

function tabButtonClass(isActive) {
  return `mode-button min-h-[35px] rounded-md text-[13px] font-bold ${isActive ? "is-active bg-white text-[var(--ink)] shadow-[0_5px_14px_rgba(24,32,47,0.08)]" : "bg-transparent text-[var(--muted)]"}`;
}

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
    updateCallbackExpression(quickExpressionForKey(activeFn.id, key));

    if (activeFn.id === "groupBy") {
      setGroupKeys((prev) => ({ ...prev, [datasetName]: key }));
      setAnimationSeed((seed) => seed + 1);
    }
  }

  function quickExpressionForKey(fnId, key) {
    if (fnId === "reduce") return `acc + (Number(item.${key}) || 0)`;
    return `item.${key}`;
  }

  function callbackLambdaLabel(fnId, expression) {
    if (fnId === "reduce") return `(acc, item) => ${expression}`;
    return `item => ${expression}`;
  }

  return (
    <main className={shellClass}>
      <aside className={sidebarClass} aria-label="Lodash functions">
        <div className={brandHeaderClass}>
          <div className={brandClass}>
            <span className={brandMarkClass}>_</span>
            <div>
              <h1>Lodash Visualizer</h1>
              <p>data in motion</p>
            </div>
          </div>
          <a className={githubLinkClass} href="https://github.com/hahabsw/lodash_visualizer" target="_blank" rel="noreferrer" aria-label="Open GitHub repository">
            GitHub
          </a>
        </div>
        <nav className={functionListClass} aria-label="Function list">
          {functions.map((fn) => (
            <Link className={`function-button ${fn.id === activeFn.id ? "is-active" : ""}`} href={buildHref(fn.id)} key={fn.id}>
              <span>{fn.name}</span>
              <small>{fn.category}</small>
            </Link>
          ))}
        </nav>
      </aside>

      <section className={workbenchClass}>
        <header className={topbarClass}>
          <div>
            <p className="eyebrow">{activeFn.category}</p>
            <h2>{activeFn.name}</h2>
          </div>
          <div className={controlStripClass}>
            <button className="icon-button" type="button" aria-label="Replay animation" title="Replay" onClick={() => setAnimationSeed((seed) => seed + 1)}>
              <span aria-hidden="true">&#8635;</span>
            </button>
            <button className="text-button" type="button" onClick={resetJson}>
              Reset JSON
            </button>
          </div>
        </header>

        <section className={spotlightClass}>
          <div className="signature-line">
            <code>{activeFn.signature(datasetName, activeCallbackContext)}</code>
            <span>{summarizeResult(result)}</span>
          </div>
          <div className="code-preview">{activeFn.code(datasetName, activeCallbackContext)}</div>
        </section>

        {activeCallbackMeta ? (
          <section className={callbackEditorClass}>
            <div className={callbackHeadClass}>
              <div>
                <span>{activeCallbackMeta.label}</span>
                <strong style={{ color: activeCallbackContext?.errorMessage ? "#a43b2e" : undefined }}>
                  {activeCallbackContext?.usesFallback ? "using default callback" : "live callback"}
                </strong>
              </div>
              <button className={compactButtonClass} type="button" onClick={resetCallbackExpression}>
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
                  const expression = quickExpressionForKey(activeFn.id, key);
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
                Invalid callback expression. Using default callback: <code>{callbackLambdaLabel(activeFn.id, activeCallbackContext.defaultExpression)}</code>
              </div>
            ) : (
              <div className="callback-status">
                Graph and result use: <code>{callbackLambdaLabel(activeFn.id, activeCallbackContext?.resolvedExpression)}</code>
              </div>
            )}
          </section>
        ) : null}

        <div className={visualTabsClass} role="tablist" aria-label="Visualization mode">
          <button
            className={tabButtonClass(showUnifiedGraph)}
            type="button"
            role="tab"
            aria-selected={showUnifiedGraph}
            onClick={() => selectVisualizationTab("graph")}
          >
            Data Graph
          </button>
          <button
            className={tabButtonClass(showInputOutput)}
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

        <section className={visualGridClass} aria-label="Data transformation" hidden={!showInputOutput}>
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
              <ResultView result={result} fnId={activeFn.id} />
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
