"use client";

import { useEffect, useMemo, useState } from "react";
import DataGraphCanvas from "./DataGraphCanvas";
import { createMapGraph } from "./graphAdapters";
import { buildMapTrace } from "./utils";

const labClass = "groupby-lab map-lab grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3";
const labHeadingClass = "lab-heading flex min-w-0 items-start justify-between gap-3.5 max-[1040px]:flex-col";
const titleBlockClass = "lab-title-block grid min-w-0 gap-1";
const expressionClass = "max-w-[min(720px,58vw)] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[13px] font-extrabold text-[var(--teal)]";
const focusSelectorClass = "focus-selector flex max-h-[76px] max-w-[640px] flex-wrap justify-end gap-[7px] overflow-auto max-[1040px]:max-w-none max-[1040px]:justify-start";

export default function MapLab({ input, result, callbackContext }) {
  const trace = useMemo(() => buildMapTrace(input, result), [input, result]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const safeSelectedIndex = trace.length ? Math.min(selectedIndex, trace.length - 1) : 0;
  const selectedStep = trace[safeSelectedIndex];
  const graph = useMemo(() => (selectedStep ? createMapGraph({ step: selectedStep, index: safeSelectedIndex, callbackExpression: callbackContext.resolvedExpression }) : null), [callbackContext.resolvedExpression, safeSelectedIndex, selectedStep]);

  useEffect(() => {
    if (selectedIndex >= trace.length) setSelectedIndex(Math.max(0, trace.length - 1));
  }, [selectedIndex, trace.length]);

  return (
    <section className={labClass} aria-label="map detail">
      <div className={labHeadingClass}>
        <div className={titleBlockClass}>
          <span>map data flow</span>
          <strong>focus one item transformation</strong>
          <code className={expressionClass}>item =&gt; {callbackContext.resolvedExpression}</code>
        </div>
        <div className={focusSelectorClass} aria-label="Focused input item">
          {trace.map((step, index) => (
            <button className={`focus-chip ${index === safeSelectedIndex ? "is-active" : ""}`} type="button" key={`${step.itemLabel}-focus-${index}`} onClick={() => setSelectedIndex(index)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.itemLabel}</strong>
            </button>
          ))}
        </div>
      </div>

      {graph ? <DataGraphCanvas graph={graph} /> : null}
    </section>
  );
}
