import Editor, { loader } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

// Define custom Geist dark theme
const defineGeistTheme = (monaco: typeof import("monaco-editor")) => {
  monaco.editor.defineTheme("geist-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "666666", fontStyle: "italic" },
      { token: "keyword", foreground: "0070f3" },
      { token: "string", foreground: "50e3c2" },
      { token: "number", foreground: "f5a623" },
      { token: "type", foreground: "7928ca" },
    ],
    colors: {
      "editor.background": "#000000",
      "editor.foreground": "#ffffff",
      "editor.lineHighlightBackground": "#111111",
      "editor.selectionBackground": "#0070f333",
      "editorCursor.foreground": "#0070f3",
      "editorLineNumber.foreground": "#666666",
      "editorLineNumber.activeForeground": "#888888",
      "editor.inactiveSelectionBackground": "#111111",
      "editorIndentGuide.background1": "#333333",
      "editorIndentGuide.activeBackground1": "#444444",
      "scrollbarSlider.background": "#33333380",
      "scrollbarSlider.hoverBackground": "#44444480",
      "scrollbarSlider.activeBackground": "#55555580",
    },
  });
};

// Configure Monaco loader
loader.init().then((monaco) => {
  defineGeistTheme(monaco);
});

export function MarkdownEditor({ value, onChange, readOnly = false }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.focus();
  };

  const handleChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

  return (
    <div
      className="h-full w-full rounded-lg overflow-hidden border border-[var(--geist-accents-2)] animate-fade-in"
      role="region"
      aria-label="Markdown editor"
    >
      <Editor
        height="100%"
        defaultLanguage="markdown"
        theme="geist-dark"
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: '"Geist Mono", monospace',
          lineHeight: 1.6,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          padding: { top: 16, bottom: 16 },
          lineNumbers: "on",
          renderLineHighlight: "line",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          tabSize: 2,
          automaticLayout: true,
          folding: true,
          foldingStrategy: "indentation",
          showFoldingControls: "mouseover",
          bracketPairColorization: { enabled: false },
          guides: { indentation: true },
          accessibilitySupport: "auto",
          ariaLabel: "Markdown editor content",
        }}
      />
    </div>
  );
}
