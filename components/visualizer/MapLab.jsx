"use client";

import { useEffect, useMemo, useState } from "react";
import DataGraphCanvas from "./DataGraphCanvas";
import { createMapGraph } from "./graphAdapters";
import { buildMapTrace, formatValue, getObjectEntries, toneForIndex } from "./utils";

export default function MapLab({ input, result }) {
  const trace = useMemo(() => buildMapTrace(input, result), [input, result]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const safeSelectedIndex = trace.length ? Math.min(selectedIndex, trace.length - 1) : 0;
  const selectedStep = trace[safeSelectedIndex];
  const graph = useMemo(() => (selectedStep ? createMapGraph({ step: selectedStep, index: safeSelectedIndex }) : null), [safeSelectedIndex, selectedStep]);

  useEffect(() => {
    if (selectedIndex >= trace.length) setSelectedIndex(Math.max(0, trace.length - 1));
  }, [selectedIndex, trace.length]);

  return (
    <section className="groupby-lab map-lab" aria-label="map detail">
      <div className="lab-heading">
        <div>
          <span>map data flow</span>
          <strong>focus one item transformation</strong>
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

      {selectedStep ? (
        <div className="block-flow map-block-flow map-focus-block-flow" aria-label="focused map data blocks">
          <div className="block-lane map-detail-lane">
            <div className="block-lane-title">
              <span>1</span>
              <strong>Focused input</strong>
            </div>
            <MapFocusItemCard step={selectedStep} index={safeSelectedIndex} />
          </div>

          <div className="operator-block map-detail-lane">
            <div className="operator-title">
              <span>2</span>
              <strong>Pick label</strong>
            </div>
            <code>label</code>
            <MapFocusPickCard source={selectedStep.labelSource} index={safeSelectedIndex} fieldName="label" />
          </div>

          <div className="operator-block map-detail-lane">
            <div className="operator-title">
              <span>3</span>
              <strong>Pick value</strong>
            </div>
            <code>value</code>
            <MapFocusPickCard source={selectedStep.valueSource} index={safeSelectedIndex} fieldName="value" />
          </div>

          <div className="block-lane map-detail-lane">
            <div className="block-lane-title">
              <span>4</span>
              <strong>New object</strong>
            </div>
            <MapFocusOutputCard step={selectedStep} index={safeSelectedIndex} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MapFocusItemCard({ step, index }) {
  const tone = toneForIndex(index);
  return (
    <div className={`map-detail-card ${tone}`}>
      <div className="map-detail-card-title">
        <strong>{step.itemLabel}</strong>
        <span>original element</span>
      </div>
      <div className="map-detail-fields">
        {getObjectEntries(step.item).map(([key, value]) => (
          <MapFocusField key={key} fieldKey={key} value={value} highlighted={key === step.labelSource.key || key === step.valueSource.key || key === "id"} compact />
        ))}
      </div>
    </div>
  );
}

function MapFocusPickCard({ source, index, fieldName }) {
  const tone = toneForIndex(index);
  return (
    <div className={`map-detail-card map-pick-card ${tone}`}>
      <div className="map-detail-card-title">
        <strong>{fieldName}</strong>
        <span>from {source.key}</span>
      </div>
      <div className="map-pick-value">
        <code>item.{source.key}</code>
        <strong>{formatValue(source.value)}</strong>
      </div>
    </div>
  );
}

function MapFocusOutputCard({ step, index }) {
  const tone = toneForIndex(index);
  return (
    <div className={`map-detail-card ${tone}`}>
      <div className="map-detail-card-title">
        <strong>{step.output.source}</strong>
        <span>mapped element</span>
      </div>
      <div className="map-detail-fields">
        {getObjectEntries(step.output).map(([key, value]) => (
          <MapFocusField key={key} fieldKey={key} value={value} highlighted compact />
        ))}
      </div>
    </div>
  );
}

function MapFocusField({ fieldKey, value, highlighted = false, compact = false }) {
  return (
    <span className={`map-focus-field ${highlighted ? "is-highlighted" : ""} ${compact ? "is-compact" : ""}`}>
      <mark>{fieldKey}</mark>
      <strong>{formatValue(value)}</strong>
    </span>
  );
}
