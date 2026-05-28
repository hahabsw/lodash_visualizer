"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { DataCard, ResultView } from "./visualizer/CommonViews";
import { datasets, defaultDatasetName, groupKeyDefaults } from "./visualizer/data";
import { createFunctionConfigs, defaultFunctionId } from "./visualizer/functionConfigs";
import GroupByLab from "./visualizer/GroupByLab";
import JsonWorkbench from "./visualizer/JsonWorkbench";
import MapLab from "./visualizer/MapLab";
import OperationGraphLab from "./visualizer/OperationGraphLab";
import { formatCount, getGroupKeyChoices, getItemLabel, summarizeResult } from "./visualizer/utils";

export default function LodashVisualizer({ activeFnId = defaultFunctionId, initialDatasetName = defaultDatasetName }) {
  const normalizedDatasetName = datasets[initialDatasetName] ? initialDatasetName : defaultDatasetName;
  const [datasetName, setDatasetName] = useState(normalizedDatasetName);
  const [input, setInput] = useState(() => _.cloneDeep(datasets[normalizedDatasetName]));
  const [editorContent, setEditorContent] = useState(() => ({ json: _.cloneDeep(datasets[normalizedDatasetName]) }));
  const [jsonStatus, setJsonStatus] = useState("valid");
  const [groupKeys, setGroupKeys] = useState(groupKeyDefaults);
  const [animationSeed, setAnimationSeed] = useState(0);

  const groupKeyChoices = useMemo(() => getGroupKeyChoices(input, datasetName), [input, datasetName]);
  const activeGroupKey = groupKeys[datasetName] || groupKeyChoices[0] || groupKeyDefaults[datasetName] || "id";

  useEffect(() => {
    if (groupKeyChoices.length && !groupKeyChoices.includes(activeGroupKey)) {
      setGroupKeys((prev) => ({ ...prev, [datasetName]: groupKeyChoices[0] }));
    }
  }, [activeGroupKey, datasetName, groupKeyChoices]);

  const functions = useMemo(() => createFunctionConfigs(activeGroupKey), [activeGroupKey]);
  const activeFn = functions.find((fn) => fn.id === activeFnId) || functions.find((fn) => fn.id === defaultFunctionId) || functions[0];
  const result = useMemo(() => activeFn.run(input, datasetName), [activeFn, datasetName, input]);
  const resultText = JSON.stringify(result, null, 2);
  const datasetNames = useMemo(() => Object.keys(datasets), []);
  const showGroupByDetail = activeFn.id === "groupBy";
  const showMapDetail = activeFn.id === "map";

  function selectDataset(nextDataset) {
    const nextInput = _.cloneDeep(datasets[nextDataset]);
    setDatasetName(nextDataset);
    setInput(nextInput);
    setEditorContent({ json: nextInput });
    setJsonStatus("valid");
    setAnimationSeed((seed) => seed + 1);
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
            <Link className={`function-button ${fn.id === activeFn.id ? "is-active" : ""}`} href={`/${fn.id}?dataset=${datasetName}`} key={fn.id}>
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
            <code>{activeFn.signature(datasetName)}</code>
            <span>{summarizeResult(result)}</span>
          </div>
          <div className="code-preview">{activeFn.code(datasetName)}</div>
        </section>

        {showGroupByDetail ? (
          <GroupByLab
            key={`group-lab-${animationSeed}-${datasetName}-${activeGroupKey}-${input.length}`}
            input={input}
            result={result}
            groupKey={activeGroupKey}
            groupKeyChoices={groupKeyChoices}
            onGroupKeyChange={(key) => {
              setGroupKeys((prev) => ({ ...prev, [datasetName]: key }));
              setAnimationSeed((seed) => seed + 1);
            }}
          />
        ) : null}

        {showMapDetail ? <MapLab key={`map-lab-${animationSeed}-${datasetName}-${input.length}`} input={input} result={result} /> : null}

        {!showGroupByDetail && !showMapDetail ? (
          <OperationGraphLab key={`operation-graph-${animationSeed}-${datasetName}-${activeFn.id}-${input.length}`} fnId={activeFn.id} input={input} result={result} datasetName={datasetName} />
        ) : null}

        <section className="visual-grid" aria-label="Data transformation">
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
                  muted={!activeFn.isIncluded(item, datasetName, input)}
                  highlightKey={showGroupByDetail ? activeGroupKey : null}
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
          result={result}
          resultTextLength={resultText.length}
        />
      </section>
    </main>
  );
}
