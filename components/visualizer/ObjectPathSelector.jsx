export default function ObjectPathSelector({ fnId, availablePaths, selectedPaths, onToggle, onReset }) {
  const isPick = fnId === "pick";
  const action = isPick ? "keep" : "remove";

  return (
    <section className="object-path-selector" aria-labelledby="object-path-selector-title">
      <div className="object-path-selector-head">
        <div>
          <span>Field paths</span>
          <strong id="object-path-selector-title">{selectedPaths.length} selected</strong>
        </div>
        <button className="text-button is-compact" type="button" onClick={onReset}>
          Reset paths
        </button>
      </div>

      <p>Select the object paths that <code>_.{fnId}</code> should {action}.</p>

      {availablePaths.length ? (
        <div className="object-path-options" role="group" aria-label={`${fnId} paths`}>
          {availablePaths.map((path) => {
            const checked = selectedPaths.includes(path);
            const inputId = `${fnId}-path-${path.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
            return (
              <label className={`object-path-option ${checked ? "is-selected" : ""}`} htmlFor={inputId} key={path}>
                <input id={inputId} type="checkbox" checked={checked} onChange={() => onToggle(path)} />
                <code>{path}</code>
                <span>{checked ? action : "ignore"}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="object-path-empty">Add object fields to the input data to select paths.</div>
      )}
    </section>
  );
}
