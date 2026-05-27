import _ from "lodash";

export const defaultFunctionId = "groupBy";

export const functionRouteIds = ["groupBy", "map", "filter", "orderBy", "partition", "chunk", "uniqBy", "sumBy", "keyBy", "flatMap"];

export function createFunctionConfigs(groupKey) {
  return [
    {
      id: "groupBy",
      name: "_.groupBy",
      category: "Collection",
      flow: "group",
      signature: (datasetName) => `_.groupBy(${datasetName}, "${groupKey}")`,
      code: () => `const key = "${groupKey}";\nconst result = _.groupBy(input, key);`,
      run: (input) => _.groupBy(input, groupKey),
      isIncluded: () => true
    },
    {
      id: "map",
      name: "_.map",
      category: "Collection",
      flow: "shape",
      signature: (datasetName) => `_.map(${datasetName}, item => pickLabel(item))`,
      code: () => `const result = _.map(input, item => ({\n  label: item.customer ?? item.name ?? item.page,\n  value: item.total ?? item.score ?? item.value,\n  source: item.id\n}));`,
      run: (input) =>
        _.map(input, (item) => ({
          label: item.customer ?? item.name ?? item.page,
          value: item.total ?? item.score ?? item.value,
          source: item.id
        })),
      isIncluded: () => true
    },
    {
      id: "filter",
      name: "_.filter",
      category: "Collection",
      flow: "keep",
      signature: (datasetName) =>
        datasetName === "orders"
          ? "_.filter(orders, order => order.total >= 100)"
          : datasetName === "people"
            ? "_.filter(people, { active: true })"
            : '_.filter(events, event => event.device === "mobile")',
      code: (datasetName) => {
        if (datasetName === "orders") return "const result = _.filter(input, item => item.total >= 100);";
        if (datasetName === "people") return "const result = _.filter(input, { active: true });";
        return 'const result = _.filter(input, item => item.device === "mobile");';
      },
      run: (input, datasetName) => {
        if (datasetName === "orders") return _.filter(input, (item) => item.total >= 100);
        if (datasetName === "people") return _.filter(input, { active: true });
        return _.filter(input, (item) => item.device === "mobile");
      },
      isIncluded: (item, datasetName) => {
        if (datasetName === "orders") return item.total >= 100;
        if (datasetName === "people") return item.active;
        return item.device === "mobile";
      }
    },
    {
      id: "orderBy",
      name: "_.orderBy",
      category: "Collection",
      flow: "sort",
      signature: (datasetName) => `_.orderBy(${datasetName}, ["${datasetName === "events" ? "minute" : datasetName === "people" ? "score" : "total"}"], ["desc"])`,
      code: (datasetName) => {
        const key = datasetName === "events" ? "minute" : datasetName === "people" ? "score" : "total";
        return `const result = _.orderBy(input, ["${key}"], ["desc"]);`;
      },
      run: (input, datasetName) => _.orderBy(input, [datasetName === "events" ? "minute" : datasetName === "people" ? "score" : "total"], ["desc"]),
      isIncluded: () => true
    },
    {
      id: "partition",
      name: "_.partition",
      category: "Collection",
      flow: "split",
      signature: (datasetName) =>
        datasetName === "orders"
          ? '_.partition(orders, { status: "paid" })'
          : datasetName === "people"
            ? "_.partition(people, item => item.score >= 85)"
            : '_.partition(events, { device: "mobile" })',
      code: (datasetName) => {
        if (datasetName === "orders") return 'const result = _.partition(input, { status: "paid" });';
        if (datasetName === "people") return "const result = _.partition(input, item => item.score >= 85);";
        return 'const result = _.partition(input, { device: "mobile" });';
      },
      run: (input, datasetName) => {
        if (datasetName === "orders") return _.partition(input, { status: "paid" });
        if (datasetName === "people") return _.partition(input, (item) => item.score >= 85);
        return _.partition(input, { device: "mobile" });
      },
      isIncluded: (item, datasetName) => {
        if (datasetName === "orders") return item.status === "paid";
        if (datasetName === "people") return item.score >= 85;
        return item.device === "mobile";
      }
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
      signature: (datasetName) => `_.uniqBy(${datasetName}, "${datasetName === "orders" ? "region" : datasetName === "people" ? "team" : "page"}")`,
      code: (datasetName) => {
        const key = datasetName === "orders" ? "region" : datasetName === "people" ? "team" : "page";
        return `const result = _.uniqBy(input, "${key}");`;
      },
      run: (input, datasetName) => _.uniqBy(input, datasetName === "orders" ? "region" : datasetName === "people" ? "team" : "page"),
      isIncluded: (item, datasetName, input) => {
        const key = datasetName === "orders" ? "region" : datasetName === "people" ? "team" : "page";
        return _.findIndex(input, [key, item[key]]) === input.indexOf(item);
      }
    },
    {
      id: "sumBy",
      name: "_.sumBy",
      category: "Math",
      flow: "sum",
      signature: (datasetName) => `_.sumBy(${datasetName}, "${datasetName === "people" ? "score" : datasetName === "events" ? "value" : "total"}")`,
      code: (datasetName) => {
        const key = datasetName === "people" ? "score" : datasetName === "events" ? "value" : "total";
        return `const result = _.sumBy(input, "${key}");`;
      },
      run: (input, datasetName) => _.sumBy(input, datasetName === "people" ? "score" : datasetName === "events" ? "value" : "total"),
      isIncluded: () => true
    },
    {
      id: "keyBy",
      name: "_.keyBy",
      category: "Collection",
      flow: "index",
      signature: (datasetName) => `_.keyBy(${datasetName}, "id")`,
      code: () => 'const result = _.keyBy(input, "id");',
      run: (input) => _.keyBy(input, "id"),
      isIncluded: () => true
    },
    {
      id: "flatMap",
      name: "_.flatMap",
      category: "Collection",
      flow: "expand",
      signature: (datasetName) =>
        datasetName === "orders"
          ? "_.flatMap(orders, order => order.items)"
          : datasetName === "people"
            ? "_.flatMap(people, person => person.skills)"
            : "_.flatMap(events, event => [event.page, event.kind])",
      code: (datasetName) => {
        if (datasetName === "orders") return "const result = _.flatMap(input, item => item.items);";
        if (datasetName === "people") return "const result = _.flatMap(input, item => item.skills);";
        return "const result = _.flatMap(input, item => [item.page, item.kind]);";
      },
      run: (input, datasetName) => {
        if (datasetName === "orders") return _.flatMap(input, (item) => item.items);
        if (datasetName === "people") return _.flatMap(input, (item) => item.skills);
        return _.flatMap(input, (item) => [item.page, item.kind]);
      },
      isIncluded: () => true
    }
  ];
}
