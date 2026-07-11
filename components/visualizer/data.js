export const datasets = {
  orders: [
    { id: "A-101", customer: "Mina", status: "paid", total: 128, items: ["desk", "lamp"], region: "Seoul", priority: 2, nested: [["desk"], ["lamp", ["bulb"]]] },
    { id: "A-102", customer: "Joon", status: "pending", total: 76, items: ["chair"], region: "Busan", priority: 3, nested: [["chair"], ["hardware", ["wheel"]]] },
    { id: "A-103", customer: "Ara", status: "paid", total: 214, items: ["monitor", "arm"], region: "Seoul", priority: 1, nested: [["monitor"], ["arm", ["clamp"]]] },
    { id: "A-104", customer: "Noah", status: "refunded", total: 48, items: ["cable"], region: "Jeju", priority: 4, nested: [["cable"], ["adapter", ["usb-c"]]] },
    { id: "A-105", customer: "Sora", status: "pending", total: 165, items: ["shelf", "box"], region: "Daegu", priority: 2, nested: [["shelf"], ["box", ["label"]]] },
    { id: "A-106", customer: "Liam", status: "paid", total: 92, items: ["lamp"], region: "Seoul", priority: 5, nested: [["lamp"], ["shade", ["clip"]]] }
  ],
  people: [
    { id: "P-01", name: "Ivy", team: "Design", skills: ["figma", "motion"], score: 91, active: true, nested: [["figma"], ["motion", ["prototype"]]] },
    { id: "P-02", name: "Theo", team: "Data", skills: ["sql", "python"], score: 84, active: true, nested: [["sql"], ["python", ["pandas"]]] },
    { id: "P-03", name: "Nari", team: "Design", skills: ["research"], score: 77, active: false, nested: [["research"], ["interview", ["synthesis"]]] },
    { id: "P-04", name: "Ken", team: "Frontend", skills: ["react", "css"], score: 96, active: true, nested: [["react"], ["css", ["animation"]]] },
    { id: "P-05", name: "Yuna", team: "Data", skills: ["python", "viz"], score: 88, active: false, nested: [["python"], ["viz", ["d3"]]] },
    { id: "P-06", name: "Sol", team: "Frontend", skills: ["react", "testing"], score: 82, active: true, nested: [["react"], ["testing", ["playwright"]]] }
  ],
  events: [
    { id: "E-01", kind: "click", page: "Home", value: 1, device: "mobile", minute: 1, nested: [["Home"], ["click", ["mobile"]]] },
    { id: "E-02", kind: "view", page: "Pricing", value: 3, device: "desktop", minute: 3, nested: [["Pricing"], ["view", ["desktop"]]] },
    { id: "E-03", kind: "click", page: "Docs", value: 2, device: "desktop", minute: 4, nested: [["Docs"], ["click", ["desktop"]]] },
    { id: "E-04", kind: "submit", page: "Pricing", value: 7, device: "mobile", minute: 7, nested: [["Pricing"], ["submit", ["mobile"]]] },
    { id: "E-05", kind: "view", page: "Home", value: 2, device: "tablet", minute: 9, nested: [["Home"], ["view", ["tablet"]]] },
    { id: "E-06", kind: "click", page: "Docs", value: 4, device: "mobile", minute: 11, nested: [["Docs"], ["click", ["mobile"]]] }
  ]
};

export const tones = ["tone-teal", "tone-coral", "tone-gold", "tone-violet", "tone-green"];

export const groupKeyDefaults = { orders: "status", people: "team", events: "kind" };

export const preferredGroupKeys = {
  orders: ["status", "region", "priority", "customer"],
  people: ["team", "active", "score", "skills"],
  events: ["kind", "page", "device", "minute"]
};

export const defaultDatasetName = "orders";
