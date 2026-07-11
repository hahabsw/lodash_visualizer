"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { normalizeDataGraph } from "./dataGraphModel";
import { shortLabel } from "./utils";

const toneColors = {
  "tone-teal": "#138f8f",
  "tone-coral": "#df634f",
  "tone-gold": "#b9831f",
  "tone-violet": "#6f58c9",
  "tone-green": "#3d8b49"
};

const kindBadges = {
  object: "{ }",
  array: "[ ]",
  field: "field",
  value: "value",
  key: "key",
  operator: "f(x)",
  bucket: "group"
};

const speeds = [
  { value: 650, label: "Fast" },
  { value: 1050, label: "Normal" },
  { value: 1600, label: "Slow" }
];

const OVERVIEW = -1;

export default function DataGraphCanvas({ graph }) {
  const dataGraph = useMemo(() => normalizeDataGraph(graph), [graph]);
  const columns = useMemo(() => resolveColumns(dataGraph), [dataGraph]);
  const nodeById = useMemo(() => new Map(dataGraph.nodes.map((node) => [node.id, node])), [dataGraph]);
  const columnIndexByNode = useMemo(() => {
    const map = new Map();
    columns.forEach((column, index) => column.nodeIds.forEach((nodeId) => map.set(nodeId, index)));
    return map;
  }, [columns]);
  const steps = useMemo(() => buildSteps(dataGraph), [dataGraph]);
  const stepIndexByEdge = useMemo(() => new Map(steps.map((step, index) => [step.edge.id, index])), [steps]);

  const [cursor, setCursor] = useState(OVERVIEW);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(speeds[1].value);
  const [selection, setSelection] = useState(null);
  const [hover, setHover] = useState(null);
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  useEffect(() => {
    setCursor(OVERVIEW);
    setIsPlaying(false);
    setSelection(null);
    setHover(null);
  }, [dataGraph.id]);

  useEffect(() => {
    if (!isPlaying || !steps.length) return undefined;
    const timer = window.setInterval(() => {
      const next = cursorRef.current === OVERVIEW ? 0 : cursorRef.current + 1;
      if (next >= steps.length) {
        setCursor(OVERVIEW);
        setIsPlaying(false);
      } else {
        setCursor(next);
      }
    }, speed);
    return () => window.clearInterval(timer);
  }, [isPlaying, speed, steps.length]);

  // --- geometry measurement (DOM blocks -> SVG edge anchors) ---
  const contentRef = useRef(null);
  const nodeElsRef = useRef(new Map());
  const [geometry, setGeometry] = useState({ width: 0, height: 0, rects: {} });

  const measure = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    const base = content.getBoundingClientRect();
    if (!base.width) return;
    const rects = {};
    nodeElsRef.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect();
      rects[id] = { x: rect.left - base.left, y: rect.top - base.top, w: rect.width, h: rect.height };
    });
    setGeometry((previous) => {
      const next = { width: Math.ceil(base.width), height: Math.ceil(base.height), rects };
      return geometryEquals(previous, next) ? previous : next;
    });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [dataGraph, measure]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return undefined;
    const observer = new ResizeObserver(() => measure());
    observer.observe(content);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const registerNode = useCallback((id) => (el) => {
    if (el) nodeElsRef.current.set(id, el);
    else nodeElsRef.current.delete(id);
  }, []);

  // --- per-render status helpers ---
  const focusId = hover?.type === "node" ? hover.id : selection?.type === "node" ? selection.item.id : null;
  const focusEdgeId = hover?.type === "edge" ? hover.id : selection?.type === "edge" ? selection.item.id : null;

  const renderedEdges = useMemo(() => {
    return dataGraph.edges.map((edge) => {
      const stepIndex = stepIndexByEdge.get(edge.id) ?? 0;
      const source = geometry.rects[edge.source];
      const target = geometry.rects[edge.target];
      const sourceColumn = columnIndexByNode.get(edge.source) ?? 0;
      const targetColumn = columnIndexByNode.get(edge.target) ?? 0;
      const path = source && target ? edgeGeometry(source, target, sourceColumn, targetColumn) : null;
      const status = cursor === OVERVIEW ? "done" : stepIndex < cursor ? "done" : stepIndex === cursor ? "current" : "future";
      const related = focusId === edge.source || focusId === edge.target || focusEdgeId === edge.id;
      return { edge, stepIndex, path, status, related, color: toneColors[edge.tone] || toneColors["tone-teal"] };
    });
  }, [columnIndexByNode, cursor, dataGraph.edges, focusEdgeId, focusId, geometry.rects, stepIndexByEdge]);

  const nodeStatus = useCallback(
    (node) => {
      if (cursor === OVERVIEW) return "active";
      const columnIndex = columnIndexByNode.get(node.id) ?? 0;
      const touching = dataGraph.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
      if (touching.some((edge) => (stepIndexByEdge.get(edge.id) ?? 0) === cursor)) return "current";
      if (columnIndex === 0 || !touching.length) return "active";
      if (touching.some((edge) => (stepIndexByEdge.get(edge.id) ?? 0) < cursor)) return "active";
      return "future";
    },
    [columnIndexByNode, cursor, dataGraph.edges, stepIndexByEdge]
  );

  const incoming = useMemo(() => {
    const map = new Map();
    dataGraph.edges.forEach((edge) => {
      if (!map.has(edge.target)) map.set(edge.target, []);
      map.get(edge.target).push(edge);
    });
    return map;
  }, [dataGraph.edges]);

  const currentStep = cursor === OVERVIEW ? null : steps[cursor];
  const showInspector = Boolean(selection || currentStep);
  const showAllLabels = dataGraph.edges.length <= 6;
  const usedToneKeys = useMemo(() => [...new Set(dataGraph.edges.map((edge) => edge.tone || "tone-teal"))], [dataGraph.edges]);

  function selectNode(node) {
    setSelection((previous) => (previous?.type === "node" && previous.item.id === node.id ? null : { type: "node", item: node }));
  }

  function selectEdge(edge) {
    setSelection((previous) => (previous?.type === "edge" && previous.item.id === edge.id ? null : { type: "edge", item: edge }));
  }

  return (
    <div className="data-graph-card" aria-label={dataGraph.title}>
      <div className="data-graph-heading">
        <span>Data flow</span>
        <strong>{dataGraph.title}</strong>
      </div>

      <StepPlayer
        steps={steps}
        frames={dataGraph.frames}
        cursor={cursor}
        isPlaying={isPlaying}
        speed={speed}
        nodeById={nodeById}
        onCursorChange={(value) => {
          setIsPlaying(false);
          setCursor(value);
        }}
        onTogglePlay={() => {
          if (!steps.length) return;
          if (!isPlaying && cursor === OVERVIEW) setCursor(0);
          setIsPlaying((value) => !value);
        }}
        onSpeedChange={setSpeed}
      />

      <div className={`data-graph-workspace ${showInspector ? "" : "is-inspector-hidden"}`}>
        <div className="graph-stage" aria-label="Block graph">
          <div className="graph-stage-inner" ref={contentRef} style={{ "--graph-columns": columns.length }}>
            <svg className="graph-edges" width={geometry.width} height={geometry.height} viewBox={`0 0 ${Math.max(1, geometry.width)} ${Math.max(1, geometry.height)}`} aria-hidden="true">
              <defs>
                {usedToneKeys.map((tone) => (
                  <marker key={tone} id={`graph-arrow-${tone}`} viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill={toneColors[tone] || toneColors["tone-teal"]} />
                  </marker>
                ))}
              </defs>
              {renderedEdges.map(({ edge, path, status, related, color }) =>
                path ? (
                  <g key={edge.id} className={`graph-edge is-${status} is-kind-${safeKind(edge.kind)} ${related ? "is-related" : ""}`}>
                    <path
                      className="graph-edge-hit"
                      d={path.d}
                      onClick={() => selectEdge(edge)}
                      onMouseEnter={() => setHover({ type: "edge", id: edge.id })}
                      onMouseLeave={() => setHover(null)}
                    />
                    <path className="graph-edge-line" d={path.d} style={{ stroke: color }} markerEnd={`url(#graph-arrow-${edge.tone || "tone-teal"})`} />
                  </g>
                ) : null
              )}
              {currentStep
                ? renderedEdges
                    .filter(({ edge, path }) => path && edge.id === currentStep.edge.id)
                    .map(({ edge, path, color }) => (
                      <circle key={`dot-${edge.id}`} className="graph-edge-dot" r="5.5" fill={color}>
                        <animateMotion dur={`${Math.max(450, speed - 150)}ms`} repeatCount="indefinite" path={path.d} />
                      </circle>
                    ))
                : null}
            </svg>

            {columns.map((column) => (
              <div className="graph-column" key={column.id}>
                <header className="graph-column-head">
                  <strong>{column.label}</strong>
                  <span>{column.nodeIds.length}</span>
                </header>
                <div className="graph-column-nodes">
                  {column.nodeIds.map((nodeId) => {
                    const node = nodeById.get(nodeId);
                    if (!node) return null;
                    const status = nodeStatus(node);
                    const incomingEdges = incoming.get(node.id) || [];
                    const arrived =
                      cursor === OVERVIEW
                        ? incomingEdges.length
                        : incomingEdges.filter((edge) => (stepIndexByEdge.get(edge.id) ?? 0) <= cursor).length;
                    const isSelected = selection?.type === "node" && selection.item.id === node.id;
                    return (
                      <GraphBlock
                        key={node.id}
                        node={node}
                        status={status}
                        isSelected={isSelected}
                        isRelated={focusId === node.id}
                        counter={incomingEdges.length > 1 ? { arrived, total: incomingEdges.length, showProgress: cursor !== OVERVIEW } : null}
                        registerRef={registerNode(node.id)}
                        onSelect={() => selectNode(node)}
                        onHover={(entered) => setHover(entered ? { type: "node", id: node.id } : null)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {renderedEdges
              .filter(({ edge, path, status, related }) => path && (status === "current" || related || (showAllLabels && status !== "future")))
              .map(({ edge, path, status, color }) => (
                <div
                  key={`label-${edge.id}`}
                  className={`graph-edge-label is-${status}`}
                  style={{ left: path.mid.x, top: path.mid.y, "--edge-color": color }}
                >
                  {shortLabel(edge.label, 22)}
                </div>
              ))}
          </div>
        </div>

        {showInspector ? <FocusInspector selection={selection} cursor={cursor} steps={steps} graph={dataGraph} nodeById={nodeById} /> : null}
      </div>
    </div>
  );
}

function GraphBlock({ node, status, isSelected, isRelated, counter, registerRef, onSelect, onHover }) {
  const hasFields = node.fields?.length > 0;
  return (
    <div
      ref={registerRef}
      className={`graph-block ${node.tone} is-${node.kind} is-${status} ${isSelected ? "is-selected" : ""} ${isRelated ? "is-related" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className="graph-block-top">
        <span>{shortLabel(node.eyebrow || node.kind, 24)}</span>
        <code>{kindBadges[node.kind] || node.kind}</code>
      </div>
      <strong>{shortLabel(node.label || node.id, 30)}</strong>
      {node.value ? <p>{shortLabel(node.value, 42)}</p> : null}
      {hasFields ? <FieldList fields={node.fields} /> : null}
      {node.detail ? <small>{shortLabel(node.detail, 44)}</small> : null}
      {counter ? (
        <span className="graph-block-counter" title={`${counter.arrived} of ${counter.total} incoming flows arrived`}>
          {counter.showProgress ? `${counter.arrived}/${counter.total}` : counter.total}
        </span>
      ) : null}
    </div>
  );
}

function FieldList({ fields }) {
  return (
    <div className="graph-node-fields">
      {fields.map((field) => (
        <div className={`graph-node-field ${field.selected ? "is-selected" : ""} ${field.muted ? "is-muted" : ""}`} key={field.key}>
          <code>{shortLabel(field.key, 13)}</code>
          <span>{shortLabel(field.value, 18)}</span>
          {field.renamedTo ? <small>{shortLabel(`-> ${field.renamedTo}`, 18)}</small> : null}
          {field.derivedFrom ? <small>{shortLabel(`from ${field.derivedFrom}`, 18)}</small> : null}
        </div>
      ))}
    </div>
  );
}

function StepPlayer({ steps, frames, cursor, isPlaying, speed, nodeById, onCursorChange, onTogglePlay, onSpeedChange }) {
  const total = steps.length;
  const sliderValue = cursor === OVERVIEW ? total : cursor;
  const currentStep = cursor === OVERVIEW ? null : steps[cursor];
  const activePhase = currentStep?.edge.phase ?? null;

  function jumpToPhase(phase) {
    const index = steps.findIndex((step) => step.edge.phase === phase);
    onCursorChange(index === -1 ? OVERVIEW : index);
  }

  function stepBy(offset) {
    if (!total) return;
    const current = cursor === OVERVIEW ? (offset > 0 ? -1 : total) : cursor;
    const next = current + offset;
    onCursorChange(next < 0 || next >= total ? OVERVIEW : next);
  }

  return (
    <div className="step-player" aria-label="Data flow step player">
      <div className="step-player-row">
        <div className="step-controls">
          <button className="icon-button step-play" type="button" aria-label={isPlaying ? "Pause" : "Play step by step"} title={isPlaying ? "Pause" : "Play step by step"} onClick={onTogglePlay} disabled={!total}>
            <span aria-hidden="true">{isPlaying ? "❚❚" : "▶"}</span>
          </button>
          <button className="icon-button step-button" type="button" aria-label="Previous step" title="Previous step" onClick={() => stepBy(-1)} disabled={!total}>
            <span aria-hidden="true">&lt;</span>
          </button>
          <button className="icon-button step-button" type="button" aria-label="Next step" title="Next step" onClick={() => stepBy(1)} disabled={!total}>
            <span aria-hidden="true">&gt;</span>
          </button>
        </div>

        <div className="phase-chips" role="tablist" aria-label="Flow phases">
          {frames.map((frame) => {
            const hasSteps = steps.some((step) => step.edge.phase === frame.phase);
            return (
              <button
                key={frame.id}
                className={`phase-chip ${activePhase === frame.phase ? "is-active" : ""} ${cursor !== OVERVIEW && activePhase > frame.phase ? "is-complete" : ""}`}
                type="button"
                role="tab"
                aria-selected={activePhase === frame.phase}
                disabled={!hasSteps}
                onClick={() => jumpToPhase(frame.phase)}
              >
                <span>{String(frame.phase).padStart(2, "0")}</span>
                <strong>{frame.label}</strong>
              </button>
            );
          })}
          <button
            className={`phase-chip phase-chip-all ${cursor === OVERVIEW ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={cursor === OVERVIEW}
            onClick={() => onCursorChange(OVERVIEW)}
          >
            <span>✓</span>
            <strong>Full result</strong>
          </button>
        </div>

        <label className="step-speed">
          <span>Speed</span>
          <select value={speed} onChange={(event) => onSpeedChange(Number(event.target.value))}>
            {speeds.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {total ? (
        <div className="step-player-row step-scrub-row">
          <input
            className="step-slider"
            type="range"
            min={0}
            max={total}
            step={1}
            value={sliderValue}
            aria-label="Scrub through steps"
            onChange={(event) => {
              const value = Number(event.target.value);
              onCursorChange(value >= total ? OVERVIEW : value);
            }}
          />
          <StepCaption cursor={cursor} steps={steps} total={total} nodeById={nodeById} />
        </div>
      ) : null}
    </div>
  );
}

function StepCaption({ cursor, steps, total, nodeById }) {
  if (cursor === OVERVIEW) {
    return (
      <p className="step-caption">
        <strong className="step-caption-count">{total} steps</strong>
        <span>Full result shown — press ▶ to watch each value flow</span>
      </p>
    );
  }
  const step = steps[cursor];
  const source = nodeById.get(step.edge.source);
  const target = nodeById.get(step.edge.target);
  return (
    <p className="step-caption">
      <strong className="step-caption-count">
        {cursor + 1}/{total}
      </strong>
      <code style={{ "--edge-color": toneColors[step.edge.tone] || toneColors["tone-teal"] }}>{shortLabel(step.edge.label, 20)}</code>
      <span>
        {shortLabel(source?.label || step.edge.source, 18)} <em aria-hidden="true">→</em> {shortLabel(target?.label || step.edge.target, 18)}
      </span>
    </p>
  );
}

function FocusInspector({ selection, cursor, steps, graph, nodeById }) {
  const selected = selection?.item;
  const currentStep = cursor === OVERVIEW ? null : steps[cursor];
  const title = selected ? selected.label || selected.id : currentStep ? currentStep.edge.label : "Select a block or arrow";
  const details = selected ? selected.meta || {} : currentStep ? currentStep.edge.meta || {} : graph.meta || {};
  const isEdge = selection?.type === "edge";

  return (
    <aside className="focus-inspector" aria-label="Graph focus inspector">
      <div className="focus-inspector-head">
        <span>Focus inspector</span>
        <strong>{shortLabel(title, 28)}</strong>
      </div>

      <dl className="focus-inspector-list">
        <div>
          <dt>Kind</dt>
          <dd>{selected ? selected.kind : graph.meta?.operation || "graph"}</dd>
        </div>
        {isEdge ? (
          <>
            <div>
              <dt>From</dt>
              <dd>{shortLabel(nodeById.get(selected.source)?.label || selected.source, 30)}</dd>
            </div>
            <div>
              <dt>To</dt>
              <dd>{shortLabel(nodeById.get(selected.target)?.label || selected.target, 30)}</dd>
            </div>
          </>
        ) : (
          <div>
            <dt>Path</dt>
            <dd>{selected?.path || "input -> output"}</dd>
          </div>
        )}
        {selected?.value ? (
          <div>
            <dt>Value</dt>
            <dd>{shortLabel(selected.value, 34)}</dd>
          </div>
        ) : null}
        {currentStep && !selected ? (
          <div>
            <dt>Step</dt>
            <dd>
              {cursor + 1} of {steps.length}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mini-json-panel">
        <div className="mini-json-panel-head">
          <span>Selected metadata</span>
          <strong>{selection?.type || (currentStep ? "step" : "graph")}</strong>
        </div>
        <pre>{JSON.stringify(details, null, 2)}</pre>
      </div>
    </aside>
  );
}

// --- pure helpers ---

function resolveColumns(graph) {
  if (graph.columns?.length) return graph.columns;
  return [{ id: "graph", label: "Graph", nodeIds: graph.nodes.map((node) => node.id) }];
}

function buildSteps(graph) {
  return graph.edges
    .map((edge, index) => ({ edge, order: index }))
    .sort((a, b) => (a.edge.phase - b.edge.phase) || (a.order - b.order))
    .map(({ edge }) => ({ edge }));
}

function edgeGeometry(source, target, sourceColumn, targetColumn) {
  if (sourceColumn === targetColumn) {
    const sx = source.x + source.w;
    const sy = source.y + source.h / 2;
    const tx = target.x + target.w;
    const ty = target.y + target.h / 2;
    const bow = 46;
    const d = `M ${sx} ${sy} C ${sx + bow} ${sy}, ${tx + bow} ${ty}, ${tx} ${ty}`;
    return { d, mid: cubicMidpoint([sx, sy], [sx + bow, sy], [tx + bow, ty], [tx, ty]) };
  }
  const forward = targetColumn > sourceColumn;
  const sx = forward ? source.x + source.w : source.x;
  const sy = source.y + source.h / 2;
  const tx = forward ? target.x : target.x + target.w;
  const ty = target.y + target.h / 2;
  const spread = Math.max(36, Math.abs(tx - sx) * 0.45);
  const c1x = forward ? sx + spread : sx - spread;
  const c2x = forward ? tx - spread : tx + spread;
  const d = `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ty}, ${tx} ${ty}`;
  return { d, mid: cubicMidpoint([sx, sy], [c1x, sy], [c2x, ty], [tx, ty]) };
}

function cubicMidpoint(p0, p1, p2, p3) {
  return {
    x: (p0[0] + 3 * p1[0] + 3 * p2[0] + p3[0]) / 8,
    y: (p0[1] + 3 * p1[1] + 3 * p2[1] + p3[1]) / 8
  };
}

function geometryEquals(a, b) {
  if (a.width !== b.width || a.height !== b.height) return false;
  const aKeys = Object.keys(a.rects);
  const bKeys = Object.keys(b.rects);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => {
    const ra = a.rects[key];
    const rb = b.rects[key];
    return rb && ra.x === rb.x && ra.y === rb.y && ra.w === rb.w && ra.h === rb.h;
  });
}

function safeKind(kind) {
  return String(kind || "flow").replace(/[^a-zA-Z0-9_-]/g, "_");
}
