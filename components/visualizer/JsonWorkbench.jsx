"use client";

import { useState } from "react";
import { JsonView, allExpanded, collapseAllNested, darkStyles } from "react-json-view-lite";
import EditableJsonEditor from "./EditableJsonEditor";
import { capitalize } from "./utils";

const viewerStyles = {
  ...darkStyles,
  container: `${darkStyles.container} json-tree-view`
};

const editorGridClass = "editor-grid grid h-[900px] min-h-0 grid-cols-[minmax(260px,1fr)_minmax(260px,1fr)] gap-3.5 overflow-hidden max-[1040px]:grid-cols-1";
const panelClass = "grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-[var(--line)] bg-white/85 shadow-[var(--shadow)]";
const panelHeadingClass = "panel-heading panel-heading-stack grid gap-2.5 border-b border-[var(--line)] px-[15px] py-3 text-xs font-extrabold uppercase text-[var(--muted)]";
const headingRowClass = "panel-heading-row flex items-center justify-between gap-3";
const jsonEditorStackClass = "json-editor-stack min-h-0";
const jsonEditorLiveClass = "json-editor-live h-full min-h-0 bg-[#101823]";
const resultShellClass = "json-view-shell is-result h-full min-h-0 overflow-auto bg-[#101823] px-3.5 pb-4 pt-3";

export default function JsonWorkbench({ datasetName, datasetNames, editorContent, jsonStatus, onDatasetChange, onEditorChange, onFormatJson, result, resultTextLength }) {
  const [resultExpanded, setResultExpanded] = useState(true);
  const isValid = jsonStatus === "valid";
  const canFormat = editorContent.json !== undefined;

  return (
    <section className={editorGridClass}>
      <div className={`${panelClass} editor-panel`}>
        <div className={panelHeadingClass}>
          <div className={headingRowClass}>
            <div>
              <span>Sample JSON</span>
              <strong style={{ color: isValid ? undefined : "#b53224" }}>{jsonStatus}</strong>
            </div>
            <div className="json-view-controls">
              <button className="json-view-button" type="button" onClick={onFormatJson} disabled={!canFormat}>
                Format JSON
              </button>
            </div>
          </div>
          <div className="json-sample-switcher" role="tablist" aria-label="Dataset sample">
            {datasetNames.map((name) => (
              <button className={`json-sample-button ${datasetName === name ? "is-active" : ""}`} type="button" key={name} onClick={() => onDatasetChange(name)}>
                {capitalize(name)}
              </button>
            ))}
          </div>
        </div>

        <div className={jsonEditorStackClass}>
          <div className={jsonEditorLiveClass}>
            <EditableJsonEditor content={editorContent} onChange={onEditorChange} />
          </div>
        </div>
      </div>

      <div className={`${panelClass} inspector-panel`}>
        <div className={panelHeadingClass}>
          <div className={headingRowClass}>
            <div>
              <span>Result JSON</span>
              <strong>{resultTextLength} chars</strong>
            </div>
            <div className="json-preview-actions">
              <div className="json-view-hint">click a node to expand or collapse</div>
              <div className="json-view-controls">
                <button className="json-view-button" type="button" onClick={() => setResultExpanded(true)} disabled={resultExpanded}>
                  Expand all
                </button>
                <button className="json-view-button" type="button" onClick={() => setResultExpanded(false)} disabled={!resultExpanded}>
                  Collapse all
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className={resultShellClass}>
          <JsonView data={result} shouldExpandNode={resultExpanded ? allExpanded : collapseAllNested} style={viewerStyles} clickToExpandNode />
        </div>
      </div>
    </section>
  );
}
