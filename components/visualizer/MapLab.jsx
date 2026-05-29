"use client";

import { useEffect, useMemo, useState } from "react";
import DataGraphCanvas from "./DataGraphCanvas";
import { createMapGraph } from "./graphAdapters";
import { buildMapTrace } from "./utils";

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
    <section className="groupby-lab map-lab" aria-label="map detail">
      <div className="lab-heading">
        <div className="lab-title-block">
          <span>map data flow</span>
          <strong>focus one item transformation</strong>
          <code>item =&gt; {callbackContext.resolvedExpression}</code>
        </div>
        <div className="focus-selector" aria-label="Focused input item">
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
