import { addLocalDays, compareLocalDates, toLocalDateKey } from "./dates.ts";
import {
  getDailySummary,
  isHabitEntryScheduled,
} from "./habits.ts";
import type {
  AchievementCondition,
  AchievementDefinition,
  AchievementUnlock,
  AppState,
  LevelProgress,
  LocalDate,
  ProgressionRules,
  XpLedgerEntry,
} from "./model.ts";
import { listGoalSummaries } from "./finance.ts";

export interface StreakSummary {
  current: number;
  best: number;
  completedDays: number;
  completedHabits: number;
}

export function getStreakSummary(
  state: AppState,
  today: LocalDate,
): StreakSummary {
  const firstDate = state.habits.reduce<LocalDate | undefined>(
    (earliest, habit) =>
      !earliest || compareLocalDates(habit.createdOn, earliest) < 0
        ? habit.createdOn
        : earliest,
    undefined,
  );
  if (!firstDate || compareLocalDates(firstDate, today) > 0) {
    return { current: 0, best: 0, completedDays: 0, completedHabits: 0 };
  }

  let current = 0;
  let best = 0;
  let completedDays = 0;
  let completedHabits = 0;
  let cursor = firstDate;
  while (compareLocalDates(cursor, today) <= 0) {
    const summary = getDailySummary(state, cursor);
    completedHabits += summary.completed;
    if (summary.isComplete) {
      current += 1;
      best = Math.max(best, current);
      completedDays += 1;
    } else if (summary.scheduled.length > 0) {
      current = 0;
    }
    cursor = addLocalDays(cursor, 1);
  }
  return { current, best, completedDays, completedHabits };
}

export function buildXpLedger(
  state: AppState,
  rules: ProgressionRules,
): XpLedgerEntry[] {
  validateProgressionRules(rules);
  const ledger: XpLedgerEntry[] = [];
  const seen = new Set<string>();
  for (const entry of state.habitDays) {
    const currentStatus = entry.events.at(-1)?.status;
    const habit = state.habits.find((item) => item.id === entry.habitId);
    if (
      currentStatus !== "completed" ||
      !habit ||
      !isHabitEntryScheduled(habit, entry)
    ) {
      continue;
    }
    const id = `habit-completion:${entry.habitId}:${entry.date}`;
    if (seen.has(id)) continue;
    seen.add(id);
    ledger.push({
      id,
      sourceId: `${entry.habitId}:${entry.date}`,
      date: entry.date,
      kind: "habit-completion",
      amountXp: rules.habitCompletionXp,
    });
  }

  const completionDates = new Set(
    state.habitDays
      .filter((entry) => entry.events.at(-1)?.status === "completed")
      .map((entry) => entry.date),
  );
  for (const date of completionDates) {
    const summary = getDailySummary(state, date);
    if (!summary.isComplete) continue;
    const id = `full-day-bonus:${date}`;
    if (seen.has(id)) continue;
    seen.add(id);
    ledger.push({
      id,
      sourceId: date,
      date,
      kind: "full-day-bonus",
      amountXp: rules.fullDayBonusXp,
    });
  }

  for (const unlock of state.achievementUnlocks) {
    const id = `achievement:${unlock.achievementId}`;
    if (seen.has(id)) continue;
    seen.add(id);
    ledger.push({
      id,
      sourceId: unlock.achievementId,
      date: unlock.unlockedOn,
      kind: "achievement",
      amountXp: unlock.rewardXp,
    });
  }
  return ledger.sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
}

export function getTotalXp(
  state: AppState,
  rules: ProgressionRules,
): number {
  return buildXpLedger(state, rules).reduce((total, entry) => {
    const sum = total + entry.amountXp;
    if (!Number.isSafeInteger(sum)) throw new Error("O total de XP excedeu o limite seguro.");
    return sum;
  }, 0);
}

export function getLevelProgress(
  totalXp: number,
  levels: ProgressionRules["levels"],
): LevelProgress {
  if (!Number.isSafeInteger(totalXp) || totalXp < 0) {
    throw new Error("O total de XP é inválido.");
  }
  const ordered = [...levels].sort((a, b) => a.minimumXp - b.minimumXp);
  if (
    ordered.length === 0 ||
    ordered[0].level !== 1 ||
    ordered[0].minimumXp !== 0 ||
    ordered.some((item, index) =>
      item.level !== index + 1 ||
      !Number.isSafeInteger(item.minimumXp) ||
      item.minimumXp < 0 ||
      (index > 0 && item.minimumXp <= ordered[index - 1].minimumXp),
    )
  ) {
    throw new Error("A tabela de níveis está ausente ou inválida.");
  }
  let current = ordered[0];
  let next = ordered[1];
  for (let index = 1; index < ordered.length; index += 1) {
    if (totalXp < ordered[index].minimumXp) {
      next = ordered[index];
      break;
    }
    current = ordered[index];
    next = ordered[index + 1];
  }
  return {
    level: current.level,
    title: current.title,
    totalXp,
    xpIntoLevel: totalXp - current.minimumXp,
    xpToNextLevel: next ? Math.max(0, next.minimumXp - totalXp) : null,
    nextLevel: next?.level ?? null,
  };
}

export function unlockEligibleAchievements(
  state: AppState,
  catalog: AchievementDefinition[],
  rules: ProgressionRules,
  today = toLocalDateKey(),
  now = new Date(),
): AppState {
  let nextState = state;
  const progression = getStreakSummary(state, today);
  const contributedCents = listGoalSummaries(state).reduce(
    (total, summary) => total + summary.contributedCents,
    0,
  );
  while (true) {
    const unlocked = new Set(nextState.achievementUnlocks.map((item) => item.achievementId));
    const totalXp = buildXpLedger(nextState, rules).reduce(
      (total, item) => total + item.amountXp,
      0,
    );
    const newlyUnlocked: AchievementUnlock[] = catalog
      .filter((achievement) =>
        !unlocked.has(achievement.id) &&
        isAchievementEligible(achievement.condition, {
        completedHabits: progression.completedHabits,
        completeDays: progression.completedDays,
        streakDays: progression.best,
        savedCents: contributedCents,
        totalXp,
        }),
      )
      .map((achievement) => ({
        achievementId: achievement.id,
        unlockedOn: today,
        unlockedAt: now.toISOString(),
        rewardXp: achievement.rewardXp,
      }));
    if (newlyUnlocked.length === 0) return nextState;
    nextState = {
      ...nextState,
      achievementUnlocks: [...nextState.achievementUnlocks, ...newlyUnlocked],
    };
  }
}

export function isAchievementEligible(
  condition: AchievementCondition,
  metrics: {
    completedHabits: number;
    completeDays: number;
    streakDays: number;
    savedCents: number;
    totalXp: number;
  },
): boolean {
  switch (condition.kind) {
    case "completed-habits":
      return metrics.completedHabits >= condition.count;
    case "complete-days":
      return metrics.completeDays >= condition.count;
    case "streak-days":
      return metrics.streakDays >= condition.count;
    case "total-xp":
      return metrics.totalXp >= condition.amountXp;
    case "saved-cents":
      return metrics.savedCents >= condition.amountCents;
  }
}

export function validateProgressionRules(rules: ProgressionRules): void {
  if (
    !Number.isSafeInteger(rules.habitCompletionXp) ||
    rules.habitCompletionXp < 0 ||
    !Number.isSafeInteger(rules.fullDayBonusXp) ||
    rules.fullDayBonusXp < 0
  ) {
    throw new Error("As regras de XP estão ausentes ou inválidas.");
  }
  getLevelProgress(0, rules.levels);
  const ids = new Set<string>();
  for (const achievement of rules.achievements) {
    if (
      !achievement.id.trim() ||
      ids.has(achievement.id) ||
      !Number.isSafeInteger(achievement.rewardXp) ||
      achievement.rewardXp < 0 ||
      !isValidCondition(achievement.condition)
    ) {
      throw new Error("O catálogo de conquistas contém dados inválidos.");
    }
    ids.add(achievement.id);
  }
}

function isValidCondition(condition: AchievementCondition): boolean {
  switch (condition.kind) {
    case "completed-habits":
    case "complete-days":
    case "streak-days":
      return Number.isSafeInteger(condition.count) && condition.count > 0;
    case "total-xp":
      return Number.isSafeInteger(condition.amountXp) && condition.amountXp > 0;
    case "saved-cents":
      return Number.isSafeInteger(condition.amountCents) && condition.amountCents > 0;
  }
}
