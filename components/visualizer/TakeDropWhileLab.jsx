"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCount, getItemLabel, getItemSubtitle, shortLabel } from "./utils";

const OVERVIEW = -1;
const PLAY_INTERVAL = 900;

export default function TakeDropWhileLab({ fnId, input, result, callbackContext }) {
  const isTake = fnId === "takeWhile";
  const scan = useMemo(() => buildBoundaryScan(input, callbackContext), [callbackContext, input]);
  const finalStep = scan.visitedCount;
  const [cursor, setCursor] = useState(OVERVIEW);
  const [isPlaying, setIsPlaying] = useState(false);
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  useEffect(() => {
    setCursor(OVERVIEW);
    setIsPlaying(false);
  }, [fnId, scan.boundaryIndex, scan.visitedCount]);

  useEffect(() => {
    if (!isPlaying || !scan.visitedCount) return undefined;
    const timer = window.setInterval(() => {
      const next = cursorRef.current === OVERVIEW ? 0 : cursorRef.current + 1;
      if (next > finalStep) {
        setCursor(OVERVIEW);
        setIsPlaying(false);
        return;
      }
      setCursor(next);
    }, PLAY_INTERVAL);
    return () => window.clearInterval(timer);
  }, [finalStep, isPlaying, scan.visitedCount]);

  const isComplete = cursor === OVERVIEW || cursor === finalStep;
  const visibleResult = isComplete ? result : previewResult({ isTake, input, cursor, scan });
  const boundaryLabel = scan.boundaryIndex === -1 ? "No false result" : `Stops at input[${scan.boundaryIndex}]`;
  const currentCaption = getStepCaption({ cursor, finalStep, isTake, input, scan });

  function moveCursor(offset) {
    setIsPlaying(false);
    if (!scan.visitedCount) return;
    const current = cursor === OVERVIEW ? (offset > 0 ? -1 : finalStep + 1) : cursor;
    const next = current + offset;
    setCursor(next < 0 || next > finalStep ? OVERVIEW : next);
  }

  function togglePlayback() {
    if (!scan.visitedCount) return;
    if (!isPlaying && (cursor === OVERVIEW || cursor === finalStep)) setCursor(0);
    setIsPlaying((value) => !value);
  }

  return (
    <section className="while-lab" aria-label={`${fnId} boundary scan`}>
      <header className="while-lab-heading">
        <div>
          <span>Boundary scan</span>
          <strong>{isTake ? "Keep the passing prefix" : "Drop the passing prefix"}</strong>
        </div>
        <div className={`while-boundary-summary ${scan.boundaryIndex === -1 ? "is-open" : "is-stopped"}`}>
          <span>{scan.boundaryIndex === -1 ? "✓" : "■"}</span>
          <div>
            <strong>{boundaryLabel}</strong>
            <small>{formatCount(scan.visitedCount, "predicate call")}</small>
          </div>
        </div>
      </header>

      <div className="while-player" aria-label="Boundary scan controls">
        <div className="while-controls">
          <button className="icon-button while-play" type="button" aria-label={isPlaying ? "Pause" : "Play boundary scan"} onClick={togglePlayback} disabled={!scan.visitedCount}>
            <span aria-hidden="true">{isPlaying ? "❚❚" : "▶"}</span>
          </button>
          <button className="icon-button" type="button" aria-label="Previous step" onClick={() => moveCursor(-1)} disabled={!scan.visitedCount}>
            <span aria-hidden="true">&lt;</span>
          </button>
          <button className="icon-button" type="button" aria-label="Next step" onClick={() => moveCursor(1)} disabled={!scan.visitedCount}>
            <span aria-hidden="true">&gt;</span>
          </button>
        </div>
        <div className="while-progress" aria-live="polite">
          <span>{cursor === OVERVIEW ? "Result" : `${Math.min(cursor + 1, finalStep)}/${finalStep}`}</span>
          <strong>{currentCaption}</strong>
        </div>
        <div className="while-legend" aria-label="Scan legend">
          <span className="is-true">true</span>
          <span className="is-false">false · boundary</span>
          <span className="is-unvisited">not tested</span>
        </div>
      </div>

      <div className="while-stage">
        {input.length ? (
          <ol className="while-scan-lane" aria-label="Input scan order">
            {input.map((item, index) => {
              const state = itemState({ index, cursor, isComplete, isTake, scan });
              const canSelect = index < scan.visitedCount;
              return (
                <li className={`while-item-shell ${state.isBoundary ? "has-boundary" : ""}`} key={`${getItemLabel(item, index)}-${index}`}>
                  {state.isBoundary ? <span className="while-stop-line" aria-hidden="true">stop</span> : null}
                  <button
                    className={`while-item is-${state.outcome} ${state.isCurrent ? "is-current" : ""} ${state.isPending ? "is-pending" : ""}`}
                    type="button"
                    aria-label={`input ${index}, ${getItemLabel(item, index)}, ${state.label}`}
                    aria-pressed={state.isCurrent}
                    disabled={!canSelect}
                    onClick={() => {
                      setIsPlaying(false);
                      setCursor(index);
                    }}
                  >
                    <span className="while-item-index">[{index}]</span>
                    <strong>{shortLabel(getItemLabel(item, index), 18)}</strong>
                    <small>{shortLabel(getItemSubtitle(item), 18)}</small>
                    <em>{state.label}</em>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="while-empty">No input items to scan.</div>
        )}

        <div className="while-result-rail" aria-label="Current output preview">
          <div className="while-result-label">
            <span>{isComplete ? "Output" : "Preview"}</span>
            <strong>{formatCount(visibleResult, "item")}</strong>
          </div>
          <div className="while-result-items">
            {visibleResult.length ? (
              visibleResult.map((item, index) => (
                <span key={`${getItemLabel(item, index)}-${index}`}>{shortLabel(getItemLabel(item, index), 18)}</span>
              ))
            ) : (
              <em>{isTake || isComplete ? "empty array" : "waiting for the boundary"}</em>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function buildBoundaryScan(input, callbackContext) {
  const checks = [];
  let boundaryIndex = -1;

  for (let index = 0; index < input.length; index += 1) {
    const passed = Boolean(callbackContext.run(input[index], index, input));
    checks.push(passed);
    if (!passed) {
      boundaryIndex = index;
      break;
    }
  }

  return { checks, boundaryIndex, visitedCount: checks.length };
}

function itemState({ index, cursor, isComplete, isTake, scan }) {
  const wasTested = index < scan.visitedCount;
  const isBoundary = index === scan.boundaryIndex;
  const passed = wasTested ? scan.checks[index] : null;
  const isCurrent = cursor === index;
  const revealed = isComplete || index <= cursor || (scan.boundaryIndex !== -1 && cursor === scan.boundaryIndex);
  const isPending = !isComplete && !revealed;
  const kept = isTake ? passed === true : scan.boundaryIndex !== -1 && index >= scan.boundaryIndex;

  if (isPending) return { outcome: "pending", label: "waiting", isBoundary: false, isCurrent, isPending };
  if (!wasTested) return { outcome: kept ? "kept" : "excluded", label: kept ? "not tested · keep" : "not tested · exclude", isBoundary: false, isCurrent, isPending: false };
  if (isBoundary) return { outcome: kept ? "kept" : "excluded", label: kept ? "false · stop & keep" : "false · stop", isBoundary: true, isCurrent, isPending: false };
  return { outcome: kept ? "kept" : "dropped", label: kept ? "true · keep" : "true · drop", isBoundary: false, isCurrent, isPending: false };
}

function previewResult({ isTake, input, cursor, scan }) {
  if (cursor < 0) return [];
  if (isTake) return input.slice(0, Math.min(cursor + 1, scan.boundaryIndex === -1 ? input.length : scan.boundaryIndex));
  if (scan.boundaryIndex !== -1 && cursor >= scan.boundaryIndex) return input.slice(scan.boundaryIndex);
  return [];
}

function getStepCaption({ cursor, finalStep, isTake, input, scan }) {
  if (!input.length) return "An empty input returns an empty array";
  if (cursor === OVERVIEW) return scan.boundaryIndex === -1 ? "The predicate stayed true through the end" : `The first false result fixes the ${isTake ? "end" : "start"} of the output`;
  if (cursor === finalStep) return `${formatCount(scan.visitedCount, "item")} tested; ${formatCount(input.length - scan.visitedCount, "item")} skipped`;
  const passed = scan.checks[cursor];
  if (passed) return `${getItemLabel(input[cursor], cursor)} returns true — continue scanning`;
  return `${getItemLabel(input[cursor], cursor)} returns false — stop here`;
}
