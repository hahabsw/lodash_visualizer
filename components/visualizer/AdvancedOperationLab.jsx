"use client";

import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { discoverObjectPaths } from "./objectPaths";
import { simulateRateLimit } from "./advancedOperations";
import { formatCount, formatValue, getItemLabel, shortLabel } from "./utils";

export default function AdvancedOperationLab({ fnId, input, result, options }) {
  if (fnId === "debounce" || fnId === "throttle") return <RateLimitLab fnId={fnId} input={input} options={options} />;
  if (fnId === "merge" || fnId === "defaultsDeep") return <MergeDefaultsLab fnId={fnId} input={input} result={result} options={options} />;
  if (fnId === "flattenDeep" || fnId === "flattenDepth") return <FlattenLab fnId={fnId} input={input} result={result} options={options} />;
  if (fnId === "cloneDeep" || fnId === "isEqual") return <CloneEqualLab fnId={fnId} input={input} result={result} />;
  return <PathAccessLab fnId={fnId} input={input} result={result} options={options} />;
}

function RecordPicker({ input, focusIndex, onChange }) {
  if (!input.length) return null;
  return (
    <div className="advanced-record-picker" role="group" aria-label="Focused input record">
      <span>Focus record</span>
      <div>
        {input.map((item, index) => (
          <button className={`focus-chip ${focusIndex === index ? "is-active" : ""}`} type="button" aria-pressed={focusIndex === index} onClick={() => onChange(index)} key={`${getItemLabel(item, index)}-${index}`}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{getItemLabel(item, index)}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function useFocusIndex(input) {
  const [focusIndex, setFocusIndex] = useState(0);
  useEffect(() => {
    if (focusIndex >= input.length) setFocusIndex(Math.max(0, input.length - 1));
  }, [focusIndex, input.length]);
  return [focusIndex, setFocusIndex];
}

function PathAccessLab({ fnId, input, result, options }) {
  const [focusIndex, setFocusIndex] = useFocusIndex(input);
  const item = input[focusIndex] || {};
  const before = _.get(item, options.path);
  const after = fnId === "get" ? result[focusIndex] : _.get(result[focusIndex], options.path);
  const segments = options.path ? options.path.split(".") : [];
  return (
    <LabShell eyebrow="Path traversal" title={fnId === "get" ? "Walk the path and return its value" : "Clone the object, then write at the path"}>
      <RecordPicker input={input} focusIndex={focusIndex} onChange={setFocusIndex} />
      <div className="path-access-stage">
        <div className="path-breadcrumb" aria-label={`Path ${options.path}`}>
          <span>item</span>{segments.map((segment) => <span key={segment}>{segment}</span>)}
        </div>
        <div className="path-value-flow">
          <ValueBox label="Before" value={before} />
          <div className={`advanced-operator is-${fnId}`}><strong>_.{fnId}</strong><span>{fnId === "set" ? formatValue(options.value) : options.path}</span></div>
          <ValueBox label={fnId === "get" ? "Returned value" : "After"} value={after} tone="green" />
        </div>
      </div>
    </LabShell>
  );
}

function MergeDefaultsLab({ fnId, input, result, options }) {
  const [focusIndex, setFocusIndex] = useFocusIndex(input);
  const item = input[focusIndex] || {};
  const output = result[focusIndex] || {};
  const overlayPaths = discoverObjectPaths([options.overlay]);
  return (
    <LabShell eyebrow="Object layering" title={fnId === "merge" ? "Overlay values replace conflicts" : "Defaults fill gaps without replacing values"}>
      <RecordPicker input={input} focusIndex={focusIndex} onChange={setFocusIndex} />
      <div className="merge-lanes" role="list" aria-label={`${fnId} overlay decisions`}>
        {overlayPaths.map((path) => {
          const existed = _.has(item, path);
          const base = _.get(item, path);
          const overlay = _.get(options.overlay, path);
          const outputValue = _.get(output, path);
          const overlayWins = fnId === "merge" || !existed;
          return (
            <div className="merge-lane" role="listitem" key={path}>
              <ValueBox label={`Base · ${path}`} value={base} muted={!existed} />
              <ValueBox label="Overlay" value={overlay} tone="violet" />
              <div className={`merge-rule ${overlayWins ? "is-overlay" : "is-base"}`}><strong>{overlayWins ? "overlay wins" : "base stays"}</strong><span>→</span></div>
              <ValueBox label="Result" value={outputValue} tone="green" />
            </div>
          );
        })}
      </div>
    </LabShell>
  );
}

function FlattenLab({ fnId, input, result, options }) {
  const [focusIndex, setFocusIndex] = useFocusIndex(input);
  const source = _.get(input[focusIndex], options.path, []);
  const output = result[focusIndex] || [];
  return (
    <LabShell eyebrow="Array depth" title={fnId === "flattenDeep" ? "Collapse every nested array level" : `Collapse up to depth ${options.depth}`}>
      <RecordPicker input={input} focusIndex={focusIndex} onChange={setFocusIndex} />
      <div className="flatten-stage">
        <ArrayBox label={`Input · ${options.path}`} values={source} />
        <div className="flatten-operator"><strong>_.{fnId}</strong><span>{fnId === "flattenDepth" ? `depth ${options.depth}` : "all depths"}</span></div>
        <ArrayBox label="Output" values={output} tone="green" />
      </div>
    </LabShell>
  );
}

function CloneEqualLab({ fnId, input, result }) {
  const clone = useMemo(() => _.cloneDeep(input), [input]);
  const checks = [
    { label: "Top-level reference", value: input === clone, expected: false },
    { label: "First nested reference", value: input[0] === clone[0], expected: false },
    { label: "Deep value equality", value: _.isEqual(input, clone), expected: true }
  ];
  return (
    <LabShell eyebrow="Deep structure" title={fnId === "cloneDeep" ? "Values stay equal while nested references separate" : "Different references can still be deeply equal"}>
      <div className="deep-compare-stage">
        <ValueBox label="Original" value={`${formatCount(input, "item")} · ref A`} />
        <div className="deep-compare-links" aria-hidden="true">≠ ref<br />= value</div>
        <ValueBox label={fnId === "cloneDeep" ? "Deep clone" : "Compared clone"} value={`${formatCount(clone, "item")} · ref B`} tone="green" />
      </div>
      <div className="deep-checks" role="list">
        {checks.map((check) => <div role="listitem" key={check.label}><span>{check.label}</span><strong>{String(check.value)}</strong><em>{check.value === check.expected ? "expected" : "check"}</em></div>)}
      </div>
      {fnId === "isEqual" ? <p className="advanced-result-line">_.isEqual result: <strong>{String(result)}</strong></p> : null}
    </LabShell>
  );
}

function RateLimitLab({ fnId, input, options }) {
  const simulation = useMemo(() => simulateRateLimit(fnId, input, options.wait), [fnId, input, options.wait]);
  const maxTime = Math.max(1, ...simulation.trace.map((step) => step.emittedAt || step.time));
  return (
    <LabShell eyebrow="Event timing" title={fnId === "debounce" ? "Only the last event after quiet time invokes" : "Only the first event in each window invokes"}>
      <div className="rate-timeline" role="list" aria-label={`${fnId} event timeline`}>
        {simulation.trace.map((step) => (
          <div className={`rate-event is-${step.decision}`} role="listitem" style={{ "--event-offset": `${(step.time / maxTime) * 55}%` }} key={`${step.index}-${step.time}`}>
            <span>t={step.time}</span><strong>{getItemLabel(step.item, step.index)}</strong><em>{step.decision}</em>
          </div>
        ))}
      </div>
      <div className="rate-output">
        <span>Invocations</span>
        {simulation.result.map((item, index) => <strong key={`${getItemLabel(item, index)}-${index}`}>{getItemLabel(item, index)} · t={item._emittedAt}</strong>)}
      </div>
    </LabShell>
  );
}

function LabShell({ eyebrow, title, children }) {
  return <section className="advanced-operation-lab" aria-label={title}><header><span>{eyebrow}</span><strong>{title}</strong></header>{children}</section>;
}

function ValueBox({ label, value, tone = "", muted = false }) {
  return <div className={`advanced-value-box ${tone ? `is-${tone}` : ""} ${muted ? "is-muted" : ""}`}><span>{label}</span><strong>{shortLabel(formatValue(value), 34)}</strong></div>;
}

function ArrayBox({ label, values, tone = "" }) {
  const list = Array.isArray(values) ? values : [values];
  return <div className={`advanced-array-box ${tone ? `is-${tone}` : ""}`}><span>{label}</span><div>{list.map((value, index) => <code key={index}>{Array.isArray(value) ? shortLabel(JSON.stringify(value), 24) : formatValue(value)}</code>)}</div></div>;
}
