import assert from "node:assert/strict";
import test from "node:test";
import { addLocalDays, daysBetween, isLocalDate, toLocalDateKey } from "./dates.ts";
import { createGoal, addContribution, correctContribution, summarizeGoal } from "./finance.ts";
import { createHabit, recordHabitStatus, updateHabit } from "./habits.ts";
import { buildXpLedger, getLevelProgress, unlockEligibleAchievements } from "./progression.ts";
import { createInitialState } from "./state.ts";
import { LocalStore, type StoragePort } from "../persistence/local-store.ts";
import type { AppState, ProgressionRules } from "./model.ts";

test("calendar arithmetic uses calendar dates rather than local timestamp offsets", () => {
  assert.equal(isLocalDate("2026-02-29"), false);
  assert.equal(isLocalDate("2028-02-29"), true);
  assert.equal(addLocalDays("2026-03-07", 1), "2026-03-08");
  assert.equal(daysBetween("2026-03-07", "2026-03-09"), 2);
  assert.equal(toLocalDateKey(new Date(2026, 10, 16, 0, 5)), "2026-11-16");
});

test("habit edits keep old versions and daily entries intact", () => {
  let state = createInitialState();
  let sequence = 0;
  const idFactory = () => `habit-test-${++sequence}`;
  state = createHabit(
    state,
    { name: "Leitura", description: "Antes de dormir", weekdays: [1, 3, 5] },
    "2026-11-16",
    idFactory,
  );
  const habit = state.habits[0];
  const originalRevisionId = habit.revisions[0].id;
  state = recordHabitStatus(
    state,
    habit.id,
    "2026-11-16",
    "completed",
    undefined,
    new Date("2026-11-16T12:00:00.000Z"),
    idFactory,
  );
  state = updateHabit(
    state,
    habit.id,
    { name: "Leitura", description: "Pela manhã", weekdays: [2, 4, 6] },
    "2026-11-17",
    idFactory,
  );
  assert.equal(state.habits[0].revisions.length, 2);
  assert.equal(state.habitDays[0].habitRevisionId, originalRevisionId);
  assert.equal(state.habits[0].revisions[0].description, "Antes de dormir");
});

test("justifications require context and enforce two uses in a rolling seven-day window", () => {
  let state = createInitialState();
  let sequence = 0;
  const idFactory = () => `justification-test-${++sequence}`;
  const today = "2026-11-16";
  for (const name of ["Leitura", "Alongamento", "Água"]) {
    state = createHabit(state, { name, weekdays: [1] }, today, idFactory);
  }
  const now = new Date("2026-11-16T12:00:00.000Z");
  assert.throws(
    () => recordHabitStatus(state, state.habits[0].id, today, "justified", " ", now, idFactory),
    /contexto/,
  );
  state = recordHabitStatus(state, state.habits[0].id, today, "justified", "Consulta médica", now, idFactory);
  state = recordHabitStatus(state, state.habits[1].id, today, "justified", "Imprevisto familiar", now, idFactory);
  assert.throws(
    () => recordHabitStatus(state, state.habits[2].id, today, "justified", "Outro motivo", now, idFactory),
    /limite de duas justificativas/,
  );
  state = recordHabitStatus(state, state.habits[0].id, today, "completed", undefined, now, idFactory);
  assert.equal(state.habitDays[0].events[0].context, "Consulta médica");
  assert.equal(state.habitDays[0].events.at(-1)?.status, "completed");
});

test("XP ledger is derived from current valid completion state with stable unique IDs", () => {
  let state = createInitialState();
  let sequence = 0;
  const idFactory = () => `xp-test-${++sequence}`;
  const today = "2026-11-16";
  state = createHabit(state, { name: "Caminhada", weekdays: [1] }, today, idFactory);
  const habitId = state.habits[0].id;
  const now = new Date("2026-11-16T12:00:00.000Z");
  const rules: ProgressionRules = {
    habitCompletionXp: 5,
    fullDayBonusXp: 2,
    levels: [
      { level: 1, minimumXp: 0 },
      { level: 2, minimumXp: 10 },
    ],
    achievements: [],
  };
  state = recordHabitStatus(state, habitId, today, "completed", undefined, now, idFactory);
  state = recordHabitStatus(state, habitId, today, "completed", undefined, now, idFactory);
  assert.deepEqual(buildXpLedger(state, rules).map((item) => item.id), [
    `full-day-bonus:${today}`,
    `habit-completion:${habitId}:${today}`,
  ]);
  state = recordHabitStatus(state, habitId, today, "pending", undefined, now, idFactory);
  assert.equal(buildXpLedger(state, rules).length, 0);
  state = recordHabitStatus(state, habitId, today, "completed", undefined, now, idFactory);
  assert.equal(buildXpLedger(state, rules).length, 2);
  assert.deepEqual(getLevelProgress(7, rules.levels), {
    level: 1,
    title: undefined,
    totalXp: 7,
    xpIntoLevel: 7,
    xpToNextLevel: 3,
    nextLevel: 2,
  });
});

test("achievement unlocks remain permanent and rewards are awarded only once", () => {
  let state = createInitialState();
  let sequence = 0;
  const idFactory = () => `achievement-test-${++sequence}`;
  const today = "2026-11-16";
  const now = new Date("2026-11-16T12:00:00.000Z");
  state = createHabit(state, { name: "Leitura", weekdays: [1] }, today, idFactory);
  state = recordHabitStatus(state, state.habits[0].id, today, "completed", undefined, now, idFactory);

  const rules: ProgressionRules = {
    habitCompletionXp: 5,
    fullDayBonusXp: 2,
    levels: [{ level: 1, minimumXp: 0 }],
    achievements: [
      {
        id: "first-completion",
        name: "Primeiro passo",
        description: "Complete um hábito.",
        condition: { kind: "completed-habits", count: 1 },
        rewardXp: 3,
      },
      {
        id: "xp-milestone",
        name: "Ritmo constante",
        description: "Some pontos de experiência.",
        condition: { kind: "total-xp", amountXp: 10 },
        rewardXp: 1,
      },
    ],
  };
  const catalog = rules.achievements;
  state = unlockEligibleAchievements(state, catalog, rules, today, now);
  assert.deepEqual(
    state.achievementUnlocks.map((item) => item.achievementId),
    ["first-completion", "xp-milestone"],
  );
  assert.equal(buildXpLedger(state, rules).filter((item) => item.kind === "achievement").length, 2);

  state = recordHabitStatus(state, state.habits[0].id, today, "pending", undefined, now, idFactory);
  state = unlockEligibleAchievements(state, catalog, rules, today, now);
  assert.deepEqual(
    state.achievementUnlocks.map((item) => item.achievementId),
    ["first-completion", "xp-milestone"],
  );
  assert.equal(buildXpLedger(state, rules).filter((item) => item.kind === "achievement").length, 2);
});

test("financial goals store cents, preserve corrections, and derive completion", () => {
  let state = createInitialState();
  let sequence = 0;
  const idFactory = () => `money-test-${++sequence}`;
  state = createGoal(
    state,
    { name: "Reserva", targetCents: 10000 },
    "2026-11-16",
    idFactory,
  );
  const goalId = state.goals[0].id;
  state = addContribution(
    state,
    { goalId, amountCents: 12000, date: "2026-11-16" },
    new Date("2026-11-16T12:00:00.000Z"),
    idFactory,
  );
  const contributionId = state.contributions[0].id;
  assert.equal(summarizeGoal(state, goalId).isComplete, true);
  state = correctContribution(
    state,
    contributionId,
    8000,
    "Corrigido após conferir o extrato",
    new Date("2026-11-17T12:00:00.000Z"),
  );
  const summary = summarizeGoal(state, goalId);
  assert.equal(summary.contributedCents, 8000);
  assert.equal(summary.remainingCents, 2000);
  assert.equal(summary.isComplete, false);
  assert.equal(state.contributions[0].revisions[0].previousAmountCents, 12000);
  assert.throws(() => addContribution(
    state,
    { goalId, amountCents: 1.5, date: "2026-11-17" },
    new Date("2026-11-17T12:00:00.000Z"),
    idFactory,
  ), /centavos/);
});

test("invalid backup imports never replace existing local data", () => {
  const storage = new MemoryStorage();
  const store = new LocalStore(storage);
  const original = createInitialState();
  store.save(original);
  const badBackup = JSON.stringify({
    format: "passo-a-passo-backup",
    backupVersion: 1,
    exportedAt: "2026-11-16T12:00:00.000Z",
    state: { schemaVersion: 1, habits: "invalid" },
  });
  assert.throws(() => store.importBackup(badBackup), /validação/);
  assert.deepEqual(store.load(), original);

  const exported = store.exportBackup(original, new Date("2026-11-16T12:00:00.000Z"));
  assert.deepEqual(store.importBackup(exported), original);
});

test("failed local writes leave the previous stored state untouched", () => {
  const storage = new MemoryStorage();
  const store = new LocalStore(storage);
  const original = createInitialState();
  store.save(original);
  storage.failWrites = true;
  const changed: AppState = {
    ...original,
    preferences: { ...original.preferences, theme: "dark" },
  };
  assert.throws(() => store.save(changed), /dados anteriores foram mantidos/);
  storage.failWrites = false;
  assert.deepEqual(store.load(), original);
});

class MemoryStorage implements StoragePort {
  private values = new Map<string, string>();
  failWrites = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("quota exceeded");
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}
