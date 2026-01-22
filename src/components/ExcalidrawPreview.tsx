import { useState, useCallback, useRef, useEffect } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { Save } from 'lucide-react';
import type { ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';

interface ExcalidrawData {
  type: string;
  version: number;
  source: string;
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
}

interface ExcalidrawPreviewProps {
  initialContent: string;
  fileName: string;
  onSave: (content: string) => Promise<void>;
}

function parseExcalidrawContent(content: string): ExcalidrawData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.type === 'excalidraw') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function createEmptyExcalidrawData(): ExcalidrawData {
  return {
    type: 'excalidraw',
    version: 2,
    source: 'https://excalidraw.com',
    elements: [],
    appState: {},
    files: {}
  };
}

export function ExcalidrawPreview({ initialContent, fileName, onSave }: ExcalidrawPreviewProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialDataRef = useRef<ExcalidrawInitialDataState | null>(null);

  const parsedData = parseExcalidrawContent(initialContent) || createEmptyExcalidrawData();

  if (!initialDataRef.current) {
    initialDataRef.current = {
      elements: parsedData.elements as ExcalidrawInitialDataState['elements'],
      appState: parsedData.appState as ExcalidrawInitialDataState['appState'],
      files: parsedData.files as ExcalidrawInitialDataState['files']
    };
  }

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return;

    setSaving(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      const data: ExcalidrawData = {
        type: 'excalidraw',
        version: 2,
        source: 'https://excalidraw.com',
        elements: elements as unknown[],
        appState: {
          gridSize: appState.gridSize,
          viewBackgroundColor: appState.viewBackgroundColor
        },
        files: files as Record<string, unknown>
      };

      await onSave(JSON.stringify(data, null, 2));
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  }, [excalidrawAPI, onSave]);

  const handleChange = useCallback(() => {
    setHasChanges(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-2 pt-1 pb-[2.5px] border-b border-[var(--geist-accents-2)] bg-[var(--geist-accents-1)]">
        <span className="text-xs text-[var(--geist-accents-4)] truncate">{fileName}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--monokai-purple)]">Drawing</span>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="p-1.5 text-[var(--geist-accents-4)] hover:text-[var(--monokai-green)] transition-colors disabled:opacity-50"
            title={saving ? 'Saving...' : 'Save (Cmd+S)'}
          >
            <Save size={15} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={initialDataRef.current}
          onChange={handleChange}
          theme="dark"
        />
      </div>
    </div>
  );
}
