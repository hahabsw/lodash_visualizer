import _ from "lodash";
import { getDefaultCallbackExpression } from "./callbacks";

export const defaultFunctionId = "groupBy";

export const functionRouteIds = ["groupBy", "map", "filter", "orderBy", "partition", "chunk", "uniqBy", "sumBy", "keyBy", "flatMap"];

function callbackExpression(fnId, datasetName, groupKey, callbackContext) {
  return callbackContext?.resolvedExpression ?? getDefaultCallbackExpression(fnId, datasetName, groupKey);
}

function lambda(expression) {
  return `item => ${expression}`;
}

export function createFunctionConfigs(groupKey) {
  return [
    {
      id: "groupBy",
      name: "_.groupBy",
      category: "Collection",
      flow: "group",
      signature: (datasetName, callbackContext) => `_.groupBy(${datasetName}, ${lambda(callbackExpression("groupBy", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.groupBy(input, ${lambda(callbackExpression("groupBy", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.groupBy(input, (item, index, array) => callbackContext.run(item, index, array)),
      isIncluded: () => true
    },
    {
      id: "map",
      name: "_.map",
      category: "Collection",
      flow: "shape",
      signature: (datasetName, callbackContext) => `_.map(${datasetName}, ${lambda(callbackExpression("map", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.map(input, ${lambda(callbackExpression("map", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.map(input, (item, index, array) => callbackContext.run(item, index, array)),
      isIncluded: () => true
    },
    {
      id: "filter",
      name: "_.filter",
      category: "Collection",
      flow: "keep",
      signature: (datasetName, callbackContext) => `_.filter(${datasetName}, ${lambda(callbackExpression("filter", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.filter(input, ${lambda(callbackExpression("filter", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.filter(input, (item, index, array) => Boolean(callbackContext.run(item, index, array))),
      isIncluded: (item, _datasetName, input, index, callbackContext) => Boolean(callbackContext.run(item, index, input))
    },
    {
      id: "orderBy",
      name: "_.orderBy",
      category: "Collection",
      flow: "sort",
      signature: (datasetName, callbackContext) => `_.orderBy(${datasetName}, [${lambda(callbackExpression("orderBy", datasetName, groupKey, callbackContext))}], ["desc"])`,
      code: (datasetName, callbackContext) => `const result = _.orderBy(input, [${lambda(callbackExpression("orderBy", datasetName, groupKey, callbackContext))}], ["desc"]);`,
      run: (input, _datasetName, callbackContext) => _.orderBy(input, [(item, index, array) => callbackContext.run(item, index, array)], ["desc"]),
      isIncluded: () => true
    },
    {
      id: "partition",
      name: "_.partition",
      category: "Collection",
      flow: "split",
      signature: (datasetName, callbackContext) => `_.partition(${datasetName}, ${lambda(callbackExpression("partition", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.partition(input, ${lambda(callbackExpression("partition", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.partition(input, (item, index, array) => Boolean(callbackContext.run(item, index, array))),
      isIncluded: (item, _datasetName, input, index, callbackContext) => Boolean(callbackContext.run(item, index, input))
    },
    {
      id: "chunk",
      name: "_.chunk",
      category: "Array",
      flow: "batch",
      signature: (datasetName) => `_.chunk(${datasetName}, 2)`,
      code: () => "const result = _.chunk(input, 2);",
      run: (input) => _.chunk(input, 2),
      isIncluded: () => true
    },
    {
      id: "uniqBy",
      name: "_.uniqBy",
      category: "Array",
      flow: "dedupe",
      signature: (datasetName, callbackContext) => `_.uniqBy(${datasetName}, ${lambda(callbackExpression("uniqBy", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.uniqBy(input, ${lambda(callbackExpression("uniqBy", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.uniqBy(input, (item, index, array) => callbackContext.run(item, index, array)),
      isIncluded: (item, _datasetName, input, index, callbackContext) => {
        const current = callbackContext.run(item, index, input);
        return input.findIndex((candidate, candidateIndex, array) => _.isEqual(callbackContext.run(candidate, candidateIndex, array), current)) === index;
      }
    },
    {
      id: "sumBy",
      name: "_.sumBy",
      category: "Math",
      flow: "sum",
      signature: (datasetName, callbackContext) => `_.sumBy(${datasetName}, ${lambda(callbackExpression("sumBy", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.sumBy(input, ${lambda(callbackExpression("sumBy", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.sumBy(input, (item, index, array) => Number(callbackContext.run(item, index, array)) || 0),
      isIncluded: () => true
    },
    {
      id: "keyBy",
      name: "_.keyBy",
      category: "Collection",
      flow: "index",
      signature: (datasetName, callbackContext) => `_.keyBy(${datasetName}, ${lambda(callbackExpression("keyBy", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.keyBy(input, ${lambda(callbackExpression("keyBy", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.keyBy(input, (item, index, array) => callbackContext.run(item, index, array)),
      isIncluded: () => true
    },
    {
      id: "flatMap",
      name: "_.flatMap",
      category: "Collection",
      flow: "expand",
      signature: (datasetName, callbackContext) => `_.flatMap(${datasetName}, ${lambda(callbackExpression("flatMap", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.flatMap(input, ${lambda(callbackExpression("flatMap", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.flatMap(input, (item, index, array) => callbackContext.run(item, index, array)),
      isIncluded: () => true
    }
  ];
}
