import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../lib/store";
import { Toast, useToast } from "./Toast";

export function SettingsPage() {
  const setViewMode = useAppStore((s) => s.setViewMode);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const checkExistingKey = async () => {
      try {
        const exists = await invoke<boolean>("has_api_key");
        setHasExistingKey(exists);
      } catch (err) {
        console.error("Failed to check API key:", err);
      } finally {
        setLoading(false);
      }
    };
    checkExistingKey();
  }, []);

  const handleCancel = () => {
    setViewMode("kanban");
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      showToast("Please enter an API key", "error");
      return;
    }

    setSaving(true);
    try {
      await invoke("save_api_key", { apiKey: apiKey.trim() });
      showToast("API key saved successfully!", "success");
      setHasExistingKey(true);
      setApiKey("");
      setTimeout(() => setViewMode("kanban"), 1000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await invoke("delete_api_key");
      setHasExistingKey(false);
      setApiKey("");
      showToast("API key cleared", "success");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const maskedKey = apiKey ? "sk-ant-" + "*".repeat(Math.max(0, apiKey.length - 10)) + apiKey.slice(-4) : "";

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-sm text-[var(--geist-accents-5)]">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="px-4 py-3 border-b border-[var(--geist-accents-2)] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--geist-foreground)]">
            Settings
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-3 py-1.5 text-sm border border-[var(--geist-accents-3)] rounded-md hover:bg-[var(--geist-accents-1)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !apiKey.trim()}
            className="px-3 py-1.5 text-sm bg-[var(--geist-success)] text-white rounded-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* API Key Section */}
          <div className="bg-[var(--geist-accents-1)] border border-[var(--geist-accents-2)] rounded-lg p-4">
            <h2 className="text-base font-medium text-[var(--geist-foreground)] mb-4">
              Anthropic API Key
            </h2>
            <p className="text-sm text-[var(--geist-accents-5)] mb-4">
              Required for Smart Mode AI-powered epic generation. Your key is stored securely in your system's keychain.
            </p>

            {hasExistingKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg">
                  <span className="text-sm text-[var(--geist-success)] font-medium">API key configured</span>
                  <span className="flex-1" />
                  <button
                    onClick={handleClear}
                    disabled={saving}
                    className="px-2 py-1 text-xs text-[var(--geist-error)] hover:bg-[var(--geist-error-light)] rounded transition-colors disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-xs text-[var(--geist-accents-4)]">
                  Enter a new key below to replace the existing one.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-[var(--geist-warning-light)] border border-[var(--geist-warning)] rounded-lg mb-4">
                <p className="text-sm text-[var(--geist-warning-dark)]">
                  No API key configured. Smart Mode will not work without a valid key.
                </p>
              </div>
            )}

            <div className="space-y-2 mt-4">
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-[var(--geist-foreground)]"
              >
                {hasExistingKey ? "New API Key" : "API Key"}
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={saving}
                  placeholder="sk-ant-api03-..."
                  className="w-full p-3 pr-20 text-sm bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50 font-mono"
                  aria-label="Anthropic API key input"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-[var(--geist-accents-5)] hover:text-[var(--geist-foreground)] transition-colors"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              {apiKey && !showKey && (
                <p className="text-xs text-[var(--geist-accents-4)] font-mono">
                  {maskedKey}
                </p>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-[var(--geist-accents-1)] border border-[var(--geist-accents-2)] rounded-lg p-4">
            <h3 className="text-sm font-medium text-[var(--geist-foreground)] mb-3">
              How to get an API key
            </h3>
            <ol className="space-y-2 text-sm text-[var(--geist-accents-6)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--geist-accents-4)]">1.</span>
                <span>Go to <span className="text-[var(--geist-foreground)]">console.anthropic.com</span></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--geist-accents-4)]">2.</span>
                <span>Sign in or create an account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--geist-accents-4)]">3.</span>
                <span>Navigate to <span className="text-[var(--geist-foreground)]">API Keys</span> section</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--geist-accents-4)]">4.</span>
                <span>Create a new key and paste it here</span>
              </li>
            </ol>
          </div>

          {/* Security Note */}
          <p className="text-xs text-[var(--geist-accents-4)] text-center">
            Your API key is stored locally in your system's secure keychain and is never sent anywhere except Anthropic's servers.
          </p>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}
