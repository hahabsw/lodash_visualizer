"use client";

import { useMemo } from "react";
import DataGraphCanvas from "./DataGraphCanvas";
import { createOperationGraph } from "./graphAdapters";

export default function OperationGraphLab({ fnId, input, result, datasetName }) {
  const graph = useMemo(() => createOperationGraph({ fnId, input, result, datasetName }), [datasetName, fnId, input, result]);

  return (
    <section className="groupby-lab operation-graph-lab" aria-label={`${fnId} data graph`}>
      <DataGraphCanvas graph={graph} />
    </section>
  );
}
