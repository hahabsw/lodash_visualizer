"use client";

import { useEffect, useMemo, useState } from "react";
import { Background, Controls, Handle, MarkerType, Position, ReactFlow } from "@xyflow/react";
import { normalizeDataGraph } from "./dataGraphModel";
import TimelinePlayer from "./TimelinePlayer";
import { shortLabel } from "./utils";

const toneColors = {
  "tone-teal": "#138f8f",
  "tone-coral": "#df634f",
  "tone-gold": "#b9831f",
  "tone-violet": "#6f58c9",
  "tone-green": "#3d8b49"
};

const nodeTypes = {
  array: DataGraphNode,
  object: DataGraphNode,
  field: DataGraphNode,
  value: DataGraphNode,
  key: DataGraphNode,
  operator: DataGraphNode,
  bucket: DataGraphNode
};

export default function DataGraphCanvas({ graph }) {
  const dataGraph = useMemo(() => normalizeDataGraph(graph), [graph]);
  const firstPhase = dataGraph.frames[0]?.phase || 1;
  const [currentPhase, setCurrentPhase] = useState(firstPhase);
  const [selection, setSelection] = useState(null);
  const layout = useMemo(() => createFlowLayout(dataGraph), [dataGraph]);

  useEffect(() => {
    setCurrentPhase(firstPhase);
    setSelection(null);
  }, [dataGraph.id, firstPhase]);

  const flowNodes = useMemo(
    () =>
      dataGraph.nodes.map((node) => {
        const position = layout.nodes.get(node.id) || { x: 0, y: 0 };
        return {
          id: node.id,
          type: node.kind,
          position,
          data: {
            node,
            active: node.phase <= currentPhase,
            current: node.phase === currentPhase
          },
          draggable: false,
          selectable: true,
          className: `flow-data-node ${node.tone} ${node.phase <= currentPhase ? "is-visible" : "is-future"}`
        };
      }),
    [currentPhase, dataGraph.nodes, layout.nodes]
  );

  const flowEdges = useMemo(
    () =>
      dataGraph.edges.map((edge) => {
        const active = edge.phase <= currentPhase;
        const current = edge.phase === currentPhase;
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          animated: current && edge.animated !== false,
          className: `flow-data-edge ${edge.tone} is-${edge.kind} ${active ? "is-visible" : "is-future"}`,
          style: {
            stroke: toneColors[edge.tone] || toneColors["tone-teal"],
            strokeWidth: current ? 3.2 : 2.4,
            opacity: active ? 0.86 : 0.18
          },
          labelStyle: { fill: active ? "#18202f" : "#9aa7b8", fontWeight: 800, fontSize: 11 },
          labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: toneColors[edge.tone] || toneColors["tone-teal"]
          },
          data: { edge, active, current }
        };
      }),
    [currentPhase, dataGraph.edges]
  );

  const activeFrame = dataGraph.frames.find((frame) => frame.phase === currentPhase) || dataGraph.frames[0];

  return (
    <div className="data-graph-card" aria-label={dataGraph.title}>
      <div className="data-graph-heading">
        <span>Unified data graph</span>
        <strong>{dataGraph.title}</strong>
      </div>

      <TimelinePlayer frames={dataGraph.frames} currentPhase={currentPhase} onPhaseChange={setCurrentPhase} />

      <div className="data-graph-workspace">
        <div className="data-graph-flow" style={{ minHeight: layout.height }}>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.45}
            maxZoom={1.3}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={(_, node) => setSelection({ type: "node", item: node.data.node })}
            onEdgeClick={(_, edge) => setSelection({ type: "edge", item: edge.data.edge })}
          >
            <Background gap={22} size={1} color="#dce3ee" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <FocusInspector selection={selection} frame={activeFrame} graph={dataGraph} />
      </div>
    </div>
  );
}

function DataGraphNode({ data }) {
  const { node, active, current } = data;
  const hasFields = node.fields?.length > 0;
  return (
    <div className={`graph-flow-node ${node.tone} is-${node.kind} ${active ? "is-active" : "is-future"} ${current ? "is-current" : ""}`}>
      <Handle className="graph-handle" type="target" position={Position.Left} />
      <div className="graph-flow-node-topline">
        <span>{shortLabel(node.eyebrow || node.kind, 24)}</span>
        <code>{node.kind}</code>
      </div>
      <strong>{shortLabel(node.label || node.id, 30)}</strong>
      <p>{shortLabel(node.value || node.path || "value", 42)}</p>
      {hasFields ? <FieldList fields={node.fields} /> : null}
      {node.detail ? <small>{shortLabel(node.detail, 44)}</small> : null}
      <Handle className="graph-handle" type="source" position={Position.Right} />
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

function FocusInspector({ selection, frame, graph }) {
  const selected = selection?.item;
  const title = selected ? selected.label || selected.id : "Select a node or edge";
  const details = selected ? selected.meta || {} : graph.meta || {};

  return (
    <aside className="focus-inspector" aria-label="Graph focus inspector">
      <div className="focus-inspector-head">
        <span>Focus inspector</span>
        <strong>{shortLabel(title, 28)}</strong>
      </div>

      <dl className="focus-inspector-list">
        <div>
          <dt>Phase</dt>
          <dd>{frame ? `${frame.phase}. ${frame.label}` : "none"}</dd>
        </div>
        <div>
          <dt>Kind</dt>
          <dd>{selected ? selected.kind : graph.meta?.operation || "graph"}</dd>
        </div>
        <div>
          <dt>Path</dt>
          <dd>{selected?.path || selected?.source || "input -> output"}</dd>
        </div>
        {selected?.target ? (
          <div>
            <dt>Target</dt>
            <dd>{selected.target}</dd>
          </div>
        ) : null}
        {selected?.value ? (
          <div>
            <dt>Value</dt>
            <dd>{selected.value}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mini-json-panel">
        <div className="mini-json-panel-head">
          <span>Selected metadata</span>
          <strong>{selection?.type || "graph"}</strong>
        </div>
        <pre>{JSON.stringify(details, null, 2)}</pre>
      </div>
    </aside>
  );
}

function createFlowLayout(graph) {
  const nodeWidth = 220;
  const baseNodeHeight = 116;
  const columnGap = 330;
  const rowGap = 34;
  const top = 40;
  const left = 24;
  const nodes = new Map();
  const columns = graph.columns?.length ? graph.columns : [{ id: "graph", label: "Graph", nodeIds: graph.nodes.map((node) => node.id) }];
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const columnHeights = columns.map((column) => Math.max(0, column.nodeIds.reduce((sum, nodeId) => sum + estimateNodeHeight(nodeById.get(nodeId)) + rowGap, 0) - rowGap));
  const maxColumnHeight = Math.max(...columnHeights, baseNodeHeight);

  columns.forEach((column, columnIndex) => {
    let y = top + Math.max(0, (maxColumnHeight - columnHeights[columnIndex]) / 2);

    column.nodeIds.forEach((nodeId) => {
      const node = nodeById.get(nodeId);
      const height = estimateNodeHeight(node);
      nodes.set(nodeId, {
        x: left + columnIndex * columnGap,
        y,
        height
      });
      y += height + rowGap;
    });
  });

  return {
    nodes,
    width: left * 2 + Math.max(1, columns.length) * nodeWidth + Math.max(0, columns.length - 1) * (columnGap - nodeWidth),
    height: Math.max(430, top * 2 + maxColumnHeight)
  };
}

function estimateNodeHeight(node) {
  const fieldRows = Math.min(8, node?.fields?.length || 0);
  return 116 + fieldRows * 35;
}
