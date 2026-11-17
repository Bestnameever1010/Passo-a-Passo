import { z } from "zod/v4";
import { isLocalDate } from "../domain/dates.ts";
import { APP_SCHEMA_VERSION } from "../domain/model.ts";
import type { AppState } from "../domain/model.ts";

const idSchema = z.string().min(1).max(200);
const dateSchema = z.string().refine(isLocalDate, "Data de calendário inválida.");
const timestampSchema = z.string().refine(
  (value) => Number.isFinite(Date.parse(value)),
  "Data e hora inválidas.",
);
const weekdaySchema = z.number().int().min(0).max(6);

const goalSpecSchema = z.object({
  value: z.number().positive().max(Number.MAX_SAFE_INTEGER),
  unit: z.string().trim().min(1).max(40),
}).strict();

const habitRevisionSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500),
  weekdays: z.array(weekdaySchema).min(1).max(7),
  mainGoal: goalSpecSchema.optional(),
  minGoal: goalSpecSchema.optional(),
  effectiveFrom: dateSchema,
}).strict().refine(
  (revision) => new Set(revision.weekdays).size === revision.weekdays.length,
  "Os dias da semana não podem se repetir.",
);

const lifecycleEventSchema = z.object({
  id: idSchema,
  status: z.enum(["active", "paused", "archived"]),
  effectiveFrom: dateSchema,
}).strict();

const habitSchema = z.object({
  id: idSchema,
  createdOn: dateSchema,
  revisions: z.array(habitRevisionSchema).min(1),
  lifecycle: z.array(lifecycleEventSchema).min(1),
}).strict();

const statusEventSchema = z.object({
  id: idSchema,
  status: z.enum(["pending", "completed", "justified", "neutral"]),
  context: z.string().max(2000).optional(),
  level: z.enum(["main", "min"]).optional(),
  recordedOn: dateSchema,
  recordedAt: timestampSchema,
}).strict().refine(
  (event) => event.status !== "justified" || Boolean(event.context?.trim()),
  "Uma justificativa precisa conter contexto.",
).refine(
  (event) => event.status !== "completed" || event.level === undefined || event.level === "main" || event.level === "min",
  "O nível de conclusão é inválido.",
);

const habitDaySchema = z.object({
  id: idSchema,
  habitId: idSchema,
  date: dateSchema,
  habitRevisionId: idSchema,
  events: z.array(statusEventSchema).min(1),
}).strict();

const contributionRevisionSchema = z.object({
  previousAmountCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  correctedAt: timestampSchema,
  note: z.string().max(500),
}).strict();

const contributionSchema = z.object({
  id: idSchema,
  goalId: idSchema,
  amountCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  date: dateSchema,
  note: z.string().max(500),
  createdAt: timestampSchema,
  revisions: z.array(contributionRevisionSchema),
}).strict();

const goalSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500),
  targetCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  createdOn: dateSchema,
  archivedOn: dateSchema.optional(),
}).strict();

const achievementUnlockSchema = z.object({
  achievementId: idSchema,
  unlockedOn: dateSchema,
  unlockedAt: timestampSchema,
  rewardXp: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();

export const appStateSchema = z.object({
  schemaVersion: z.literal(APP_SCHEMA_VERSION),
  preferences: z.object({
    theme: z.enum(["light", "dark"]),
    reducedMotion: z.boolean(),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }).strict(),
  habits: z.array(habitSchema),
  habitDays: z.array(habitDaySchema),
  goals: z.array(goalSchema),
  contributions: z.array(contributionSchema),
  achievementUnlocks: z.array(achievementUnlockSchema),
}).strict();

export function parseAppState(input: unknown): AppState {
  const envelope = readVersion(input);
  let value = envelope.value;
  let version = envelope.version;
  while (version < APP_SCHEMA_VERSION) {
    throw new Error(
      `A versão ${version} dos dados não possui uma migração disponível.`,
    );
  }
  if (version > APP_SCHEMA_VERSION) {
    throw new Error(
      `O backup usa uma versão mais nova (${version}) do que este aplicativo suporta.`,
    );
  }
  const parsed = appStateSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Os dados não passaram na validação: ${parsed.error.issues[0]?.message ?? "formato inválido"}`);
  }
  validateRelationships(parsed.data);
  return parsed.data;
}

function readVersion(input: unknown): { value: unknown; version: number } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Os dados precisam ser um objeto JSON.");
  }
  const record = input as Record<string, unknown>;
  if (!Number.isSafeInteger(record.schemaVersion) || Number(record.schemaVersion) < 1) {
    throw new Error("O backup não contém uma versão de dados válida.");
  }
  return { value: input, version: Number(record.schemaVersion) };
}

function validateRelationships(state: AppState): void {
  assertUnique(state.habits.map((item) => item.id), "hábitos");
  assertUnique(state.goals.map((item) => item.id), "metas");
  assertUnique(state.contributions.map((item) => item.id), "aportes");
  assertUnique(
    state.habitDays.map((item) => `${item.habitId}\u0000${item.date}`),
    "registros diários",
  );
  assertUnique(state.achievementUnlocks.map((item) => item.achievementId), "conquistas desbloqueadas");

  const habits = new Map(state.habits.map((habit) => [habit.id, habit]));
  for (const entry of state.habitDays) {
    const habit = habits.get(entry.habitId);
    if (!habit || !habit.revisions.some((revision) => revision.id === entry.habitRevisionId)) {
      throw new Error("Um registro diário aponta para um hábito ou versão inexistente.");
    }
  }
  const goals = new Map(state.goals.map((goal) => [goal.id, goal]));
  for (const contribution of state.contributions) {
    if (!goals.has(contribution.goalId)) {
      throw new Error("Um aporte aponta para uma meta inexistente.");
    }
  }
}

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`O backup contém ${label} duplicados.`);
  }
}
