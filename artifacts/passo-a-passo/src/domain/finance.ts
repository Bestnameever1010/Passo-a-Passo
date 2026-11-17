import type {
  AppState,
  FinancialGoal,
  GoalContribution,
  GoalSummary,
  LocalDate,
} from "./model.ts";
import type { IdFactory } from "./habits.ts";

export interface GoalInput {
  name: string;
  description?: string;
  targetCents: number;
}

export interface ContributionInput {
  goalId: string;
  amountCents: number;
  date: LocalDate;
  note?: string;
}

export function createGoal(
  state: AppState,
  input: GoalInput,
  date: LocalDate,
  idFactory: IdFactory,
): AppState {
  validateGoalInput(input);
  const goal: FinancialGoal = {
    id: idFactory(),
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    targetCents: input.targetCents,
    createdOn: date,
  };
  return { ...state, goals: [...state.goals, goal] };
}

export function updateGoal(
  state: AppState,
  goalId: string,
  input: GoalInput,
): AppState {
  validateGoalInput(input);
  requireGoal(state, goalId);
  return {
    ...state,
    goals: state.goals.map((goal) =>
      goal.id === goalId
        ? {
            ...goal,
            name: input.name.trim(),
            description: input.description?.trim() ?? "",
            targetCents: input.targetCents,
          }
        : goal,
    ),
  };
}

export function archiveGoal(
  state: AppState,
  goalId: string,
  date: LocalDate,
): AppState {
  requireGoal(state, goalId);
  return {
    ...state,
    goals: state.goals.map((goal) =>
      goal.id === goalId ? { ...goal, archivedOn: date } : goal,
    ),
  };
}

export function addContribution(
  state: AppState,
  input: ContributionInput,
  now: Date,
  idFactory: IdFactory,
): AppState {
  const goal = requireGoal(state, input.goalId);
  validateAmount(input.amountCents);
  if (goal.archivedOn) {
    throw new Error("Não é possível adicionar valores a uma meta arquivada.");
  }
  if (input.date < goal.createdOn) {
    throw new Error("A data do aporte não pode ser anterior à criação da meta.");
  }
  const contribution: GoalContribution = {
    id: idFactory(),
    goalId: input.goalId,
    amountCents: input.amountCents,
    date: input.date,
    note: input.note?.trim() ?? "",
    createdAt: now.toISOString(),
    revisions: [],
  };
  return {
    ...state,
    contributions: [...state.contributions, contribution],
  };
}

export function correctContribution(
  state: AppState,
  contributionId: string,
  amountCents: number,
  note: string,
  now: Date,
): AppState {
  validateAmount(amountCents);
  const contribution = state.contributions.find(
    (item) => item.id === contributionId,
  );
  if (!contribution) throw new Error("Aporte não encontrado.");
  if (contribution.amountCents === amountCents && !note.trim()) return state;
  return {
    ...state,
    contributions: state.contributions.map((item) =>
      item.id === contributionId
        ? {
            ...item,
            amountCents,
            revisions: [
              ...item.revisions,
              {
                previousAmountCents: item.amountCents,
                correctedAt: now.toISOString(),
                note: note.trim(),
              },
            ],
          }
        : item,
    ),
  };
}

export function summarizeGoal(
  state: AppState,
  goalId: string,
): GoalSummary {
  const goal = requireGoal(state, goalId);
  const contributions = state.contributions
    .filter((item) => item.goalId === goalId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const contributedCents = contributions.reduce(
    (total, item) => addSafeCents(total, item.amountCents),
    0,
  );
  const remainingCents = Math.max(0, goal.targetCents - contributedCents);
  const percentComplete = Math.min(
    100,
    Math.round((contributedCents / goal.targetCents) * 1000) / 10,
  );
  return {
    goal,
    contributedCents,
    remainingCents,
    percentComplete,
    isComplete: contributedCents >= goal.targetCents,
    contributions,
  };
}

export function listGoalSummaries(state: AppState): GoalSummary[] {
  return state.goals
    .filter((goal) => !goal.archivedOn)
    .map((goal) => summarizeGoal(state, goal.id));
}

export function formatCents(amountCents: number, currency = "BRL"): string {
  validateAmount(amountCents, true);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export function validateGoalInput(input: GoalInput): void {
  if (!input.name.trim()) throw new Error("Informe um nome para a meta.");
  if (input.name.trim().length > 100) {
    throw new Error("O nome da meta deve ter até 100 caracteres.");
  }
  if ((input.description?.length ?? 0) > 500) {
    throw new Error("A descrição deve ter até 500 caracteres.");
  }
  validateAmount(input.targetCents);
}

export function validateAmount(amountCents: number, allowZero = false): void {
  if (
    !Number.isSafeInteger(amountCents) ||
    (allowZero ? amountCents < 0 : amountCents <= 0)
  ) {
    throw new Error("O valor precisa ser informado em centavos, sem exceder o limite seguro.");
  }
}

function requireGoal(state: AppState, goalId: string): FinancialGoal {
  const goal = state.goals.find((item) => item.id === goalId);
  if (!goal) throw new Error("Meta financeira não encontrada.");
  return goal;
}

function addSafeCents(total: number, amount: number): number {
  const sum = total + amount;
  if (!Number.isSafeInteger(sum)) {
    throw new Error("A soma dos valores excede o limite seguro.");
  }
  return sum;
}
