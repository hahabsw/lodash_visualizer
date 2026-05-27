import { notFound } from "next/navigation";
import LodashVisualizer from "../../components/LodashVisualizer";
import { datasets, defaultDatasetName } from "../../components/visualizer/data";
import { functionRouteIds } from "../../components/visualizer/functionConfigs";

export function generateStaticParams() {
  return functionRouteIds.map((fnId) => ({ fnId }));
}

export default async function FunctionPage({ params, searchParams }) {
  const { fnId } = await params;
  const query = await searchParams;

  if (!functionRouteIds.includes(fnId)) notFound();

  const requestedDataset = Array.isArray(query?.dataset) ? query.dataset[0] : query?.dataset;
  const initialDatasetName = datasets[requestedDataset] ? requestedDataset : defaultDatasetName;

  return <LodashVisualizer key={`${fnId}-${initialDatasetName}`} activeFnId={fnId} initialDatasetName={initialDatasetName} />;
}
