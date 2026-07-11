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

export default function GroupByLab({ input, result, callbackContext }) {
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
      </div>

      <DataGraphCanvas graph={graph} />
    </section>
  );
}
