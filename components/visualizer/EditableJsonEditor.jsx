"use client";

import Editor from "@monaco-editor/react";

export default function EditableJsonEditor({ content, onChange }) {
  const value = content.text ?? JSON.stringify(content.json, null, 2);

  function handleChange(nextValue) {
    const text = nextValue ?? "";

    try {
      const parsed = JSON.parse(text);
      onChange({ json: parsed, text }, content, { contentErrors: undefined, patchResult: undefined });
    } catch (error) {
      onChange({ text }, content, {
        contentErrors: [{ message: error instanceof Error ? error.message : "Invalid JSON" }],
        patchResult: undefined
      });
    }
  }

  return (
    <div className="json-editor-host">
      <Editor
        defaultLanguage="json"
        height="100%"
        theme="vs-dark"
        value={value}
        onChange={handleChange}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 22,
          padding: { top: 14, bottom: 14 },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          folding: true,
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: true
        }}
      />
    </div>
  );
}