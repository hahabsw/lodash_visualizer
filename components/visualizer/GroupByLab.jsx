"use client";

import { useMemo } from "react";
import { tones } from "./data";
import DataGraphCanvas from "./DataGraphCanvas";
import { createGroupByGraph } from "./graphAdapters";
import {
  buildGroupTrace,
  formatCount,
  formatValue,
  getItemLabel,
  getItemSubtitle,
  getItemValue,
  normalizeGroupValue,
  toneForKey
} from "./utils";

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

      <div className="block-flow" aria-label="groupBy data blocks">
        <div className="block-lane">
          <div className="block-lane-title">
            <span>1</span>
            <strong>Input blocks</strong>
          </div>
          <div className="item-block-stack">
            {trace.map((step, index) => (
              <ProcessItemBlock step={step} groupKeys={groupKeys} index={index} key={`${step.itemLabel}-${index}`} />
            ))}
          </div>
        </div>

        <div className="operator-block">
          <div className="operator-title">
            <span>2</span>
            <strong>Key values</strong>
          </div>
          <code>item.{groupKey}</code>
          <div className="key-block-stack">
            {trace.map((step, index) => (
              <KeyProcessBlock step={step} groupKeys={groupKeys} index={index} key={`${step.itemLabel}-key-${index}`} />
            ))}
          </div>
        </div>

        <div className="operator-block">
          <div className="operator-title">
            <span>3</span>
            <strong>Destination buckets</strong>
          </div>
          <div className="route-block-stack">
            {trace.map((step, index) => (
              <RouteProcessBlock step={step} groupKeys={groupKeys} index={index} key={`${step.itemLabel}-route-${index}`} />
            ))}
          </div>
        </div>

        <div className="block-lane">
          <div className="block-lane-title">
            <span>4</span>
            <strong>Output object</strong>
          </div>
          <div className="object-block">
            {entries.map(([key, items], index) => (
              <ObjectRow groupKey={key} items={items} index={index} key={key} />
            ))}
          </div>
        </div>
      </div>

      <div className="trace-grid">
        <div className="trace-panel">
          <div className="trace-panel-heading">
            <span>Item block -&gt; key -&gt; bucket</span>
            <strong>{formatCount(trace, "flow")}</strong>
          </div>
          <div className="trace-list">
            {trace.map((step, index) => (
              <TraceStep step={step} groupKeys={groupKeys} index={index} key={`${step.itemLabel}-trace-${index}`} />
            ))}
          </div>
        </div>

        <div className="trace-panel">
          <div className="trace-panel-heading">
            <span>Grouped result buckets</span>
            <strong>{formatCount(entries, "bucket")}</strong>
          </div>
          <div className="bucket-board">
            {entries.map(([key, items], index) => (
              <BucketColumn groupKey={key} items={items} index={index} key={key} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessItemBlock({ step, groupKeys, index }) {
  const tone = toneForKey(step.keyValue, groupKeys);
  const fieldValue = normalizeGroupValue(getItemValue(step.item, step.keyName));
  return (
    <div className={`process-block item-process-block ${tone}`} style={{ "--delay": `${index * 65}ms` }}>
      <strong>{step.itemLabel}</strong>
      <span>
        {step.keyName}: {fieldValue}
      </span>
    </div>
  );
}

function KeyProcessBlock({ step, groupKeys, index }) {
  const tone = toneForKey(step.keyValue, groupKeys);
  return (
    <div className={`process-block key-process-block ${tone}`} style={{ "--delay": `${120 + index * 65}ms` }}>
      <code>{step.keyName}</code>
      <strong>{step.keyValue}</strong>
    </div>
  );
}

function RouteProcessBlock({ step, groupKeys, index }) {
  const tone = toneForKey(step.keyValue, groupKeys);
  return (
    <div className={`process-block route-process-block ${tone}`} style={{ "--delay": `${240 + index * 65}ms` }}>
      <span>{step.itemLabel}</span>
      <strong>{step.keyValue}</strong>
      <small>flows into bucket</small>
    </div>
  );
}

function ObjectRow({ groupKey, items, index }) {
  const labels = items.map((item, itemIndex) => getItemLabel(item, itemIndex)).join(", ");
  return (
    <div className={`object-row ${tones[index % tones.length]}`} style={{ "--delay": `${360 + index * 90}ms` }}>
      <code>{groupKey}</code>
      <span>[{labels}]</span>
    </div>
  );
}

function TraceStep({ step, groupKeys, index }) {
  const tone = toneForKey(step.keyValue, groupKeys);
  return (
    <article className={`trace-step ${tone}`} style={{ "--delay": `${index * 82}ms` }}>
      <div className="step-index">{String(index + 1).padStart(2, "0")}</div>
      <div className="step-item">
        <strong>{step.itemLabel}</strong>
        <span>{getItemSubtitle(step.item)}</span>
      </div>
      <div className="step-key">
        <code>item.{step.keyName}</code>
        <strong>{step.keyValue}</strong>
      </div>
      <div className="step-route" aria-hidden="true">
        &rarr;
      </div>
      <div className="step-bucket">
        <span className="bucket-dot" />
        <strong>{step.keyValue}</strong>
        <small>destination bucket</small>
      </div>
    </article>
  );
}

function BucketColumn({ groupKey, items, index }) {
  return (
    <article className={`bucket-column ${tones[index % tones.length]}`} style={{ "--delay": `${index * 90}ms` }}>
      <div className="bucket-column-head">
        <strong>{groupKey}</strong>
        <span>{formatCount(items, "item")}</span>
      </div>
      <div className="bucket-stack">
        {items.map((item, itemIndex) => (
          <div className="bucket-token" style={{ "--delay": `${index * 120 + itemIndex * 70}ms` }} key={`${groupKey}-${getItemLabel(item, itemIndex)}`}>
            <span>{String(itemIndex + 1).padStart(2, "0")}</span>
            <strong>{getItemLabel(item, itemIndex)}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
