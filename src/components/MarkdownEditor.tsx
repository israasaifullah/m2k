import Editor, { loader } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { initVimMode, VimMode } from "monaco-vim";
import { useAppStore } from "../lib/store";

interface Props {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export interface MarkdownEditorHandle {
  insertText: (text: string) => void;
  triggerSave: () => void;
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

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(
  function MarkdownEditor({ value, onChange, readOnly = false }, ref) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const vimModeRef = useRef<VimMode | null>(null);
    const statusBarRef = useRef<HTMLDivElement | null>(null);
    const vimEnabled = useAppStore((s) => s.vimMode);
    const triggerSave = useAppStore((s) => s.triggerSave);
    const [editorReady, setEditorReady] = useState(false);

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = editor.getSelection();
        if (!selection) return;

        const id = { major: 1, minor: 1 };
        const op = {
          identifier: id,
          range: selection,
          text,
          forceMoveMarkers: true,
        };
        editor.executeEdits("resource-picker", [op]);
        editor.focus();
      },
      triggerSave: () => {
        const editor = editorRef.current;
        if (!editor) return;

        // Trigger Monaco's save action
        editor.trigger('keyboard', 'editor.action.formatDocument', {});
        editor.trigger('save', 'editor.action.save', {});
      },
    }));

    const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      // Register save command for vim :w
      editor.addAction({
        id: 'vim-save',
        label: 'Save',
        keybindings: [],
        run: () => {
          // Trigger onChange to ensure content is synced
          const value = editor.getValue();
          onChange(value);
          // Call the registered save callback
          triggerSave();
        }
      });

      editor.focus();
      // Delay to ensure status bar is rendered
      setTimeout(() => setEditorReady(true), 0);
    };

  useEffect(() => {
    if (!editorReady || !editorRef.current || !statusBarRef.current) return;

    if (vimEnabled && !readOnly) {
      const vimMode = initVimMode(editorRef.current, statusBarRef.current);
      vimModeRef.current = vimMode;

      // Access Vim API and define :w command
      const Vim = (vimMode as any).Vim;
      if (Vim) {
        Vim.defineEx('write', 'w', () => {
          // Trigger save action
          editorRef.current?.trigger('vim', 'vim-save', {});
        });
      }
    } else if (vimModeRef.current) {
      vimModeRef.current.dispose();
      vimModeRef.current = null;
    }

    return () => {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
        vimModeRef.current = null;
      }
    };
  }, [editorReady, vimEnabled, readOnly]);

    const handleChange = (newValue: string | undefined) => {
      if (newValue !== undefined) {
        onChange(newValue);
      }
    };

    return (
      <div
        className="h-full w-full flex flex-col rounded-lg overflow-hidden border border-[var(--geist-accents-2)] animate-fade-in"
        role="region"
        aria-label="Markdown editor"
      >
        <div className="flex-1 min-h-0">
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
        {!readOnly && (
          <div
            ref={statusBarRef}
            className={`h-6 px-3 flex items-center bg-[var(--geist-accents-1)] border-t border-[var(--geist-accents-2)] text-xs font-mono text-[var(--geist-accents-5)] ${vimEnabled ? '' : 'hidden'}`}
            aria-label="Vim status bar"
          />
        )}
      </div>
    );
  }
);
