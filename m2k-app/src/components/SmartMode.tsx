import { useAppStore } from "../lib/store";
import { Toast, useToast } from "./Toast";

function BestPracticeTips() {
  return (
    <div className="bg-[var(--geist-accents-1)] border border-[var(--geist-accents-2)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--geist-foreground)] mb-3 flex items-center gap-2">
        <span className="text-[var(--geist-warning)]">*</span>
        Best Practices
      </h3>
      <ul className="space-y-2 text-sm text-[var(--geist-accents-6)]">
        <li className="flex items-start gap-2">
          <span className="text-[var(--geist-success)] mt-0.5">-</span>
          <span>Keep epics focused: <strong className="text-[var(--geist-foreground)]">3-8 tickets</strong> per epic</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[var(--geist-success)] mt-0.5">-</span>
          <span>Break large features into <strong className="text-[var(--geist-foreground)]">multiple phases</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[var(--geist-success)] mt-0.5">-</span>
          <span>Large epics can cause <strong className="text-[var(--geist-foreground)]">context window issues</strong> in AI assistants</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[var(--geist-success)] mt-0.5">-</span>
          <span>Each ticket should be <strong className="text-[var(--geist-foreground)]">completable in one session</strong></span>
        </li>
      </ul>
    </div>
  );
}

function ScopeWarning({ requirements }: { requirements: string }) {
  const wordCount = requirements.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = requirements.trim().split(/\n/).filter(Boolean).length;

  // Heuristics for scope detection
  const scopeIndicators = [
    /\band\b/gi,
    /\bwith\b/gi,
    /\balso\b/gi,
    /\bplus\b/gi,
    /,/g,
    /\n-/g,
    /\d\./g,
  ];

  let indicatorCount = 0;
  scopeIndicators.forEach(pattern => {
    const matches = requirements.match(pattern);
    if (matches) indicatorCount += matches.length;
  });

  const isLargeScope = wordCount > 150 || lineCount > 10 || indicatorCount > 8;

  if (!isLargeScope) return null;

  return (
    <div className="bg-[var(--geist-warning-light)] border border-[var(--geist-warning)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--geist-warning-dark)] mb-2 flex items-center gap-2">
        <span>!</span>
        Scope Warning
      </h3>
      <p className="text-sm text-[var(--geist-warning-dark)]">
        This appears to be a large feature. Consider breaking it into smaller epics:
      </p>
      <ul className="mt-2 space-y-1 text-sm text-[var(--geist-warning-dark)]">
        <li>- Split by user workflow or feature area</li>
        <li>- Create Phase 1, Phase 2 epics</li>
        <li>- Focus on MVP first, enhancements later</li>
      </ul>
    </div>
  );
}

export function SmartMode() {
  const smartModeState = useAppStore((s) => s.smartModeState);
  const setSmartModeState = useAppStore((s) => s.setSmartModeState);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const { toast, showToast, hideToast } = useToast();

  const handleCancel = () => {
    setViewMode("kanban");
  };

  const handleGenerate = async () => {
    if (!smartModeState.requirements.trim()) {
      showToast("Please enter requirements", "error");
      return;
    }

    setSmartModeState({ phase: "generating", error: null });

    // TODO: Implement Claude API integration (T-037)
    showToast("AI generation not yet implemented", "error");
    setSmartModeState({ phase: "input" });
  };

  const handleRequirementsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSmartModeState({ requirements: e.target.value });
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="px-4 py-3 border-b border-[var(--geist-accents-2)] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--geist-foreground)]">
            Smart Mode
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--geist-success)] text-white">
            AI-Powered
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            disabled={smartModeState.phase === "generating"}
            className="px-3 py-1.5 text-sm border border-[var(--geist-accents-3)] rounded-md hover:bg-[var(--geist-accents-1)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={smartModeState.phase === "generating" || !smartModeState.requirements.trim()}
            className="px-3 py-1.5 text-sm bg-[var(--geist-success)] text-white rounded-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50"
          >
            {smartModeState.phase === "generating" ? "Generating..." : "Generate Epic"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          <BestPracticeTips />

          <div className="space-y-2">
            <label
              htmlFor="requirements"
              className="block text-sm font-medium text-[var(--geist-foreground)]"
            >
              Describe your feature or requirements
            </label>
            <textarea
              id="requirements"
              value={smartModeState.requirements}
              onChange={handleRequirementsChange}
              disabled={smartModeState.phase === "generating"}
              placeholder="Describe the feature you want to build. Include user stories, key functionality, technical requirements, etc.

Example:
- User authentication with email/password
- Social login (Google, GitHub)
- Password reset flow
- Session management"
              className="w-full h-64 p-4 text-sm bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50 font-mono"
              aria-label="Feature requirements input"
            />
          </div>

          <ScopeWarning requirements={smartModeState.requirements} />

          {smartModeState.error && (
            <div className="p-3 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded-lg text-sm text-[var(--geist-error)]">
              {smartModeState.error}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}
