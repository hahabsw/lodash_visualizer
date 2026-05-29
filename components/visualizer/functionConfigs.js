import _ from "lodash";
import { getDefaultCallbackExpression } from "./callbacks";

export const defaultFunctionId = "groupBy";

export const functionRouteIds = ["groupBy", "map", "filter", "reduce", "find", "sortBy", "countBy", "orderBy", "uniqBy", "sumBy", "keyBy", "flatMap", "partition", "chunk", "some", "every"];

function callbackExpression(fnId, datasetName, groupKey, callbackContext) {
  return callbackContext?.resolvedExpression ?? getDefaultCallbackExpression(fnId, datasetName, groupKey);
}

function lambda(expression) {
  return `item => ${expression}`;
}

function reduceLambda(expression) {
  return `(acc, item) => ${expression}`;
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
      id: "reduce",
      name: "_.reduce",
      category: "Collection",
      flow: "fold",
      signature: (datasetName, callbackContext) => `_.reduce(${datasetName}, ${reduceLambda(callbackExpression("reduce", datasetName, groupKey, callbackContext))}, 0)`,
      code: (datasetName, callbackContext) => `const result = _.reduce(input, ${reduceLambda(callbackExpression("reduce", datasetName, groupKey, callbackContext))}, 0);`,
      run: (input, _datasetName, callbackContext) => _.reduce(input, (acc, item, index, array) => callbackContext.run(item, index, array, acc), 0),
      isIncluded: () => true
    },
    {
      id: "find",
      name: "_.find",
      category: "Collection",
      flow: "find",
      signature: (datasetName, callbackContext) => `_.find(${datasetName}, ${lambda(callbackExpression("find", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.find(input, ${lambda(callbackExpression("find", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.find(input, (item, index, array) => Boolean(callbackContext.run(item, index, array))),
      isIncluded: (item, _datasetName, input, index, callbackContext) => {
        const matchIndex = _.findIndex(input, (candidate, candidateIndex, array) => Boolean(callbackContext.run(candidate, candidateIndex, array)));
        return matchIndex === index && input[matchIndex] === item;
      }
    },
    {
      id: "sortBy",
      name: "_.sortBy",
      category: "Collection",
      flow: "sort",
      signature: (datasetName, callbackContext) => `_.sortBy(${datasetName}, [${lambda(callbackExpression("sortBy", datasetName, groupKey, callbackContext))}])`,
      code: (datasetName, callbackContext) => `const result = _.sortBy(input, [${lambda(callbackExpression("sortBy", datasetName, groupKey, callbackContext))}]);`,
      run: (input, _datasetName, callbackContext) => _.sortBy(input, [(item, index, array) => callbackContext.run(item, index, array)]),
      isIncluded: () => true
    },
    {
      id: "countBy",
      name: "_.countBy",
      category: "Collection",
      flow: "count",
      signature: (datasetName, callbackContext) => `_.countBy(${datasetName}, ${lambda(callbackExpression("countBy", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.countBy(input, ${lambda(callbackExpression("countBy", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.countBy(input, (item, index, array) => callbackContext.run(item, index, array)),
      isIncluded: () => true
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
      id: "some",
      name: "_.some",
      category: "Collection",
      flow: "test",
      signature: (datasetName, callbackContext) => `_.some(${datasetName}, ${lambda(callbackExpression("some", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.some(input, ${lambda(callbackExpression("some", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.some(input, (item, index, array) => Boolean(callbackContext.run(item, index, array))),
      isIncluded: (item, _datasetName, input, index, callbackContext) => Boolean(callbackContext.run(item, index, input))
    },
    {
      id: "every",
      name: "_.every",
      category: "Collection",
      flow: "test",
      signature: (datasetName, callbackContext) => `_.every(${datasetName}, ${lambda(callbackExpression("every", datasetName, groupKey, callbackContext))})`,
      code: (datasetName, callbackContext) => `const result = _.every(input, ${lambda(callbackExpression("every", datasetName, groupKey, callbackContext))});`,
      run: (input, _datasetName, callbackContext) => _.every(input, (item, index, array) => Boolean(callbackContext.run(item, index, array))),
      isIncluded: (item, _datasetName, input, index, callbackContext) => Boolean(callbackContext.run(item, index, input))
    }
  ];
}
