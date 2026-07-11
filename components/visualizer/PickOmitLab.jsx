"use client";

import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { discoverObjectPaths } from "./objectPaths";
import { formatCount, formatValue, getItemLabel, shortLabel } from "./utils";

export default function PickOmitLab({ fnId, input, result, availablePaths, selectedPaths }) {
  const isPick = fnId === "pick";
  const [focusIndex, setFocusIndex] = useState(0);
  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);
  const focusedInput = input[focusIndex] || {};
  const focusedOutput = result[focusIndex] || {};
  const visiblePaths = useMemo(
    () => availablePaths.filter((path) => _.has(focusedInput, path) || selectedSet.has(path)),
    [availablePaths, focusedInput, selectedSet]
  );
  const outputPaths = useMemo(() => discoverObjectPaths([focusedOutput]), [focusedOutput]);

  useEffect(() => {
    if (focusIndex >= input.length) setFocusIndex(Math.max(0, input.length - 1));
  }, [focusIndex, input.length]);

  return (
    <section className="field-projection-lab" aria-label={`${fnId} field projection`}>
      <header className="field-projection-heading">
        <div>
          <span>Field projection</span>
          <strong>{isPick ? "Selected paths cross into the result" : "Selected paths stop before the result"}</strong>
        </div>
        <div className="field-projection-summary">
          <strong>{formatCount(outputPaths.length, "path")}</strong>
          <span>in focused result</span>
        </div>
      </header>

      {input.length ? (
        <div className="field-record-picker" role="group" aria-label="Focused input record">
          <span>Focus record</span>
          <div>
            {input.map((item, index) => (
              <button className={`focus-chip ${focusIndex === index ? "is-active" : ""}`} type="button" aria-pressed={focusIndex === index} onClick={() => setFocusIndex(index)} key={`${getItemLabel(item, index)}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{getItemLabel(item, index)}</strong>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="field-projection-stage">
        <div className="field-projection-columns" aria-hidden="true">
          <span>Input field</span>
          <span>Decision</span>
          <span>Output field</span>
        </div>

        {visiblePaths.length ? (
          <div className="field-lanes" role="list" aria-label={`${fnId} path decisions for ${getItemLabel(focusedInput, focusIndex)}`}>
            {visiblePaths.map((path, index) => {
              const exists = _.has(focusedInput, path);
              const selected = selectedSet.has(path);
              const kept = exists && (isPick ? selected : !selected);
              const value = exists ? _.get(focusedInput, path) : undefined;
              const decision = !exists ? "missing" : kept ? "keep" : "remove";
              const depth = Math.max(0, path.split(".").length - 1);

              return (
                <div className={`field-lane is-${decision}`} role="listitem" style={{ "--lane-delay": `${index * 45}ms`, "--path-indent": `${depth * 12}px` }} key={path}>
                  <div className="field-lane-value is-input">
                    <code>{path}</code>
                    <span>{shortLabel(formatValue(value), 30)}</span>
                  </div>

                  <div className="field-lane-decision">
                    <span aria-hidden="true">{decision === "keep" ? "→" : decision === "remove" ? "×" : "·"}</span>
                    <strong>{decision}</strong>
                  </div>

                  {kept ? (
                    <div className="field-lane-value is-output">
                      <code>{path}</code>
                      <span>{shortLabel(formatValue(_.get(focusedOutput, path)), 30)}</span>
                    </div>
                  ) : (
                    <div className="field-lane-empty">not emitted</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="field-lane-zero">This record has no selectable object paths.</div>
        )}
      </div>

      {input.length ? (
        <footer className="field-projection-footer">
          <span>{getItemLabel(focusedInput, focusIndex)}</span>
          <strong>{isPick ? `${selectedPaths.length} requested` : `${selectedPaths.length} removed`}</strong>
          <code>{`{ ${outputPaths.map((path) => path.split(".").at(-1)).join(", ")} }`}</code>
        </footer>
      ) : null}
    </section>
  );
}
