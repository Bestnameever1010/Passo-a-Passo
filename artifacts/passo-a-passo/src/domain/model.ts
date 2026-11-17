export const APP_SCHEMA_VERSION = 1 as const;

export type LocalDate = string;
export type ThemeMode = "light" | "dark";
export type HabitStatus = "pending" | "completed" | "justified" | "neutral";
export type HabitLifecycleStatus = "active" | "paused" | "archived";

export interface AppPreferences {
  theme: ThemeMode;
  reducedMotion: boolean;
  weekStartsOn: 0 | 1;
  currency: string;
}

export interface GoalSpec {
  value: number;
  unit: string;
}

export interface HabitRevision {
  id: string;
  name: string;
  description: string;
  weekdays: number[];
  mainGoal?: GoalSpec;
  minGoal?: GoalSpec;
  effectiveFrom: LocalDate;
}

export interface HabitLifecycleEvent {
  id: string;
  status: HabitLifecycleStatus;
  effectiveFrom: LocalDate;
}

export interface Habit {
  id: string;
  createdOn: LocalDate;
  revisions: HabitRevision[];
  lifecycle: HabitLifecycleEvent[];
}

export interface HabitStatusEvent {
  id: string;
  status: HabitStatus;
  context?: string;
  level?: "main" | "min";
  recordedOn: LocalDate;
  recordedAt: string;
}

export interface HabitDayEntry {
  id: string;
  habitId: string;
  date: LocalDate;
  habitRevisionId: string;
  events: HabitStatusEvent[];
}

export interface ContributionRevision {
  previousAmountCents: number;
  correctedAt: string;
  note: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amountCents: number;
  date: LocalDate;
  note: string;
  createdAt: string;
  revisions: ContributionRevision[];
}

export interface FinancialGoal {
  id: string;
  name: string;
  description: string;
  targetCents: number;
  createdOn: LocalDate;
  archivedOn?: LocalDate;
}

export type AchievementCondition =
  | { kind: "completed-habits"; count: number }
  | { kind: "complete-days"; count: number }
  | { kind: "streak-days"; count: number }
  | { kind: "total-xp"; amountXp: number }
  | { kind: "saved-cents"; amountCents: number };

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  rewardXp: number;
  condition: AchievementCondition;
}

export interface AchievementUnlock {
  achievementId: string;
  unlockedOn: LocalDate;
  unlockedAt: string;
  rewardXp: number;
}

export interface AppState {
  schemaVersion: typeof APP_SCHEMA_VERSION;
  preferences: AppPreferences;
  habits: Habit[];
  habitDays: HabitDayEntry[];
  goals: FinancialGoal[];
  contributions: GoalContribution[];
  achievementUnlocks: AchievementUnlock[];
}

export interface ScheduledHabit {
  habit: Habit;
  revision: HabitRevision;
  status: HabitStatus;
  context?: string;
}

export interface DailySummary {
  date: LocalDate;
  scheduled: ScheduledHabit[];
  completed: number;
  justified: number;
  pending: number;
  neutral: number;
  isComplete: boolean;
}

export interface LevelThreshold {
  level: number;
  minimumXp: number;
  title?: string;
}

export interface ProgressionRules {
  habitCompletionXp: number;
  fullDayBonusXp: number;
  levels: LevelThreshold[];
  achievements: AchievementDefinition[];
}

export interface XpLedgerEntry {
  id: string;
  date: LocalDate;
  kind: "habit-completion" | "full-day-bonus" | "achievement";
  sourceId: string;
  amountXp: number;
}

export interface LevelProgress {
  level: number;
  title?: string;
  totalXp: number;
  xpIntoLevel: number;
  xpToNextLevel: number | null;
  nextLevel: number | null;
}

export interface GoalSummary {
  goal: FinancialGoal;
  contributedCents: number;
  remainingCents: number;
  percentComplete: number;
  isComplete: boolean;
  contributions: GoalContribution[];
}
