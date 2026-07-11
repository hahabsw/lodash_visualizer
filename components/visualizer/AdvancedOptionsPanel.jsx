export default function AdvancedOptionsPanel({ fnId, options, availablePaths, arrayPaths, onChange }) {
  if (fnId === "get" || fnId === "set") {
    return (
      <section className="advanced-options-panel" aria-labelledby="advanced-path-title">
        <div className="advanced-options-head">
          <span>Object path</span>
          <strong id="advanced-path-title">{options.path || "No path"}</strong>
        </div>
        <label>
          <span>Path to {fnId}</span>
          <select value={options.path} onChange={(event) => onChange("path", event.target.value)}>
            {availablePaths.map((path) => <option value={path} key={path}>{path}</option>)}
          </select>
        </label>
        {fnId === "set" ? (
          <label>
            <span>New value (JSON)</span>
            <input type="text" value={options.valueText} onChange={(event) => onChange("valueText", event.target.value)} />
          </label>
        ) : null}
      </section>
    );
  }

  if (fnId === "flattenDeep" || fnId === "flattenDepth") {
    return (
      <section className="advanced-options-panel" aria-labelledby="advanced-array-title">
        <div className="advanced-options-head">
          <span>Nested array</span>
          <strong id="advanced-array-title">{options.path || "No array path"}</strong>
        </div>
        <label>
          <span>Array path</span>
          <select value={options.path} onChange={(event) => onChange("path", event.target.value)}>
            {arrayPaths.map((path) => <option value={path} key={path}>{path}</option>)}
          </select>
        </label>
        {fnId === "flattenDepth" ? (
          <label>
            <span>Depth: {options.depth}</span>
            <input type="range" min="1" max="4" value={options.depth} onChange={(event) => onChange("depth", Number(event.target.value))} />
          </label>
        ) : null}
      </section>
    );
  }

  if (fnId === "merge" || fnId === "defaultsDeep") {
    return (
      <section className="advanced-options-panel" aria-labelledby="advanced-overlay-title">
        <div className="advanced-options-head">
          <span>Second object</span>
          <strong id="advanced-overlay-title">Overlay preset</strong>
        </div>
        <pre className="advanced-options-json">{JSON.stringify(options.overlay, null, 2)}</pre>
        <p>{fnId === "merge" ? "Overlay values win on conflicts." : "Defaults fill only missing paths."}</p>
      </section>
    );
  }

  if (fnId === "debounce" || fnId === "throttle") {
    return (
      <section className="advanced-options-panel" aria-labelledby="advanced-wait-title">
        <div className="advanced-options-head">
          <span>Time window</span>
          <strong id="advanced-wait-title">{options.wait} time units</strong>
        </div>
        <label>
          <span>Wait: {options.wait}</span>
          <input type="range" min="1" max="6" value={options.wait} onChange={(event) => onChange("wait", Number(event.target.value))} />
        </label>
        <p>{fnId === "debounce" ? "Trailing invocation after activity becomes quiet." : "Leading invocation with trailing disabled."}</p>
      </section>
    );
  }

  return null;
}
