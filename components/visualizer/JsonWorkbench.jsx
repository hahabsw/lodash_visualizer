"use client";

import { JsonView, allExpanded, collapseAllNested, darkStyles } from "react-json-view-lite";
import EditableJsonEditor from "./EditableJsonEditor";
import { capitalize } from "./utils";

const viewerStyles = {
  ...darkStyles,
  container: `${darkStyles.container} json-tree-view`
};

export default function JsonWorkbench({ datasetName, datasetNames, editorContent, jsonStatus, onDatasetChange, onEditorChange, result, resultTextLength }) {
  const isValid = jsonStatus === "valid";
  const inputPreviewData = editorContent.json;

  return (
    <section className="editor-grid">
      <div className="editor-panel">
        <div className="panel-heading panel-heading-stack">
          <div>
            <span>Sample JSON</span>
            <strong style={{ color: isValid ? undefined : "#b53224" }}>{jsonStatus}</strong>
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
          <div className="json-editor-live">
            <EditableJsonEditor content={editorContent} onChange={onEditorChange} />
          </div>

          <div className="json-preview-card">
            <div className="json-preview-head">
              <span>Parsed preview</span>
              <strong>{isValid ? "collapsible tree" : "waiting for valid JSON"}</strong>
            </div>
            {isValid ? (
              <div className="json-view-shell is-preview">
                <JsonView data={inputPreviewData} shouldExpandNode={collapseAllNested} style={viewerStyles} clickToExpandNode />
              </div>
            ) : (
              <div className="json-preview-empty">Edit the JSON in the code editor above. The visualizer updates when the document is valid JSON and the root value is an array.</div>
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