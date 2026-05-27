"use client";

import { shortLabel } from "./utils";

const markerColors = {
  teal: "#138f8f",
  coral: "#df634f",
  gold: "#b9831f",
  violet: "#6f58c9",
  green: "#3d8b49"
};

export default function DataGraphCanvas({ graph }) {
  const layout = createLayout(graph);
  const markerPrefix = `graph-${graph.id}`.replace(/[^a-zA-Z0-9_-]/g, "_");

  return (
    <div className="data-graph-card" aria-label={graph.title}>
      <div className="data-graph-heading">
        <span>Unified data graph</span>
        <strong>{graph.title}</strong>
      </div>
      <div className="data-graph-scroll">
        <svg className="data-graph-svg" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={graph.title}>
          <defs>
            {Object.entries(markerColors).map(([name, color]) => (
              <marker id={`${markerPrefix}-${name}`} viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto" key={name}>
                <path d="M2,2 L10,6 L2,10 Z" fill={color} />
              </marker>
            ))}
          </defs>

          {layout.columns.map((column) => (
            <text className="data-graph-column-label" x={column.centerX} y="30" textAnchor="middle" key={column.id}>
              {column.label}
            </text>
          ))}

          {graph.edges.map((edge) => {
            const source = layout.nodes.get(edge.source);
            const target = layout.nodes.get(edge.target);
            if (!source || !target) return null;
            const toneName = edge.tone.replace("tone-", "");
            const startX = source.x + source.width;
            const startY = source.y + source.height / 2;
            const endX = target.x;
            const endY = target.y + target.height / 2;
            const curve = Math.max(72, Math.abs(endY - startY) * 0.36);
            return (
              <g key={edge.id}>
                <path
                  className={`data-graph-edge ${edge.tone}`}
                  style={{ "--delay": `${edge.phase * 80}ms` }}
                  markerEnd={`url(#${markerPrefix}-${toneName})`}
                  d={`M ${startX + 8} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX - 10} ${endY}`}
                />
                <text className="data-graph-edge-label" x={(startX + endX) / 2} y={(startY + endY) / 2 - 8} textAnchor="middle">
                  {edge.label}
                </text>
              </g>
            );
          })}

          {graph.nodes.map((node) => {
            const position = layout.nodes.get(node.id);
            if (!position) return null;
            return <GraphNode node={node} position={position} key={node.id} />;
          })}
        </svg>
      </div>
    </div>
  );
}

function GraphNode({ node, position }) {
  return (
    <g className={`data-graph-node ${node.tone} is-${node.kind}`} style={{ "--delay": `${position.order * 70}ms` }}>
      <rect x={position.x} y={position.y} width={position.width} height={position.height} rx="8" />
      <text className="data-graph-node-eyebrow" x={position.x + 12} y={position.y + 20}>
        {shortLabel(node.eyebrow, 28)}
      </text>
      <text className="data-graph-node-label" x={position.x + 12} y={position.y + 42}>
        {shortLabel(node.label, 28)}
      </text>
      <text className="data-graph-node-value" x={position.x + 12} y={position.y + 63}>
        {shortLabel(node.value, 34)}
      </text>
      {node.detail ? (
        <text className="data-graph-node-detail" x={position.x + 12} y={position.y + 82}>
          {shortLabel(node.detail, 34)}
        </text>
      ) : null}
    </g>
  );
}

function createLayout(graph) {
  const width = 1024;
  const nodeWidth = 220;
  const nodeHeight = 78;
  const top = 62;
  const rowGap = 96;
  const maxRows = Math.max(...graph.columns.map((column) => column.nodeIds.length), 1);
  const height = Math.max(280, top + maxRows * rowGap + 18);
  const left = 34;
  const right = width - nodeWidth - 34;
  const columnGap = graph.columns.length > 1 ? (right - left) / (graph.columns.length - 1) : 0;
  const nodes = new Map();

  const columns = graph.columns.map((column, columnIndex) => {
    const x = left + columnIndex * columnGap;
    const rows = column.nodeIds.length;
    const columnHeight = Math.max(0, (rows - 1) * rowGap);
    const startY = top + Math.max(0, (height - top - 18 - columnHeight - nodeHeight) / 2);

    column.nodeIds.forEach((nodeId, rowIndex) => {
      nodes.set(nodeId, {
        x,
        y: startY + rowIndex * rowGap,
        width: nodeWidth,
        height: nodeHeight,
        order: columnIndex * 10 + rowIndex
      });
    });

    return {
      ...column,
      x,
      centerX: x + nodeWidth / 2
    };
  });

  return { width, height, columns, nodes };
}
