"use client";

import { useMemo } from "react";
import DataGraphCanvas from "./DataGraphCanvas";
import { createGroupByGraph } from "./graphAdapters";
import { buildGroupTrace } from "./utils";

export default function GroupByLab({ input, result, groupKey, groupKeyChoices, onGroupKeyChange }) {
  const trace = useMemo(() => buildGroupTrace(input, groupKey), [input, groupKey]);
  const entries = useMemo(() => Object.entries(result), [result]);
  const groupKeys = entries.map(([key]) => key);
  const values = groupKeys.join(", ") || "no buckets";
  const graph = useMemo(() => createGroupByGraph({ trace, entries, groupKey, groupKeys }), [entries, groupKey, groupKeys, trace]);

  return (
    <section className="groupby-lab" aria-label="groupBy detail">
      <div className="lab-heading">
        <div>
          <span>groupBy data flow</span>
          <strong>
            item.{groupKey} -&gt; {values}
          </strong>
        </div>
        <div className="key-selector" aria-label="Grouping key">
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
