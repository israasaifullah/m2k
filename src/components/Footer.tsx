import { Sparkles } from "lucide-react";
import packageJson from "../../package.json";

export function Footer() {
  const version = packageJson.version;

  return (
    <footer className="border-t border-[var(--geist-accents-2)] bg-[var(--geist-background)] px-4 py-[5.5px] flex items-center justify-between text-xs text-[var(--geist-accents-5)]">
      <div className="flex items-center gap-2">
        <Sparkles size={12} className="text-[var(--ds-pink-500)]" />
        <span>Built with Claude Code</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-[var(--geist-accents-1)] text-[var(--geist-accents-6)] font-mono">
          v{version}
        </span>
      </div>
    </footer>
  );
}
