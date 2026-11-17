import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Award,
  Check,
  CircleDollarSign,
  Flame,
  Leaf,
  Plus,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { getGreeting, formatLocalDate, formatMoneyForState, getWeeklyReport } from "@/app/view-models";
import type { HabitView } from "@/app/view-models";
import type { GoalSummary } from "@/domain/model";
import type {
  AchievementDefinition,
  AppState,
  DailySummary,
  LevelProgress,
} from "@/domain/model";
import type { StreakSummary } from "@/domain/progression";
import type { StateChangeResult } from "@/app/app-data-controller";
import { CardHeading, EmptyState, StatusLabel } from "./common";

export function DashboardPage({
  state,
  today,
  habits,
  summary,
  streaks,
  goals,
  message,
  level,
  xpTotal,
  achievements,
  onAddHabit,
  onSetStatus,
  onJustify,
}: {
  state: AppState;
  today: string;
  habits: HabitView[];
  summary: DailySummary;
  streaks: StreakSummary;
  goals: GoalSummary[];
  message: string;
  level: LevelProgress | null;
  xpTotal: number | null;
  achievements: AchievementDefinition[];
  onAddHabit: () => void;
  onSetStatus: (habitId: string, status: "pending" | "completed" | "neutral", level?: "main" | "min") => StateChangeResult;
  onJustify: (habit: HabitView) => void;
}) {
  const completion = summary.scheduled.length
    ? Math.round(summary.completed / summary.scheduled.length * 100)
    : 0;
  const lockedAchievements = achievements
    .filter((item) => !state.achievementUnlocks.some((unlock) => unlock.achievementId === item.id))
    .slice(0, 2);
  const unlockedCount = state.achievementUnlocks.length;
  const [celebratingHabitId, setCelebratingHabitId] = useState<string | null>(null);
  const celebrationTimer = useRef<number | null>(null);
  const hasCompletedToday = summary.scheduled.length > 0 &&
    summary.completed === summary.scheduled.length;
  const week = getWeeklyReport(state, today);

  useEffect(() => () => {
    if (celebrationTimer.current !== null) {
      window.clearTimeout(celebrationTimer.current);
    }
  }, []);

  const toggleHabit = (habit: HabitView, level?: "main" | "min") => {
    const nextStatus = habit.dayStatus === "completed" ? "pending" : "completed";
    const result = onSetStatus(habit.id, nextStatus, level);
    if (!result.ok) return;
    if (nextStatus === "completed") {
      setCelebratingHabitId(habit.id);
      if (celebrationTimer.current !== null) {
        window.clearTimeout(celebrationTimer.current);
      }
      celebrationTimer.current = window.setTimeout(() => {
        setCelebratingHabitId(null);
        celebrationTimer.current = null;
      }, 900);
    }
  };

  return (
    <div className="content fade-up">
      <section className="welcome-card">
        <div className="welcome-copy">
          <div className="eyebrow">{getGreeting()}</div>
          <h1>Um passo de cada vez.</h1>
          <p>{message}</p>
        </div>
        <div className="date-label">{formatLocalDate(today)}</div>
      </section>

      <div className="dashboard-grid">
        <div>
          <section className="journey-progress-card" aria-label="Resumo do seu progresso">
            <div className="journey-progress-main">
              <div className="journey-progress-copy">
                <span className="journey-overline">O caminho de hoje</span>
                <strong data-testid="stat-daily-progress">
                  {summary.scheduled.length ? `${summary.completed} de ${summary.scheduled.length}` : "Seu primeiro passo"}
                </strong>
                <span>{summary.scheduled.length ? "hábitos concluídos" : "começa quando você quiser"}</span>
              </div>
              <div
                className={`journey-progress-ring ${hasCompletedToday ? "is-complete" : ""}`}
                style={{ "--progress": `${completion}%` } as React.CSSProperties}
                role="img"
                aria-label={`${completion}% do plano diário concluído`}
              >
                <span>{summary.scheduled.length ? `${completion}%` : <Leaf aria-hidden="true" />}</span>
              </div>
            </div>
            <div className="journey-progress-track" role="progressbar" aria-label="Progresso dos hábitos de hoje" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
              <span style={{ width: `${completion}%` }} />
            </div>
            <div className="journey-stat-row">
              <div className="journey-stat" data-testid="stat-current-streak">
                <span className="journey-stat-icon streak"><Flame aria-hidden="true" /></span>
                <div><small>Sequência</small><strong>{streaks.current}</strong></div>
                <span className="journey-stat-caption">recorde de {streaks.best} dias</span>
              </div>
              <div className="journey-stat" data-testid="stat-xp">
                <span className="journey-stat-icon xp"><Sparkles aria-hidden="true" /></span>
                <div><small>Experiência</small><strong>{xpTotal === null ? "—" : `${xpTotal} XP`}</strong></div>
                <span className="journey-stat-caption">{xpTotal === null ? "regras pendentes" : "atividades válidas"}</span>
              </div>
            </div>
          </section>

          <section className="card">
            <CardHeading
              title="Hábitos de hoje"
              detail={`${summary.scheduled.length} ${summary.scheduled.length === 1 ? "hábito programado" : "hábitos programados"}`}
              action={
                <button
                  type="button"
                  className="button button-soft"
                  onClick={onAddHabit}
                  data-testid="button-add-habit-dashboard"
                >
                  <Plus aria-hidden="true" />
                  Adicionar
                </button>
              }
            />
            {hasCompletedToday && (
              <div className="daily-complete-banner" role="status" data-testid="text-day-complete">
                <span className="daily-complete-icon"><Sparkles aria-hidden="true" /></span>
                <span><strong>Você completou o plano de hoje.</strong><small>Um passo consistente faz diferença.</small></span>
              </div>
            )}
            {habits.length ? (
              <div className="habit-list">
                {habits.map((habit) => (
                  <div
                    className={`habit-row ${habit.dayStatus === "completed" ? "is-complete" : ""} ${celebratingHabitId === habit.id ? "just-completed" : ""}`}
                    key={habit.id}
                    data-testid={`row-today-habit-${habit.id}`}
                  >
                    <button
                      type="button"
                      className={`check-button ${habit.dayStatus === "completed" ? "done" : ""}`}
                      aria-label={habit.dayStatus === "completed" ? `Desmarcar ${habit.name}` : `Concluir ${habit.name}`}
                      onClick={() => toggleHabit(habit, habit.mainGoal ? "main" : undefined)}
                      data-testid={`button-toggle-habit-${habit.id}`}
                    >
                      {habit.dayStatus === "completed" && <Check aria-hidden="true" />}
                    </button>
                    <div className="habit-main">
                      <div className="habit-name">{habit.name}</div>
                      <div className="habit-desc">
                        {habit.dayStatus === "justified" ? habit.context
                          : habit.mainGoal || habit.minGoal
                            ? [
                                habit.mainGoal ? `Principal: ${habit.mainGoal.value} ${habit.mainGoal.unit}` : "",
                                habit.minGoal ? `Mínima: ${habit.minGoal.value} ${habit.minGoal.unit}` : "",
                              ].filter(Boolean).join(" · ")
                            : habit.description || habit.frequency}
                      </div>
                    </div>
                    <div className="habit-actions">
                      {celebratingHabitId === habit.id && (
                        <span className="completion-pop" aria-hidden="true">
                          <Star /> Boa!
                        </span>
                      )}
                      {habit.dayStatus === "justified" ? (
                        <StatusLabel tone="justified">Justificado</StatusLabel>
                      ) : habit.dayStatus === "neutral" ? (
                        <StatusLabel>Neutro</StatusLabel>
                      ) : (
                        <StatusLabel tone={habit.dayStatus === "completed" ? "complete" : "pending"}>
                          {habit.dayStatus === "completed"
                            ? habit.achievedLevel === "main"
                              ? "Meta principal"
                              : habit.achievedLevel === "min"
                                ? "Meta mínima"
                                : "Concluído"
                            : "Pendente"}
                        </StatusLabel>
                      )}
                      {habit.dayStatus !== "justified" && (
                        <button
                          type="button"
                          className="text-action"
                          onClick={() => onJustify(habit)}
                          data-testid={`button-justify-habit-${habit.id}`}
                        >
                          Justificar
                        </button>
                      )}
                      {habit.dayStatus === "pending" && habit.minGoal && (
                        <button
                          type="button"
                          className="text-action secondary-action"
                          onClick={() => toggleHabit(habit, "min")}
                          data-testid={`button-min-habit-${habit.id}`}
                        >
                          Só a mínima
                        </button>
                      )}
                      {habit.dayStatus === "pending" && (
                        <button
                          type="button"
                          className="text-action secondary-action"
                          onClick={() => onSetStatus(habit.id, "neutral")}
                          data-testid={`button-neutral-habit-${habit.id}`}
                        >
                          Neutro
                        </button>
                      )}
                      {habit.dayStatus === "neutral" && (
                        <button
                          type="button"
                          className="text-action secondary-action"
                          onClick={() => onSetStatus(habit.id, "pending")}
                          data-testid={`button-reactivate-habit-${habit.id}`}
                        >
                          Reativar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Leaf aria-hidden="true" />}
                title={summary.scheduled.length === 0 ? "Sem hábitos para hoje" : "Comece com um passo"}
                body={summary.scheduled.length === 0
                  ? "Hoje não há hábitos programados para sua rotina."
                  : "Adicione um hábito que faça sentido para você."}
                action={
                  summary.scheduled.length === 0 ? undefined : (
                    <button className="button button-primary" onClick={onAddHabit} data-testid="button-empty-add-habit">
                      <Plus aria-hidden="true" /> Criar primeiro hábito
                    </button>
                  )
                }
              />
            )}
          </section>
        </div>

        <div className="side-stack">
          <section className="level-panel" data-testid="panel-level">
            <div className="level-heading">
              <span className="level-title">Sua jornada</span>
              <span className="level-badge">Nível</span>
            </div>
            <div className="level-number">{level?.level ?? "—"}</div>
            <div className="level-note">
              {level
                ? level.title ?? "Seu progresso, no seu ritmo."
                : "A tabela de níveis original ainda não foi disponibilizada."}
            </div>
            {level && level.nextLevel !== null && (
              <>
                <div className="level-track" aria-label={`${level.xpIntoLevel} XP nesta faixa`}><span /></div>
                <div className="level-foot">
                  <span>{level.xpIntoLevel} XP nesta faixa</span>
                  <span>{level.xpToNextLevel} XP até o próximo nível</span>
                </div>
              </>
            )}
          </section>

          <section className="card">
            <CardHeading
              title="Revisão da semana"
              detail={`${week.completedDays}/${week.scheduledDays} dias ativos`}
            />
            <div className="week-report" data-testid="panel-week-report">
              <div className="week-report-stats">
                <div><strong>{week.totalCompleted}</strong><span>conclusões</span></div>
                <div><strong>{week.mainGoals}</strong><span>metas principais</span></div>
                <div><strong>{week.minGoals}</strong><span>metas mínimas</span></div>
              </div>
              <p className="week-suggestion">{week.suggestion}</p>
            </div>
          </section>

          <section className="card">
            <CardHeading
              title="Próximas conquistas"
              detail={`${unlockedCount} desbloqueadas`}
              action={<Link href="/achievements" className="tiny-link">Ver todas <ArrowRight aria-hidden="true" /></Link>}
            />
            {lockedAchievements.length ? (
              <div className="mini-achievements">
                {lockedAchievements.map((achievement) => (
                  <div className="mini-achievement" key={achievement.id}>
                    <span className="achievement-mark"><Award aria-hidden="true" /></span>
                    <div><strong>{achievement.name}</strong><span>{achievement.description}</span></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mini-empty" data-testid="text-achievements-empty">
                <div className="achievement-mark" style={{ margin: "0 auto 12px" }}><Trophy aria-hidden="true" /></div>
                O catálogo original de conquistas ainda não foi carregado.
              </div>
            )}
          </section>

          <section className="card">
            <CardHeading
              title="Metas financeiras"
              action={<Link href="/goals" className="tiny-link">Abrir metas <ArrowRight aria-hidden="true" /></Link>}
            />
            {goals.length ? (
              <div className="goal-summary-list">
                {goals.map((summary) => (
                  <div className="goal-summary-row" key={summary.goal.id}>
                    <div className="goal-summary-top"><strong>{summary.goal.name}</strong><span>{summary.percentComplete}%</span></div>
                    <div className="progress-track"><div className="progress-fill progress-blue" style={{ width: `${summary.percentComplete}%` }} /></div>
                    <span className="goal-summary-amount">
                      {formatMoneyForState(state, summary.contributedCents)} de {formatMoneyForState(state, summary.goal.targetCents)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mini-empty">
                <CircleDollarSign aria-hidden="true" />
                <span>Uma meta pode ajudar a acompanhar seus próximos passos.</span>
              </div>
            )}
          </section>

          <div className="daily-message" data-testid="text-contextual-message">
            <Sparkles aria-hidden="true" />
            <span>{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
