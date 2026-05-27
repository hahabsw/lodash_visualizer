export const defaultFrames = [
  { phase: 1, id: "read", label: "read input" },
  { phase: 2, id: "transform", label: "transform" },
  { phase: 3, id: "write", label: "write output" }
];

export function normalizeDataGraph(graph) {
  const frames = normalizeFrames(graph.frames || framesFromGraph(graph));
  const nodes = graph.nodes.map((node) => normalizeNode(node));
  const edges = graph.edges.map((edge) => normalizeEdge(edge));

  return {
    ...graph,
    frames,
    nodes,
    edges,
    meta: graph.meta || {}
  };
}

export function normalizeFrames(frames = defaultFrames) {
  return frames.map((frame, index) => ({
    id: frame.id || `phase-${frame.phase ?? index + 1}`,
    phase: frame.phase ?? index + 1,
    label: frame.label || `phase ${frame.phase ?? index + 1}`
  }));
}

export function framesFromGraph(graph) {
  const phases = [...(graph.nodes || []), ...(graph.edges || [])].map((item) => Number(item.phase) || 1);
  const maxPhase = Math.max(3, ...phases);
  return Array.from({ length: maxPhase }, (_, index) => ({
    phase: index + 1,
    id: index === 0 ? "read" : index === maxPhase - 1 ? "write" : `transform-${index}`,
    label: index === 0 ? "read input" : index === maxPhase - 1 ? "write output" : `transform ${index}`
  }));
}

export function phaseFrames(labels = []) {
  if (!labels.length) return defaultFrames;
  return labels.map((label, index) => ({ phase: index + 1, id: safeId(label), label }));
}

export function graphNode(node) {
  return normalizeNode(node);
}

export function graphEdge(edge) {
  return normalizeEdge(edge);
}

export function normalizeNode(node) {
  return {
    kind: "value",
    tone: "tone-teal",
    phase: 1,
    path: node.id,
    label: "",
    value: "",
    ...node,
    meta: node.meta || {}
  };
}

export function normalizeEdge(edge) {
  return {
    kind: edge.label || "flow",
    tone: "tone-teal",
    phase: 2,
    label: "flow",
    animated: true,
    ...edge,
    meta: edge.meta || {}
  };
}

export function phaseForStep(stepIndex, totalSteps, bucketCount = 3) {
  if (totalSteps <= 0) return 1;
  const normalized = stepIndex / Math.max(1, totalSteps - 1);
  return Math.min(bucketCount, Math.max(1, Math.floor(normalized * bucketCount) + 1));
}

export function safeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}
