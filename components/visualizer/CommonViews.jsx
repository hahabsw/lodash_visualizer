"use client";

import _ from "lodash";
import { tones } from "./data";
import { formatCount, formatValue, getItemLabel, getItemSubtitle } from "./utils";

export function DataCard({ item, index, muted, highlightKey = null }) {
  const title = getItemLabel(item, index);
  const subtitle = getItemSubtitle(item);
  const fields = _.isPlainObject(item) ? Object.entries(item).slice(0, 6) : [["value", item]];

  return (
    <article className={`data-card ${muted ? "is-muted" : ""}`} style={{ "--delay": `${index * 48}ms` }}>
      <div className="card-title">
        <span>{title}</span>
        <em className="pill">{subtitle}</em>
      </div>
      <div className="field-grid">
        {fields.map(([key, value]) => (
          <span className={`field-chip ${key === highlightKey ? "is-key-field" : ""}`} key={key}>
            <mark>{key}</mark>: {formatValue(value)}
          </span>
        ))}
      </div>
    </article>
  );
}

export function ResultView({ result, fnId }) {
  if (Array.isArray(result)) {
    return result.map((item, index) => {
      if (Array.isArray(item)) return <GroupCard groupKey={`batch ${index + 1}`} value={item} index={index} key={`batch-${index}`} />;
      if (_.isPlainObject(item)) return <DataCard item={item} index={index} muted={false} key={getItemLabel(item, index)} />;
      return <PrimitiveCard value={item} index={index} key={`${item}-${index}`} />;
    });
  }

  if (fnId === "find" && _.isPlainObject(result)) {
    return <DataCard item={result} index={0} muted={false} />;
  }

  if (fnId === "countBy" && _.isPlainObject(result)) {
    return Object.entries(result).map(([key, value], index) => <CountCard countKey={key} value={value} index={index} key={key} />);
  }

  if (_.isPlainObject(result)) {
    return Object.entries(result).map(([key, value], index) => <GroupCard groupKey={key} value={value} index={index} key={key} />);
  }

  return <ScalarCard value={result} />;
}

function GroupCard({ groupKey, value, index }) {
  const items = Array.isArray(value) ? value : [value];
  return (
    <article className={`group-card ${tones[index % tones.length]}`} style={{ "--delay": `${index * 72}ms` }}>
      <div className="group-head">
        <span>{groupKey}</span>
        <small>{formatCount(items, "item")}</small>
      </div>
      <div className="group-body">
        {items.map((item, itemIndex) => (
          <MiniCard item={item} index={itemIndex} key={`${groupKey}-${itemIndex}`} />
        ))}
      </div>
    </article>
  );
}

function MiniCard({ item, index }) {
  if (_.isPlainObject(item)) {
    const label = getItemLabel(item, index);
    const metric = item.total ?? item.score ?? item.value ?? item.status ?? item.team ?? "";
    return (
      <div className="mini-card">
        <strong>{label}</strong>
        <span>{formatValue(metric)}</span>
      </div>
    );
  }

  return (
    <div className="mini-card">
      <strong>{formatValue(item)}</strong>
      <span>value</span>
    </div>
  );
}

function PrimitiveCard({ value, index }) {
  return (
    <article className="data-card" style={{ "--delay": `${index * 42}ms` }}>
      <div className="card-title">
        <span>{formatValue(value)}</span>
        <em className="pill">value</em>
      </div>
    </article>
  );
}

function CountCard({ countKey, value, index }) {
  return (
    <article className={`group-card ${tones[index % tones.length]}`} style={{ "--delay": `${index * 72}ms` }}>
      <div className="group-head">
        <span>{countKey}</span>
        <small>{formatCount(value, "item")}</small>
      </div>
      <div className="group-body">
        <div className="mini-card">
          <strong>{formatValue(value)}</strong>
          <span>count</span>
        </div>
      </div>
    </article>
  );
}

function ScalarCard({ value }) {
  const isNumber = typeof value === "number";
  return (
    <article className="group-card tone-green" style={{ "--delay": "0ms" }}>
      <div className="group-head">
        <span>{isNumber ? "total" : "result"}</span>
        <small>{typeof value}</small>
      </div>
      <div className="group-body">
        <div className="mini-card">
          <strong>{formatValue(value)}</strong>
          <span>{isNumber ? "sum" : "value"}</span>
        </div>
      </div>
    </article>
  );
}
