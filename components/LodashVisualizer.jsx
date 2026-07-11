"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import _ from "lodash";
import { DataCard, ResultView } from "./visualizer/CommonViews";
import AdvancedOperationLab from "./visualizer/AdvancedOperationLab";
import AdvancedOptionsPanel from "./visualizer/AdvancedOptionsPanel";
import CallbackExpressionEditor from "./visualizer/CallbackExpressionEditor";
import { buildCallbackContext, buildCallbackExpressionKey, getCallbackEditorMeta, getSimpleItemPropertyExpression } from "./visualizer/callbacks";
import { datasets, defaultDatasetName, groupKeyDefaults } from "./visualizer/data";
import { createFunctionConfigs, defaultFunctionId } from "./visualizer/functionConfigs";
import GroupByLab from "./visualizer/GroupByLab";
import JsonWorkbench from "./visualizer/JsonWorkbench";
import MapLab from "./visualizer/MapLab";
import ObjectPathSelector from "./visualizer/ObjectPathSelector";
import OperationGraphLab from "./visualizer/OperationGraphLab";
import PickOmitLab from "./visualizer/PickOmitLab";
import TakeDropWhileLab from "./visualizer/TakeDropWhileLab";
import { advancedFunctionIds, advancedOptionFunctionIds, getDefaultAdvancedOptions, parseOptionValue } from "./visualizer/advancedOperations";
import { discoverArrayPaths, discoverObjectPaths, getDefaultObjectPaths } from "./visualizer/objectPaths";
import { capitalize, formatCount, getGroupKeyChoices, getItemLabel, summarizeResult } from "./visualizer/utils";

const shellClass = "app-shell grid min-h-screen grid-cols-[minmax(250px,300px)_minmax(0,1fr)] max-[1040px]:grid-cols-1";
const sidebarClass =
  "sidebar flex flex-col gap-[22px] border-r border-[var(--line)] bg-[#f9fbfd] p-6 max-[1040px]:sticky max-[1040px]:top-0 max-[1040px]:z-[5] max-[1040px]:border-r-0 max-[1040px]:border-b max-[760px]:p-4";
const brandHeaderClass = "grid gap-3 border-b border-[var(--line)] pb-5";
const brandClass = "brand flex items-center gap-[13px]";
const brandMarkClass = "brand-mark grid size-11 place-items-center rounded-lg bg-[var(--ink)] text-[28px] font-extrabold leading-none text-white";
const githubLinkClass =
  "ml-[57px] inline-flex w-fit items-center text-[12px] font-bold text-[var(--muted)] no-underline transition-colors hover:text-[var(--ink)] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--teal)]";
const functionListClass = "function-list grid gap-2 overflow-auto pr-[3px] max-[1040px]:max-h-44 max-[1040px]:grid-cols-2";
const workbenchClass =
  "workbench grid min-w-0 content-start gap-[18px] p-6 max-[760px]:p-4";
const topbarClass = "topbar flex items-center justify-between gap-4 max-[760px]:flex-col max-[760px]:items-start";
const controlStripClass = "control-strip flex items-center gap-2";
const panelShellClass = "rounded-lg border border-[var(--line)] bg-white/85 shadow-[var(--shadow)]";
const summaryClass = `${panelShellClass} workbench-summary flex min-w-0 items-center justify-between gap-5 px-4 py-3 max-[760px]:items-start`;
const workspaceClass = "workspace-grid grid min-w-0 grid-cols-[minmax(320px,380px)_minmax(0,1fr)] items-start gap-[18px] max-[1180px]:grid-cols-1";
const setupPanelClass = `${panelShellClass} setup-panel sticky top-6 grid min-w-0 gap-4 p-4 max-[1180px]:static`;
const callbackEditorClass = "callback-editor grid gap-3 border-t border-[var(--line)] pt-4";
const callbackHeadClass = "callback-editor-head flex items-start justify-between gap-3.5";
const compactButtonClass = "text-button is-compact min-h-[34px] px-3";
const resultWorkspaceClass = "result-workspace grid min-w-0 content-start gap-3";
const visualTabsClass = "visualization-tabs grid w-[min(320px,100%)] grid-cols-2 gap-1.5 rounded-lg bg-[#e9eef6] p-1";
const visualGridClass =
  "visual-grid grid h-[min(680px,calc(100vh-220px))] min-h-[520px] min-w-0 grid-cols-[minmax(240px,1fr)_minmax(88px,0.18fr)_minmax(240px,1fr)] gap-3.5 max-[760px]:h-auto max-[760px]:min-h-0 max-[760px]:grid-cols-1";

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
  const [objectPathSelections, setObjectPathSelections] = useState({});
  const [advancedSettings, setAdvancedSettings] = useState({});
  const [animationSeed, setAnimationSeed] = useState(0);
  const [activeVisualizationTab, setActiveVisualizationTab] = useState(normalizedVisualizationView);
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(false);
  const dataDialogRef = useRef(null);
  const dataPanelTriggerRef = useRef(null);
  const dataPanelCloseRef = useRef(null);

  const groupKeyChoices = useMemo(() => getGroupKeyChoices(input, datasetName), [input, datasetName]);
  const availableObjectPaths = useMemo(() => discoverObjectPaths(input), [input]);
  const availableArrayPaths = useMemo(() => discoverArrayPaths(input), [input]);
  const activeGroupKey = groupKeys[datasetName] || groupKeyChoices[0] || groupKeyDefaults[datasetName] || "id";

  useEffect(() => {
    if (groupKeyChoices.length && !groupKeyChoices.includes(activeGroupKey)) {
      setGroupKeys((prev) => ({ ...prev, [datasetName]: groupKeyChoices[0] }));
    }
  }, [activeGroupKey, datasetName, groupKeyChoices]);

  useEffect(() => {
    setActiveVisualizationTab(normalizedVisualizationView);
  }, [normalizedVisualizationView]);

  useEffect(() => {
    const dialog = dataDialogRef.current;
    if (!isDataPanelOpen || !dialog || dialog.open) return;

    dialog.showModal();
    window.requestAnimationFrame(() => dataPanelCloseRef.current?.focus());
  }, [isDataPanelOpen]);

  const functions = useMemo(() => createFunctionConfigs(activeGroupKey), [activeGroupKey]);
  const activeFn = functions.find((fn) => fn.id === activeFnId) || functions.find((fn) => fn.id === defaultFunctionId) || functions[0];
  const isPathOperation = activeFn.id === "pick" || activeFn.id === "omit";
  const isAdvancedOperation = advancedFunctionIds.has(activeFn.id);
  const hasAdvancedOptions = advancedOptionFunctionIds.has(activeFn.id);
  const selectedObjectPaths = useMemo(() => {
    const storedPaths = objectPathSelections[datasetName];
    if (storedPaths !== undefined) return storedPaths.filter((path) => availableObjectPaths.includes(path));
    if (searchParams?.has("paths")) {
      return (searchParams.get("paths") || "")
        .split(",")
        .filter(Boolean)
        .filter((path) => availableObjectPaths.includes(path));
    }
    return getDefaultObjectPaths(datasetName, availableObjectPaths);
  }, [availableObjectPaths, datasetName, objectPathSelections, searchParams]);
  const advancedSettingKey = `${activeFn.id}:${datasetName}`;
  const defaultAdvancedOptions = useMemo(
    () => getDefaultAdvancedOptions(activeFn.id, datasetName, availableObjectPaths, availableArrayPaths),
    [activeFn.id, availableArrayPaths, availableObjectPaths, datasetName]
  );
  const activeOperationOptions = useMemo(() => {
    const settings = { ...defaultAdvancedOptions, ...(advancedSettings[advancedSettingKey] || {}) };
    return { ...settings, paths: selectedObjectPaths, value: parseOptionValue(settings.valueText, settings.value) };
  }, [advancedSettingKey, advancedSettings, defaultAdvancedOptions, selectedObjectPaths]);
  const activeCallbackExpressionKey = useMemo(() => buildCallbackExpressionKey(activeFn.id, datasetName), [activeFn.id, datasetName]);
  const activeCallbackContext = useMemo(
    () => buildCallbackContext({ fnId: activeFn.id, datasetName, groupKey: activeGroupKey, input, expression: callbackExpressions[activeCallbackExpressionKey] }),
    [activeCallbackExpressionKey, activeFn.id, activeGroupKey, callbackExpressions, datasetName, input]
  );
  const activeCallbackMeta = useMemo(() => getCallbackEditorMeta(activeFn.id, datasetName, activeGroupKey), [activeFn.id, activeGroupKey, datasetName]);
  const result = useMemo(
    () => activeFn.run(input, datasetName, activeCallbackContext, activeOperationOptions),
    [activeCallbackContext, activeFn, activeOperationOptions, datasetName, input]
  );
  const resultText = JSON.stringify(result, null, 2);
  const datasetNames = useMemo(() => Object.keys(datasets), []);
  const showGroupByDetail = activeFn.id === "groupBy";
  const showMapDetail = activeFn.id === "map";
  const showWhileDetail = activeFn.id === "takeWhile" || activeFn.id === "dropWhile";
  const showPathDetail = isPathOperation;
  const showAdvancedDetail = isAdvancedOperation;
  const showUnifiedGraph = activeVisualizationTab === "graph";
  const showInputOutput = activeVisualizationTab === "io";
  const selectedGroupKey = showGroupByDetail ? getSimpleItemPropertyExpression(activeCallbackContext?.inputExpression) : null;

  function buildHref(fnId, nextDataset = datasetName, nextView = activeVisualizationTab) {
    const nextQuery = new URLSearchParams(searchParams?.toString() ?? "");
    nextQuery.set("dataset", nextDataset);
    nextQuery.set("view", nextView);
    if (fnId !== "pick" && fnId !== "omit") nextQuery.delete("paths");
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
    if (isPathOperation) {
      const nextQuery = new URLSearchParams(searchParams?.toString() ?? "");
      nextQuery.set("dataset", nextDataset);
      nextQuery.set("view", activeVisualizationTab);
      nextQuery.delete("paths");
      router.replace(`/${activeFn.id}?${nextQuery.toString()}`, { scroll: false });
    } else {
      updateUrl(nextDataset, activeVisualizationTab);
    }
  }

  function resetJson() {
    const nextInput = _.cloneDeep(datasets[datasetName]);
    setInput(nextInput);
    setEditorContent({ json: nextInput });
    setJsonStatus("valid");
    setAnimationSeed((seed) => seed + 1);
  }

  function openDataPanel() {
    setIsDataPanelOpen(true);
  }

  function closeDataPanel() {
    dataDialogRef.current?.close();
  }

  function handleDataPanelClosed() {
    setIsDataPanelOpen(false);
    window.requestAnimationFrame(() => dataPanelTriggerRef.current?.focus());
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

  function toggleObjectPath(path) {
    const nextPaths = selectedObjectPaths.includes(path) ? selectedObjectPaths.filter((candidate) => candidate !== path) : [...selectedObjectPaths, path];
    setObjectPathSelections((previous) => ({ ...previous, [datasetName]: nextPaths }));
    updateObjectPathUrl(nextPaths);
  }

  function resetObjectPaths() {
    setObjectPathSelections((previous) => {
      const next = { ...previous };
      delete next[datasetName];
      return next;
    });
    const nextQuery = new URLSearchParams(searchParams?.toString() ?? "");
    nextQuery.delete("paths");
    router.replace(`/${activeFn.id}?${nextQuery.toString()}`, { scroll: false });
  }

  function updateObjectPathUrl(paths) {
    const nextQuery = new URLSearchParams(searchParams?.toString() ?? "");
    nextQuery.set("paths", paths.join(","));
    router.replace(`/${activeFn.id}?${nextQuery.toString()}`, { scroll: false });
  }

  function updateAdvancedOption(name, value) {
    setAdvancedSettings((previous) => ({
      ...previous,
      [advancedSettingKey]: { ...(previous[advancedSettingKey] || {}), [name]: value }
    }));
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
            View on GitHub
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
          </div>
        </header>

        <section className={summaryClass} aria-label="Current transformation">
          <div className="summary-expression">
            <span>Current transformation</span>
            <code>{activeFn.signature(datasetName, activeCallbackContext, activeOperationOptions)}</code>
          </div>
          <div className="summary-result" aria-live="polite">
            <span>Result</span>
            <strong>{summarizeResult(result)}</strong>
          </div>
        </section>

        <div className={workspaceClass}>
          <aside className={setupPanelClass} aria-labelledby="setup-panel-title">
            <header className="setup-panel-head">
              <div>
                <span>Setup</span>
                <h3 id="setup-panel-title">{capitalize(datasetName)} data</h3>
              </div>
              <button ref={dataPanelTriggerRef} className={compactButtonClass} type="button" onClick={openDataPanel}>
                Edit data
              </button>
            </header>

            <section className="setup-dataset" aria-labelledby="dataset-title">
              <div className="setup-section-head">
                <span id="dataset-title">Dataset</span>
                <strong>{formatCount(input, "item")}</strong>
              </div>
              <div className="dataset-switcher" role="group" aria-label="Dataset">
                {datasetNames.map((name) => (
                  <button className={`dataset-button ${datasetName === name ? "is-active" : ""}`} type="button" key={name} aria-pressed={datasetName === name} onClick={() => selectDataset(name)}>
                    {capitalize(name)}
                  </button>
                ))}
              </div>
            </section>

            <div className="setup-actions">
              <button className={compactButtonClass} type="button" onClick={resetJson}>
                Reset data
              </button>
            </div>

            {activeCallbackMeta ? (
              <section className={callbackEditorClass} aria-labelledby="callback-title">
                <div className={callbackHeadClass}>
                  <div>
                    <span>{activeCallbackMeta.label}</span>
                    <strong id="callback-title" style={{ color: activeCallbackContext?.errorMessage ? "#a43b2e" : undefined }}>
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
                  <div className="callback-error" role="status" aria-live="polite">
                    Invalid callback expression. Using default callback: <code>{callbackLambdaLabel(activeFn.id, activeCallbackContext.defaultExpression)}</code>
                  </div>
                ) : null}
              </section>
            ) : showPathDetail ? (
              <ObjectPathSelector
                fnId={activeFn.id}
                availablePaths={availableObjectPaths}
                selectedPaths={selectedObjectPaths}
                onToggle={toggleObjectPath}
                onReset={resetObjectPaths}
              />
            ) : hasAdvancedOptions ? (
              <AdvancedOptionsPanel
                fnId={activeFn.id}
                options={activeOperationOptions}
                availablePaths={availableObjectPaths}
                arrayPaths={availableArrayPaths}
                onChange={updateAdvancedOption}
              />
            ) : (
              <div className="callback-empty">
                <span>Callback</span>
                <strong>No callback required</strong>
              </div>
            )}
          </aside>

          <section className={resultWorkspaceClass} aria-labelledby="result-workspace-title">
            <header className="result-toolbar">
              <div>
                <span>Result</span>
                <h3 id="result-workspace-title">{summarizeResult(result)}</h3>
              </div>
              <div className={visualTabsClass} role="tablist" aria-label="Result view">
                <button
                  id="trace-tab"
                  className={tabButtonClass(showUnifiedGraph)}
                  type="button"
                  role="tab"
                  aria-selected={showUnifiedGraph}
                  aria-controls="trace-panel"
                  onClick={() => selectVisualizationTab("graph")}
                >
                  Trace
                </button>
                <button
                  id="compare-tab"
                  className={tabButtonClass(showInputOutput)}
                  type="button"
                  role="tab"
                  aria-selected={showInputOutput}
                  aria-controls="compare-panel"
                  onClick={() => selectVisualizationTab("io")}
                >
                  Compare
                </button>
              </div>
            </header>

            {showUnifiedGraph ? (
              <div id="trace-panel" className="result-view" role="tabpanel" aria-labelledby="trace-tab">
                {showGroupByDetail ? (
                  <GroupByLab key={`group-lab-${animationSeed}-${datasetName}-${activeGroupKey}-${input.length}`} input={input} result={result} callbackContext={activeCallbackContext} />
                ) : null}

                {showMapDetail ? <MapLab key={`map-lab-${animationSeed}-${datasetName}-${input.length}`} input={input} result={result} callbackContext={activeCallbackContext} /> : null}

                {showWhileDetail ? (
                  <TakeDropWhileLab
                    key={`while-lab-${animationSeed}-${datasetName}-${activeFn.id}-${input.length}`}
                    fnId={activeFn.id}
                    input={input}
                    result={result}
                    callbackContext={activeCallbackContext}
                  />
                ) : null}

                {showPathDetail ? (
                  <PickOmitLab
                    key={`path-lab-${animationSeed}-${datasetName}-${activeFn.id}-${input.length}`}
                    fnId={activeFn.id}
                    input={input}
                    result={result}
                    availablePaths={availableObjectPaths}
                    selectedPaths={selectedObjectPaths}
                  />
                ) : null}

                {showAdvancedDetail ? (
                  <AdvancedOperationLab
                    key={`advanced-lab-${animationSeed}-${datasetName}-${activeFn.id}-${input.length}`}
                    fnId={activeFn.id}
                    input={input}
                    result={result}
                    options={activeOperationOptions}
                  />
                ) : null}

                {!showGroupByDetail && !showMapDetail && !showWhileDetail && !showPathDetail && !showAdvancedDetail ? (
                  <OperationGraphLab key={`operation-graph-${animationSeed}-${datasetName}-${activeFn.id}-${input.length}`} fnId={activeFn.id} input={input} result={result} datasetName={datasetName} callbackContext={activeCallbackContext} />
                ) : null}
              </div>
            ) : null}

            {showInputOutput ? (
              <section id="compare-panel" className={visualGridClass} role="tabpanel" aria-labelledby="compare-tab" aria-label="Data transformation">
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
            ) : null}
          </section>
        </div>

        <dialog
          ref={dataDialogRef}
          className="data-panel-dialog"
          aria-labelledby="data-panel-title"
          onCancel={(event) => {
            event.preventDefault();
            closeDataPanel();
          }}
          onClose={handleDataPanelClosed}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDataPanel();
          }}
        >
          <div className="data-panel-surface">
            <header className="data-panel-header">
              <div>
                <span>Data workspace</span>
                <h3 id="data-panel-title">Edit input and inspect result</h3>
              </div>
              <button ref={dataPanelCloseRef} className="icon-button" type="button" aria-label="Close data workspace" title="Close" onClick={closeDataPanel}>
                <span aria-hidden="true">&times;</span>
              </button>
            </header>
            <div className="data-panel-body">
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
            </div>
          </div>
        </dialog>
      </section>
    </main>
  );
}
