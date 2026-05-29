"use client";

import Editor from "@monaco-editor/react";

export default function CallbackExpressionEditor({ value, onChange }) {
  return (
    <div className="callback-code-editor">
      <Editor
        defaultLanguage="javascript"
        height="100%"
        theme="vs-dark"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 22,
          padding: { top: 12, bottom: 12 },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          folding: false,
          lineNumbers: "off",
          glyphMargin: false,
          lineDecorationsWidth: 8,
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: true
        }}
      />
    </div>
  );
}