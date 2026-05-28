"use client";

import { JsonView, allExpanded, collapseAllNested, darkStyles } from "react-json-view-lite";
import { capitalize } from "./utils";

const viewerStyles = {
  ...darkStyles,
  container: `${darkStyles.container} json-tree-view`
};

export default function JsonWorkbench({ datasetName, datasetNames, editorText, jsonStatus, input, onDatasetChange, onEditorChange, result, resultTextLength }) {
  const inputExpandMode = jsonStatus === "valid" ? collapseAllNested : allExpanded;

  return (
    <section className="editor-grid">
      <div className="editor-panel">
        <div className="panel-heading panel-heading-stack">
          <div>
            <span>Sample JSON</span>
            <strong style={{ color: jsonStatus === "invalid" ? "#b53224" : undefined }}>{jsonStatus}</strong>
          </div>
          <div className="json-sample-switcher" role="tablist" aria-label="Dataset sample">
            {datasetNames.map((name) => (
              <button className={`json-sample-button ${datasetName === name ? "is-active" : ""}`} type="button" key={name} onClick={() => onDatasetChange(name)}>
                {capitalize(name)}
              </button>
            ))}
          </div>
        </div>

        <div className="json-editor-stack">
          <textarea className="json-editor-textarea" value={editorText} onChange={(event) => onEditorChange(event.target.value)} spellCheck="false" />

          <div className="json-preview-card">
            <div className="json-preview-head">
              <span>Parsed preview</span>
              <strong>{jsonStatus === "valid" ? "collapsible" : "waiting for valid JSON"}</strong>
            </div>
            {jsonStatus === "valid" ? (
              <div className="json-view-shell">
                <JsonView data={input} shouldExpandNode={inputExpandMode} style={viewerStyles} clickToExpandNode />
              </div>
            ) : (
              <div className="json-preview-empty">Root must be a valid JSON array before the preview can update.</div>
            )}
          </div>
        </div>
      </div>

      <div className="inspector-panel">
        <div className="panel-heading panel-heading-stack">
          <div>
            <span>Result JSON</span>
            <strong>{resultTextLength} chars</strong>
          </div>
          <div className="json-view-hint">click a node to expand or collapse</div>
        </div>
        <div className="json-view-shell is-result">
          <JsonView data={result} shouldExpandNode={collapseAllNested} style={viewerStyles} clickToExpandNode />
        </div>
      </div>
    </section>
  );
}