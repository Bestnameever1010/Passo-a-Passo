import { addLocalDays, compareLocalDates, daysBetween, toLocalDateKey, weekdayForDate } from "../domain/dates.ts";
import { formatCents, listGoalSummaries } from "../domain/finance.ts";
import {
  getDailySummary,
  getHabitDayEntry,
  getHabitRevision,
  getHabitStatus,
  isHabitScheduledOn,
} from "../domain/habits.ts";
import { getStreakSummary } from "../domain/progression.ts";
import type { AppState, GoalSpec, Habit, HabitLifecycleStatus, HabitStatus, LocalDate } from "../domain/model.ts";

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export interface HabitView {
  id: string;
  name: string;
  description: string;
  status: HabitLifecycleStatus;
  weekdays: number[];
  frequency: string;
  scheduledToday: boolean;
  dayStatus: HabitStatus;
  context?: string;
  mainGoal?: GoalSpec;
  minGoal?: GoalSpec;
  achievedLevel?: "main" | "min";
  completionCount: number;
  justificationCount: number;
}

export interface DayView {
  date: LocalDate;
  completed: number;
  justified: number;
  pending: number;
  neutral: number;
  scheduled: number;
  isComplete: boolean;
}

export interface MonthView {
  year: number;
  month: number;
  days: DayView[];
  completedHabits: number;
  justifiedHabits: number;
  completeDays: number;
}

export function getTodayHabits(state: AppState, today = toLocalDateKey()): HabitView[] {
  return getDailySummary(state, today).scheduled.map((scheduled) => {
    const entry = getHabitDayEntry(state, scheduled.habit.id, today);
    return toHabitView(state, scheduled.habit, today, scheduled.status, entry?.events.at(-1)?.context);
  });
}

export function getAllHabitViews(state: AppState, today = toLocalDateKey()): HabitView[] {
  return state.habits
    .filter((habit) => compareLocalDates(habit.createdOn, today) <= 0)
    .map((habit) => toHabitView(state, habit, today))
    .filter((view) => view.status !== "archived")
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function getHabitHistory(
  state: AppState,
  habitId: string,
): HabitDayEntryView[] {
  return state.habitDays
    .filter((entry) => entry.habitId === habitId)
    .map((entry) => {
      const event = entry.events.at(-1);
      const habit = state.habits.find((item) => item.id === entry.habitId);
      const revision = habit?.revisions.find((item) => item.id === entry.habitRevisionId);
      return {
        date: entry.date,
        name: revision?.name ?? "Hábito",
        status: event?.status ?? "pending",
        context: event?.context,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface HabitDayEntryView {
  date: LocalDate;
  name: string;
  status: HabitStatus;
  context?: string;
}

export function getMonthView(
  state: AppState,
  year: number,
  monthIndex: number,
  habitId?: string,
): MonthView {
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  let completedHabits = 0;
  let justifiedHabits = 0;
  let completeDays = 0;
  const days: DayView[] = [];
  for (let day = 1; day <= totalDays; day += 1) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const summary = getDailySummary(state, date);
    const matchingHabits = habitId
      ? summary.scheduled.filter((item) => item.habit.id === habitId)
      : summary.scheduled;
    const completed = matchingHabits.filter((item) => item.status === "completed").length;
    const justified = matchingHabits.filter((item) => item.status === "justified").length;
    const pending = matchingHabits.filter((item) => item.status === "pending").length;
    const neutral = matchingHabits.filter((item) => item.status === "neutral").length;
    const isComplete = matchingHabits.length > 0 && completed === matchingHabits.length;
    completedHabits += completed;
    justifiedHabits += justified;
    if (isComplete) completeDays += 1;
    days.push({
      date,
      completed,
      justified,
      pending,
      neutral,
      scheduled: matchingHabits.length,
      isComplete,
    });
  }
  return { year, month: monthIndex, days, completedHabits, justifiedHabits, completeDays };
}

export function getTodaySummary(state: AppState, today = toLocalDateKey()) {
  return getDailySummary(state, today);
}

export function getStreaks(state: AppState, today = toLocalDateKey()) {
  return getStreakSummary(state, today);
}

export function getActiveGoalView(state: AppState) {
  return listGoalSummaries(state)
    .filter((summary) => !summary.isComplete)
    .sort((a, b) => a.goal.createdOn.localeCompare(b.goal.createdOn))[0]
    ?? listGoalSummaries(state)[0];
}

export function getGoalViews(state: AppState) {
  return listGoalSummaries(state);
}

export function getContextualMessage(state: AppState, today = toLocalDateKey()): string {
  const summary = getDailySummary(state, today);
  if (summary.scheduled.length === 0) {
    return state.habits.length === 0
      ? "Comece com um hábito importante para você."
      : "Hoje não há hábitos programados. Aproveite o seu ritmo.";
  }
  const inactiveDays = getDaysSinceLastActivity(state, today);
  if (inactiveDays !== null && inactiveDays >= 3) {
    return "Você não precisa recuperar o tempo perdido. Só precisa dar o próximo passo.";
  }
  if (summary.isComplete) return "Você concluiu tudo o que planejou para hoje. Isso merece celebração.";
  if (summary.completed > 0) {
    const minGoals = countMinGoalsToday(state, today);
    if (minGoals > 0 && summary.completed <= minGoals) {
      return "Você fez algo por si mesmo hoje. Isso importa.";
    }
    return "Você já deu o primeiro passo. Continue no seu ritmo.";
  }
  if (summary.justified > 0) return "Seu progresso também inclui cuidar dos seus limites.";
  return "Cinco minutos também contam.";
}

function getDaysSinceLastActivity(state: AppState, today: LocalDate): number | null {
  const latest = state.habitDays
    .map((entry) => entry.events.at(-1))
    .filter((event): event is NonNullable<typeof event> => Boolean(event?.recordedOn))
    .sort((a, b) => b.recordedOn.localeCompare(a.recordedOn))[0];
  if (!latest) return null;
  return Math.max(0, daysBetween(latest.recordedOn, today));
}

function countMinGoalsToday(state: AppState, today: LocalDate): number {
  return state.habitDays.filter(
    (entry) =>
      entry.date === today &&
      entry.events.at(-1)?.status === "completed" &&
      entry.events.at(-1)?.level === "min",
  ).length;
}

export interface WeeklyReport {
  start: LocalDate;
  end: LocalDate;
  scheduledDays: number;
  completedDays: number;
  mainGoals: number;
  minGoals: number;
  totalCompleted: number;
  bestDay: LocalDate | null;
  suggestion: string;
}

export function getWeeklyReport(state: AppState, today = toLocalDateKey()): WeeklyReport {
  const end = today;
  const start = addLocalDays(today, -6);
  let scheduledDays = 0;
  let completedDays = 0;
  let mainGoals = 0;
  let minGoals = 0;
  let totalCompleted = 0;
  let bestDay: LocalDate | null = null;
  let bestCount = 0;
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = addLocalDays(today, -offset);
    const summary = getDailySummary(state, date);
    if (summary.scheduled.length > 0) scheduledDays += 1;
    if (summary.completed > 0) {
      completedDays += 1;
      totalCompleted += summary.completed;
      if (summary.completed > bestCount) {
        bestCount = summary.completed;
        bestDay = date;
      }
    }
    for (const item of summary.scheduled) {
      const event = getHabitDayEntry(state, item.habit.id, date)?.events.at(-1);
      if (event?.status === "completed") {
        if (event.level === "main") mainGoals += 1;
        else if (event.level === "min") minGoals += 1;
      }
    }
  }
  let suggestion = "Continue mantendo os hábitos que funcionaram esta semana.";
  if (totalCompleted === 0) suggestion = "Que tal começar com uma meta mínima pequena amanhã?";
  else if (mainGoals === 0 && minGoals > 0) suggestion = "Experimente ampliar uma das metas mínimas para a principal.";
  else if (scheduledDays > 0 && completedDays / scheduledDays < 0.5) suggestion = "Reduza temporariamente as metas para facilitar a constância.";
  return { start, end, scheduledDays, completedDays, mainGoals, minGoals, totalCompleted, bestDay, suggestion };
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function formatLocalDate(date: LocalDate, options?: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", options ?? {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}

export function formatWeekdays(weekdays: number[]): string {
  if (weekdays.length === 7) return "Todos os dias";
  if (weekdays.length === 5 && [1, 2, 3, 4, 5].every((day) => weekdays.includes(day))) {
    return "Dias úteis";
  }
  if (weekdays.length === 2 && [0, 6].every((day) => weekdays.includes(day))) {
    return "Fins de semana";
  }
  return weekdays
    .slice()
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join(", ");
}

export function formatMoneyForState(state: AppState, cents: number): string {
  return formatCents(cents, state.preferences.currency);
}

function toHabitView(
  state: AppState,
  habit: Habit,
  date: LocalDate,
  knownStatus?: HabitStatus,
  knownContext?: string,
): HabitView {
  const revision = getHabitRevision(habit, date) ?? habit.revisions.at(-1)!;
  const entry = getHabitDayEntry(state, habit.id, date);
  const currentEvent = entry?.events.at(-1);
  const completed = state.habitDays.filter(
    (item) => item.habitId === habit.id && item.events.at(-1)?.status === "completed",
  ).length;
  const justified = state.habitDays.reduce(
    (total, item) =>
      item.habitId === habit.id
        ? total + item.events.filter((event) => event.status === "justified").length
        : total,
    0,
  );
  const weekdays = revision.weekdays;
  return {
    id: habit.id,
    name: revision.name,
    description: revision.description,
    status: getHabitStatus(habit, date) ?? "active",
    weekdays,
    frequency: formatWeekdays(weekdays),
    scheduledToday: isHabitScheduledOn(habit, date) && weekdayForDate(date) >= 0,
    dayStatus: knownStatus ?? currentEvent?.status ?? "pending",
    context: knownContext ?? currentEvent?.context,
    mainGoal: revision.mainGoal,
    minGoal: revision.minGoal,
    achievedLevel: currentEvent?.level,
    completionCount: completed,
    justificationCount: justified,
  };
}

export function getMonthDateRange(year: number, monthIndex: number): {
  start: LocalDate;
  end: LocalDate;
} {
  const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const end = addLocalDays(start, new Date(year, monthIndex + 1, 0).getDate() - 1);
  return { start, end };
}
