"use client";

import { useMemo } from "react";
import DataGraphCanvas from "./DataGraphCanvas";
import { createGroupByGraph } from "./graphAdapters";
import { buildGroupTrace } from "./utils";

const labClass = "groupby-lab grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3";
const labHeadingClass = "lab-heading flex min-w-0 items-start justify-between gap-3.5 max-[1040px]:flex-col";
const titleBlockClass = "lab-title-block grid min-w-0 gap-1";
const expressionClass = "max-w-[min(720px,58vw)] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[13px] font-extrabold text-[var(--teal)]";
const bucketSummaryClass = "max-w-[min(720px,58vw)] overflow-hidden text-ellipsis whitespace-nowrap text-xs font-extrabold text-[var(--muted)]";
const selectorClass = "key-selector flex max-h-[76px] max-w-[520px] flex-wrap justify-end gap-[7px] overflow-auto max-[1040px]:max-w-none max-[1040px]:justify-start";

export default function GroupByLab({ input, result, groupKey, groupKeyChoices, onGroupKeyChange, callbackContext }) {
  const trace = useMemo(() => buildGroupTrace(input, callbackContext), [callbackContext, input]);
  const entries = useMemo(() => Object.entries(result), [result]);
  const groupKeys = entries.map(([key]) => key);
  const values = groupKeys.join(", ") || "no buckets";
  const graph = useMemo(() => createGroupByGraph({ trace, entries, callbackExpression: callbackContext.resolvedExpression, groupKeys }), [callbackContext.resolvedExpression, entries, groupKeys, trace]);

  return (
    <section className={labClass} aria-label="groupBy detail">
      <div className={labHeadingClass}>
        <div className={titleBlockClass}>
          <span>groupBy data flow</span>
          <strong>callback routes items into buckets</strong>
          <code className={expressionClass}>item =&gt; {callbackContext.resolvedExpression}</code>
          <small className={bucketSummaryClass}>{values}</small>
        </div>
        <div className={selectorClass} aria-label="Grouping key quick select">
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
