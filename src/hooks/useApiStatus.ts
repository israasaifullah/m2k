import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface ApiStatus {
  configured: boolean;
  connected: boolean;
  error: string | null;
}

export type ApiStatusState = "loading" | "connected" | "disconnected" | "unconfigured";

export function useApiStatus(pollInterval = 5 * 60 * 1000) {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const result = await invoke<ApiStatus>("check_api_status");
      setStatus(result);
    } catch (e) {
      setStatus({
        configured: false,
        connected: false,
        error: String(e),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, pollInterval);
    return () => clearInterval(interval);
  }, [checkStatus, pollInterval]);

  const state: ApiStatusState = loading
    ? "loading"
    : !status?.configured
      ? "unconfigured"
      : status.connected
        ? "connected"
        : "disconnected";

  return {
    status,
    state,
    loading,
    refresh: checkStatus,
  };
}
