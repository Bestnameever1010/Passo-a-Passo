import { APP_SCHEMA_VERSION, type AppState } from "../domain/model.ts";
import { createInitialState } from "../domain/state.ts";
import { parseAppState } from "./schema.ts";

export const APP_STORAGE_KEY = "passo-a-passo:state";
export const BACKUP_FORMAT = "passo-a-passo-backup";
export const BACKUP_VERSION = 1;

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  backupVersion: typeof BACKUP_VERSION;
  exportedAt: string;
  state: AppState;
}

export class LocalStore {
  private readonly storage: StoragePort;
  private readonly key: string;

  constructor(storage: StoragePort, key = APP_STORAGE_KEY) {
    this.storage = storage;
    this.key = key;
  }

  load(): AppState {
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch (error) {
      throw storageError("Não foi possível acessar os dados deste dispositivo.", error);
    }
    if (raw === null) return createInitialState();
    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch (error) {
      throw storageError("Os dados salvos estão corrompidos e não foram alterados.", error);
    }
    return parseAppState(decoded);
  }

  save(state: AppState): void {
    const validated = parseAppState(state);
    try {
      this.storage.setItem(this.key, JSON.stringify(validated));
    } catch (error) {
      throw storageError("Não foi possível salvar. Os dados anteriores foram mantidos.", error);
    }
  }

  exportBackup(state: AppState, exportedAt = new Date()): string {
    const validated = parseAppState(state);
    const backup: BackupEnvelope = {
      format: BACKUP_FORMAT,
      backupVersion: BACKUP_VERSION,
      exportedAt: exportedAt.toISOString(),
      state: validated,
    };
    return JSON.stringify(backup, null, 2);
  }

  importBackup(json: string): AppState {
    let decoded: unknown;
    try {
      decoded = JSON.parse(json);
    } catch (error) {
      throw storageError("O arquivo não contém um JSON válido.", error);
    }
    const backup = parseBackupEnvelope(decoded);
    const restored = parseAppState(backup.state);
    this.save(restored);
    return restored;
  }

  clear(): void {
    try {
      this.storage.removeItem(this.key);
    } catch (error) {
      throw storageError("Não foi possível remover os dados salvos.", error);
    }
  }
}

function parseBackupEnvelope(input: unknown): BackupEnvelope {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("O backup precisa ser um objeto JSON.");
  }
  const candidate = input as Record<string, unknown>;
  if (candidate.format !== BACKUP_FORMAT) {
    throw new Error("Este arquivo não é um backup do Passo a Passo.");
  }
  if (candidate.backupVersion !== BACKUP_VERSION) {
    throw new Error("A versão deste arquivo de backup não é compatível.");
  }
  if (typeof candidate.exportedAt !== "string" || !Number.isFinite(Date.parse(candidate.exportedAt))) {
    throw new Error("A data de exportação do backup é inválida.");
  }
  if (
    !candidate.state ||
    typeof candidate.state !== "object" ||
    (candidate.state as Record<string, unknown>).schemaVersion !== APP_SCHEMA_VERSION
  ) {
    throw new Error("O backup não contém um estado de aplicativo compatível.");
  }
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    exportedAt: candidate.exportedAt,
    state: candidate.state as AppState,
  };
}

function storageError(message: string, cause: unknown): Error {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new Error(`${message} ${detail}`);
}
