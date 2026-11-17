import { toLocalDateKey } from "../domain/dates.ts";
import { addContribution, archiveGoal, correctContribution, createGoal, listGoalSummaries, updateGoal, type ContributionInput, type GoalInput } from "../domain/finance.ts";
import { createHabit, recordHabitStatus, setHabitLifecycle, updateHabit, type HabitInput } from "../domain/habits.ts";
import { createId, createInitialState } from "../domain/state.ts";
import type { AppPreferences, AppState, HabitLifecycleStatus, HabitStatus } from "../domain/model.ts";
import { OFFICIAL_ACHIEVEMENTS, OFFICIAL_PROGRESSION_RULES } from "../domain/official-rules.ts";
import { unlockEligibleAchievements } from "../domain/progression.ts";
import { LocalStore } from "../persistence/local-store.ts";
import type { StoragePort } from "../persistence/local-store.ts";

export interface AppDataSnapshot {
  state: AppState | null;
  error: string | null;
  revision: number;
  newlyUnlockedAchievementIds: string[];
}

type Listener = () => void;
export type StateChangeResult = { ok: true } | { ok: false; error: string };

export class AppDataController {
  private snapshot: AppDataSnapshot = {
    state: null,
    error: null,
    revision: 0,
    newlyUnlockedAchievementIds: [],
  };
  private listeners = new Set<Listener>();
  private readonly store: LocalStore;

  constructor(storage: StoragePort) {
    this.store = new LocalStore(storage);
  }

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): AppDataSnapshot => this.snapshot;

  load(): void {
    try {
      this.snapshot = {
        state: this.store.load(),
        error: null,
        revision: this.snapshot.revision + 1,
        newlyUnlockedAchievementIds: [],
      };
    } catch (error) {
      this.snapshot = {
        ...this.snapshot,
        error: messageOf(error),
      };
    }
    this.emit();
  }

  createHabit(input: HabitInput, date = toLocalDateKey()): StateChangeResult {
    return this.change((state) => createHabit(state, input, date, createId));
  }

  updateHabit(
    habitId: string,
    input: HabitInput,
    effectiveFrom = toLocalDateKey(),
  ): StateChangeResult {
    return this.change((state) =>
      updateHabit(state, habitId, input, effectiveFrom, createId),
    );
  }

  setHabitPaused(
    habitId: string,
    paused: boolean,
    effectiveFrom = toLocalDateKey(),
  ): StateChangeResult {
    return this.change((state) =>
      setHabitLifecycle(
        state,
        habitId,
        paused ? "paused" : "active",
        effectiveFrom,
        createId,
      ),
    );
  }

  deleteHabit(habitId: string, effectiveFrom = toLocalDateKey()): StateChangeResult {
    return this.change((state) =>
      setHabitLifecycle(state, habitId, "archived", effectiveFrom, createId),
    );
  }

  setHabitStatus(
    habitId: string,
    date: string,
    status: HabitStatus,
    context?: string,
    level?: "main" | "min",
    now = new Date(),
  ): StateChangeResult {
    return this.change((state) =>
      recordHabitStatus(state, habitId, date, status, context, now, createId, level),
    );
  }

  createGoal(input: GoalInput, date = toLocalDateKey()): StateChangeResult {
    return this.change((state) => createGoal(state, input, date, createId));
  }

  updateGoal(goalId: string, input: GoalInput): StateChangeResult {
    return this.change((state) => updateGoal(state, goalId, input));
  }

  archiveGoal(goalId: string, date = toLocalDateKey()): StateChangeResult {
    return this.change((state) => archiveGoal(state, goalId, date));
  }

  addContribution(
    input: ContributionInput,
    now = new Date(),
  ): StateChangeResult {
    return this.change((state) => addContribution(state, input, now, createId));
  }

  correctContribution(
    contributionId: string,
    amountCents: number,
    note: string,
    now = new Date(),
  ): StateChangeResult {
    return this.change((state) =>
      correctContribution(state, contributionId, amountCents, note, now),
    );
  }

  updatePreferences(
    patch: Partial<AppPreferences>,
  ): StateChangeResult {
    return this.change((state) => ({
      ...state,
      preferences: { ...state.preferences, ...patch },
    }));
  }

  exportBackup(): string {
    const state = this.requireState();
    return this.store.exportBackup(state);
  }

  importBackup(json: string): StateChangeResult {
    try {
      const state = this.store.importBackup(json);
      this.snapshot = {
        state,
        error: null,
        revision: this.snapshot.revision + 1,
        newlyUnlockedAchievementIds: [],
      };
      this.emit();
      return { ok: true };
    } catch (error) {
      const message = messageOf(error);
      this.setError(message);
      return { ok: false, error: message };
    }
  }

  clearAllData(): StateChangeResult {
    try {
      const state = createInitialState();
      this.store.save(state);
      this.snapshot = {
        state,
        error: null,
        revision: this.snapshot.revision + 1,
        newlyUnlockedAchievementIds: [],
      };
      this.emit();
      return { ok: true };
    } catch (error) {
      const message = messageOf(error);
      this.setError(message);
      return { ok: false, error: message };
    }
  }

  getActiveGoalSummaries() {
    const state = this.snapshot.state;
    return state ? listGoalSummaries(state) : [];
  }

  private change(updater: (state: AppState) => AppState): StateChangeResult {
    try {
      const current = this.requireState();
      let next = updater(current);
      if (next === current) return { ok: true };
      if (OFFICIAL_PROGRESSION_RULES) {
        next = unlockEligibleAchievements(
          next,
          OFFICIAL_ACHIEVEMENTS,
          OFFICIAL_PROGRESSION_RULES,
          toLocalDateKey(),
        );
      }
      this.store.save(next);
      const previousUnlocked = new Set(
        current.achievementUnlocks.map((item) => item.achievementId),
      );
      const newlyUnlockedAchievementIds = next.achievementUnlocks
        .filter((item) => !previousUnlocked.has(item.achievementId))
        .map((item) => item.achievementId);
      this.snapshot = {
        state: next,
        error: null,
        revision: this.snapshot.revision + 1,
        newlyUnlockedAchievementIds,
      };
      this.emit();
      return { ok: true };
    } catch (error) {
      const message = messageOf(error);
      this.setError(message);
      return { ok: false, error: message };
    }
  }

  private requireState(): AppState {
    if (!this.snapshot.state) {
      throw new Error("Os dados ainda não foram carregados.");
    }
    return this.snapshot.state;
  }

  private setError(error: string): void {
    this.snapshot = { ...this.snapshot, error };
    this.emit();
  }

  dismissAchievementNotifications(): void {
    if (this.snapshot.newlyUnlockedAchievementIds.length === 0) return;
    this.snapshot = { ...this.snapshot, newlyUnlockedAchievementIds: [] };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export function getLifecycleStatus(state: AppState, habitId: string, date: string) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return undefined;
  let latest: HabitLifecycleStatus | undefined;
  for (const event of habit.lifecycle) {
    if (event.effectiveFrom <= date) latest = event.status;
  }
  return latest;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}
