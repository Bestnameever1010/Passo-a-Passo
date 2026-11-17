import type { AchievementDefinition, ProgressionRules } from "./model.ts";

/**
 * Catálogo de conquistas. Cada conquista corresponde a uma realização
 * verdadeira e é desbloqueada automaticamente quando a condição é atingida.
 */
export const OFFICIAL_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first-habit",
    name: "Primeiro passo",
    description: "Concluiu seu primeiro hábito.",
    rewardXp: 20,
    condition: { kind: "completed-habits", count: 1 },
  },
  {
    id: "ten-habits",
    name: "Dez passos",
    description: "Concluiu 10 hábitos no total.",
    rewardXp: 30,
    condition: { kind: "completed-habits", count: 10 },
  },
  {
    id: "fifty-habits",
    name: "Caminho firme",
    description: "Concluiu 50 hábitos no total.",
    rewardXp: 60,
    condition: { kind: "completed-habits", count: 50 },
  },
  {
    id: "hundred-habits",
    name: "Cem passos",
    description: "Concluiu 100 hábitos no total.",
    rewardXp: 100,
    condition: { kind: "completed-habits", count: 100 },
  },
  {
    id: "first-complete-day",
    name: "Dia completo",
    description: "Completou todos os hábitos de um dia.",
    rewardXp: 20,
    condition: { kind: "complete-days", count: 1 },
  },
  {
    id: "week-streak",
    name: "Uma semana inteira",
    description: "Completou todos os hábitos por 7 dias seguidos.",
    rewardXp: 40,
    condition: { kind: "streak-days", count: 7 },
  },
  {
    id: "month-streak",
    name: "Um mês de evolução",
    description: "Completou todos os hábitos por 30 dias seguidos.",
    rewardXp: 100,
    condition: { kind: "streak-days", count: 30 },
  },
  {
    id: "xp-100",
    name: "100 XP",
    description: "Acumulou 100 pontos de experiência.",
    rewardXp: 15,
    condition: { kind: "total-xp", amountXp: 100 },
  },
  {
    id: "xp-500",
    name: "500 XP",
    description: "Acumulou 500 pontos de experiência.",
    rewardXp: 30,
    condition: { kind: "total-xp", amountXp: 500 },
  },
  {
    id: "xp-1000",
    name: "1000 XP",
    description: "Acumulou 1000 pontos de experiência.",
    rewardXp: 50,
    condition: { kind: "total-xp", amountXp: 1000 },
  },
  {
    id: "save-100",
    name: "Primeira reserva",
    description: "Guardou R$ 100 em uma meta financeira.",
    rewardXp: 40,
    condition: { kind: "saved-cents", amountCents: 10000 },
  },
  {
    id: "save-1000",
    name: "Reserva sólida",
    description: "Guardou R$ 1.000 em metas financeiras.",
    rewardXp: 80,
    condition: { kind: "saved-cents", amountCents: 100000 },
  },
];

/**
 * Regras oficiais de progressão do Passo a Passo.
 *
 * O XP é uma forma honesta de reconhecer esforço real: concluir um hábito
 * concede XP, completar um dia inteiro concede um bônus, e conquistas
 * concedem recompensas únicas. Não há punição por pausas — o progresso
 * acumulado nunca é perdido.
 */
export const OFFICIAL_PROGRESSION_RULES: ProgressionRules = {
  habitCompletionXp: 10,
  fullDayBonusXp: 5,
  levels: [
    { level: 1, minimumXp: 0, title: "Início da jornada" },
    { level: 2, minimumXp: 50, title: "Primeiros passos" },
    { level: 3, minimumXp: 150, title: "Constância" },
    { level: 4, minimumXp: 300, title: "Ritmo" },
    { level: 5, minimumXp: 500, title: "Dedicação" },
    { level: 6, minimumXp: 800, title: "Compromisso" },
    { level: 7, minimumXp: 1200, title: "Disciplina" },
    { level: 8, minimumXp: 1700, title: "Evolução" },
    { level: 9, minimumXp: 2300, title: "Excelência" },
    { level: 10, minimumXp: 3000, title: "Mestria" },
  ],
  achievements: OFFICIAL_ACHIEVEMENTS,
};
