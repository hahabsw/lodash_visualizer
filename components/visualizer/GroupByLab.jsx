"use client";

import { useMemo } from "react";
import DataGraphCanvas from "./DataGraphCanvas";
import { createGroupByGraph } from "./graphAdapters";
import { buildGroupTrace } from "./utils";

export default function GroupByLab({ input, result, groupKey, groupKeyChoices, onGroupKeyChange, callbackContext }) {
  const trace = useMemo(() => buildGroupTrace(input, callbackContext), [callbackContext, input]);
  const entries = useMemo(() => Object.entries(result), [result]);
  const groupKeys = entries.map(([key]) => key);
  const values = groupKeys.join(", ") || "no buckets";
  const graph = useMemo(() => createGroupByGraph({ trace, entries, callbackExpression: callbackContext.resolvedExpression, groupKeys }), [callbackContext.resolvedExpression, entries, groupKeys, trace]);

  return (
    <section className="groupby-lab" aria-label="groupBy detail">
      <div className="lab-heading">
        <div className="lab-title-block">
          <span>groupBy data flow</span>
          <strong>callback routes items into buckets</strong>
          <code>item =&gt; {callbackContext.resolvedExpression}</code>
          <small>{values}</small>
        </div>
        <div className="key-selector" aria-label="Grouping key quick select">
          {groupKeyChoices.map((key) => (
            <button className={`key-button ${key === groupKey ? "is-active" : ""}`} type="button" key={key} onClick={() => onGroupKeyChange(key)}>
              {key}
            </button>
          ))}
        </div>
      </div>

      <DataGraphCanvas graph={graph} />
    </section>
  );
}
