import { addLocalDays, compareLocalDates, toLocalDateFromTimestamp, toLocalDateKey, weekdayForDate } from "./dates.ts";
import type {
  AppState,
  DailySummary,
  GoalSpec,
  Habit,
  HabitDayEntry,
  HabitLifecycleStatus,
  HabitRevision,
  HabitStatus,
  LocalDate,
  ScheduledHabit,
} from "./model.ts";

export interface HabitInput {
  name: string;
  description?: string;
  weekdays: number[];
  mainGoal?: GoalSpec;
  minGoal?: GoalSpec;
}

export type IdFactory = () => string;

export function createHabit(
  state: AppState,
  input: HabitInput,
  date: LocalDate,
  idFactory: IdFactory,
): AppState {
  validateHabitInput(input);
  const habitId = idFactory();
  const revision: HabitRevision = {
    id: idFactory(),
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    weekdays: normalizeWeekdays(input.weekdays),
    mainGoal: input.mainGoal,
    minGoal: input.minGoal,
    effectiveFrom: date,
  };
  const habit: Habit = {
    id: habitId,
    createdOn: date,
    revisions: [revision],
    lifecycle: [{ id: idFactory(), status: "active", effectiveFrom: date }],
  };
  return { ...state, habits: [...state.habits, habit] };
}

export function updateHabit(
  state: AppState,
  habitId: string,
  input: HabitInput,
  effectiveFrom: LocalDate,
  idFactory: IdFactory,
): AppState {
  validateHabitInput(input);
  const habit = requireHabit(state, habitId);
  if (statusOnDate(habit, effectiveFrom) === "archived") {
    throw new Error("Um hábito excluído não pode ser alterado.");
  }
  const current = getHabitRevision(habit, effectiveFrom);
  if (!current) {
    throw new Error("Não foi possível encontrar a versão atual do hábito.");
  }
  const next = {
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    weekdays: normalizeWeekdays(input.weekdays),
    mainGoal: input.mainGoal,
    minGoal: input.minGoal,
  };
  if (
    current.name === next.name &&
    current.description === next.description &&
    sameNumbers(current.weekdays, next.weekdays) &&
    sameGoals(current.mainGoal, next.mainGoal) &&
    sameGoals(current.minGoal, next.minGoal)
  ) {
    return state;
  }
  const revision: HabitRevision = {
    id: idFactory(),
    ...next,
    effectiveFrom,
  };
  return {
    ...state,
    habits: state.habits.map((item) =>
      item.id === habitId
        ? { ...item, revisions: [...item.revisions, revision] }
        : item,
    ),
  };
}

export function setHabitLifecycle(
  state: AppState,
  habitId: string,
  status: HabitLifecycleStatus,
  effectiveFrom: LocalDate,
  idFactory: IdFactory,
): AppState {
  const habit = requireHabit(state, habitId);
  const current = statusOnDate(habit, effectiveFrom);
  if (current === "archived") {
    throw new Error("Um hábito excluído não pode ser retomado.");
  }
  if (current === status) return state;
  const event = { id: idFactory(), status, effectiveFrom };
  return {
    ...state,
    habits: state.habits.map((item) =>
      item.id === habitId
        ? { ...item, lifecycle: [...item.lifecycle, event] }
        : item,
    ),
  };
}

export function getHabitRevision(
  habit: Habit,
  date: LocalDate,
): HabitRevision | undefined {
  return latestEffective(habit.revisions, date);
}

export function getHabitStatus(
  habit: Habit,
  date: LocalDate,
): HabitLifecycleStatus | undefined {
  return latestEffective(habit.lifecycle, date)?.status;
}

export function isHabitScheduledOn(habit: Habit, date: LocalDate): boolean {
  if (compareLocalDates(habit.createdOn, date) > 0) return false;
  if (getHabitStatus(habit, date) !== "active") return false;
  const revision = getHabitRevision(habit, date);
  return revision?.weekdays.includes(weekdayForDate(date)) ?? false;
}

export function isHabitEntryScheduled(
  habit: Habit,
  entry: HabitDayEntry,
): boolean {
  if (
    compareLocalDates(habit.createdOn, entry.date) > 0 ||
    getHabitStatus(habit, entry.date) !== "active"
  ) {
    return false;
  }
  const revision = habit.revisions.find(
    (item) => item.id === entry.habitRevisionId,
  );
  return revision?.weekdays.includes(weekdayForDate(entry.date)) ?? false;
}

export function getDailySummary(state: AppState, date: LocalDate): DailySummary {
  const scheduled: ScheduledHabit[] = state.habits.flatMap((habit) => {
    if (
      compareLocalDates(habit.createdOn, date) > 0 ||
      getHabitStatus(habit, date) !== "active"
    ) return [];
    const entry = getHabitDayEntry(state, habit.id, date);
    const revision = entry
      ? habit.revisions.find((item) => item.id === entry.habitRevisionId)
      : getHabitRevision(habit, date);
    if (!revision) return [];
    if (!revision.weekdays.includes(weekdayForDate(date))) return [];
    const lastEvent = entry?.events.at(-1);
    return [{
      habit,
      revision,
      status: lastEvent?.status ?? "pending",
      context: lastEvent?.context,
    }];
  });
  const completed = scheduled.filter((item) => item.status === "completed").length;
  const justified = scheduled.filter((item) => item.status === "justified").length;
  const pending = scheduled.filter((item) => item.status === "pending").length;
  const neutral = scheduled.filter((item) => item.status === "neutral").length;
  return {
    date,
    scheduled,
    completed,
    justified,
    pending,
    neutral,
    isComplete: scheduled.length > 0 && completed === scheduled.length,
  };
}

export function getHabitDayEntry(
  state: AppState,
  habitId: string,
  date: LocalDate,
): HabitDayEntry | undefined {
  return state.habitDays.find(
    (item) => item.habitId === habitId && item.date === date,
  );
}

export function recordHabitStatus(
  state: AppState,
  habitId: string,
  date: LocalDate,
  status: HabitStatus,
  context: string | undefined,
  now: Date,
  idFactory: IdFactory,
  level?: "main" | "min",
): AppState {
  const today = toLocalDateKey(now);
  if (compareLocalDates(date, today) > 0) {
    throw new Error("Não é possível registrar um hábito em uma data futura.");
  }
  const habit = requireHabit(state, habitId);
  if (!isHabitScheduledOn(habit, date)) {
    throw new Error("Este hábito não estava programado para essa data.");
  }
  const previousEntry = getHabitDayEntry(state, habitId, date);
  const previousEvent = previousEntry?.events.at(-1);
  if (previousEvent?.status === status) return state;
  const revision = previousEntry
    ? habit.revisions.find((item) => item.id === previousEntry.habitRevisionId)
    : getHabitRevision(habit, date);
  if (
    getHabitStatus(habit, date) !== "active" ||
    !revision?.weekdays.includes(weekdayForDate(date))
  ) {
    throw new Error("Este hábito não estava programado para essa data.");
  }

  const cleanContext = context?.trim();
  if (status === "justified") {
    if (!cleanContext) {
      throw new Error("Informe o contexto da justificativa.");
    }
    const priorJustification = previousEntry?.events.find(
      (event) => event.status === "justified",
    );
    if (priorJustification) {
      throw new Error("Este registro já teve uma justificativa.");
    }
    if (countRecentJustifications(state, now) >= 2) {
      throw new Error("O limite de duas justificativas nos últimos sete dias foi atingido.");
    }
  }

  const event = {
    id: idFactory(),
    status,
    ...(status === "justified" ? { context: cleanContext } : {}),
    ...(status === "completed" && level ? { level } : {}),
    recordedOn: today,
    recordedAt: now.toISOString(),
  };
  const nextEntry: HabitDayEntry = {
    id: previousEntry?.id ?? `${habitId}:${date}`,
    habitId,
    date,
    habitRevisionId: previousEntry?.habitRevisionId ?? revision.id,
    events: [...(previousEntry?.events ?? []), event],
  };
  return {
    ...state,
    habitDays: previousEntry
      ? state.habitDays.map((item) => item.id === previousEntry.id ? nextEntry : item)
      : [...state.habitDays, nextEntry],
  };
}

export function countRecentJustifications(state: AppState, now: Date): number {
  const today = toLocalDateKey(now);
  const firstIncludedDate = addLocalDays(today, -6);
  return state.habitDays.reduce((total, entry) => {
    const count = entry.events.filter((event) => {
      if (event.status !== "justified") return false;
      const recordedOn = event.recordedOn || toLocalDateFromTimestamp(event.recordedAt);
      return recordedOn >= firstIncludedDate && recordedOn <= today;
    }).length;
    return total + count;
  }, 0);
}

export function validateHabitInput(input: HabitInput): void {
  if (!input.name.trim()) {
    throw new Error("Informe um nome para o hábito.");
  }
  if (input.name.trim().length > 80) {
    throw new Error("O nome do hábito deve ter até 80 caracteres.");
  }
  if ((input.description?.length ?? 0) > 500) {
    throw new Error("A descrição deve ter até 500 caracteres.");
  }
  if (
    input.weekdays.length < 1 ||
    input.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    throw new Error("Selecione ao menos um dia válido da semana.");
  }
  if (input.mainGoal && !isValidGoalSpec(input.mainGoal)) {
    throw new Error("A meta principal precisa ter um valor maior que zero e uma unidade.");
  }
  if (input.minGoal && !isValidGoalSpec(input.minGoal)) {
    throw new Error("A meta mínima precisa ter um valor maior que zero e uma unidade.");
  }
}

function isValidGoalSpec(goal: GoalSpec): boolean {
  return (
    Number.isFinite(goal.value) &&
    goal.value > 0 &&
    typeof goal.unit === "string" &&
    goal.unit.trim().length > 0
  );
}

function normalizeWeekdays(weekdays: number[]): number[] {
  return [...new Set(weekdays)].sort((a, b) => a - b);
}

function requireHabit(state: AppState, habitId: string): Habit {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) throw new Error("Hábito não encontrado.");
  return habit;
}

function latestEffective<T extends { effectiveFrom: LocalDate }>(
  items: T[],
  date: LocalDate,
): T | undefined {
  let latest: T | undefined;
  let latestIndex = -1;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (
      compareLocalDates(item.effectiveFrom, date) <= 0 &&
      (!latest || compareLocalDates(item.effectiveFrom, latest.effectiveFrom) > 0 ||
        (item.effectiveFrom === latest.effectiveFrom && index > latestIndex))
    ) {
      latest = item;
      latestIndex = index;
    }
  }
  return latest;
}

function statusOnDate(
  habit: Habit,
  date: LocalDate,
): HabitLifecycleStatus | undefined {
  return getHabitStatus(habit, date);
}

function sameNumbers(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameGoals(a: GoalSpec | undefined, b: GoalSpec | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.value === b.value && a.unit === b.unit;
}
