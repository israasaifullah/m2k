import { invoke } from "@tauri-apps/api/core";

export interface AppConfig {
  project_path: string | null;
  theme: string;
  sidebar_collapsed: boolean;
  default_editor_mode: string;
}

export async function loadConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("load_config");
}

export async function saveConfig(config: AppConfig): Promise<void> {
  return invoke("save_config", { config });
}
