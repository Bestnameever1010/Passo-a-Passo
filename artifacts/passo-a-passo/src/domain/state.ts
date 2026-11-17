import { APP_SCHEMA_VERSION, type AppState } from "./model.ts";

export function createInitialState(): AppState {
  return {
    schemaVersion: APP_SCHEMA_VERSION,
    preferences: {
      theme: "light",
      reducedMotion: false,
      weekStartsOn: 1,
      currency: "BRL",
    },
    habits: [],
    habitDays: [],
    goals: [],
    contributions: [],
    achievementUnlocks: [],
  };
}

export function createId(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Este navegador não oferece geração segura de identificadores.");
  }
  return globalThis.crypto.randomUUID();
}
