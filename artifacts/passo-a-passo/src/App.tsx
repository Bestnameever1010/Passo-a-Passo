import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import { useAppData } from "@/app/use-app-data";
import {
  getAllHabitViews,
  getContextualMessage,
  getGoalViews,
  getStreaks,
  getTodayHabits,
  getTodaySummary,
} from "@/app/view-models";
import type { HabitView } from "@/app/view-models";
import type { StateChangeResult } from "@/app/app-data-controller";
import type {
  AppState,
  GoalSummary,
  HabitStatus,
} from "@/domain/model";
import { buildXpLedger, getLevelProgress } from "@/domain/progression";
import { OFFICIAL_ACHIEVEMENTS, OFFICIAL_PROGRESSION_RULES } from "@/domain/official-rules";
import NotFound from "@/pages/not-found";
import {
  AchievementsPage,
  DashboardPage,
  GoalsPage,
  HabitsPage,
  HistoryPage,
  SettingsPage,
} from "@/pages/Pages";
import {
  Route,
  Switch,
  useLocation,
  Link,
  Router as WouterRouter,
} from "wouter";
import { toLocalDateKey } from "@/domain/dates";
import type { HabitInput } from "@/domain/habits";
import type { GoalInput } from "@/domain/finance";
import type { GoalContribution } from "@/domain/model";
import { ArrowUpFromLine, Award, Leaf, X } from "lucide-react";

type ModalState =
  | { kind: "habit"; initial?: HabitView }
  | { kind: "goal"; initial?: GoalSummary }
  | { kind: "contribution"; goal: GoalSummary }
  | { kind: "correction"; contribution: GoalContribution; currency: string }
  | { kind: "justification"; habit: HabitView }
  | null;

const achievementCatalog = OFFICIAL_ACHIEVEMENTS;
const progressionRules = OFFICIAL_PROGRESSION_RULES;

function Modal({
  state,
  onClose,
  onSaveHabit,
  onSaveGoal,
  onContribute,
  onCorrect,
  onJustify,
}: {
  state: ModalState;
  onClose: () => void;
  onSaveHabit: (input: HabitInput, initial?: HabitView) => StateChangeResult;
  onSaveGoal: (input: GoalInput, initial?: GoalSummary) => StateChangeResult;
  onContribute: (goalId: string, amountCents: number, note: string) => StateChangeResult;
  onCorrect: (contributionId: string, amountCents: number, note: string) => StateChangeResult;
  onJustify: (habitId: string, context: string) => StateChangeResult;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  if (!state) return null;

  const finish = (result: StateChangeResult) => {
    if (result.ok) onClose();
    else setFormError(result.error);
  };
  const submitHabit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const weekdays = form.getAll("weekdays").map(Number);
    if (weekdays.length === 0) {
      setFormError("Selecione ao menos um dia da semana.");
      return;
    }
    const mainValue = Number(form.get("mainGoalValue") ?? "");
    const mainUnit = String(form.get("mainGoalUnit") ?? "").trim();
    const minValue = Number(form.get("minGoalValue") ?? "");
    const minUnit = String(form.get("minGoalUnit") ?? "").trim();
    const mainGoal = Number.isFinite(mainValue) && mainValue > 0 && mainUnit
      ? { value: mainValue, unit: mainUnit }
      : undefined;
    const minGoal = Number.isFinite(minValue) && minValue > 0 && minUnit
      ? { value: minValue, unit: minUnit }
      : undefined;
    finish(onSaveHabit({
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      weekdays,
      mainGoal,
      minGoal,
    }, state.kind === "habit" ? state.initial : undefined));
  };
  const submitGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const target = Number(form.get("target"));
    if (!Number.isFinite(target) || target <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }
    finish(onSaveGoal({
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      targetCents: Math.round(target * 100),
    }, state.kind === "goal" ? state.initial : undefined));
  };
  const submitContribution = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Informe um valor de aporte maior que zero.");
      return;
    }
    finish(onContribute(
      state.kind === "contribution" ? state.goal.goal.id : "",
      Math.round(amount * 100),
      String(form.get("note") ?? ""),
    ));
  };
  const submitCorrection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Informe o valor corrigido em reais.");
      return;
    }
    finish(onCorrect(
      state.kind === "correction" ? state.contribution.id : "",
      Math.round(amount * 100),
      String(form.get("note") ?? ""),
    ));
  };
  const submitJustification = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    finish(onJustify(
      state.kind === "justification" ? state.habit.id : "",
      String(form.get("context") ?? ""),
    ));
  };

  const title = state.kind === "habit"
    ? state.initial ? "Editar hábito" : "Criar hábito"
    : state.kind === "goal"
      ? state.initial ? "Editar meta" : "Criar meta financeira"
      : state.kind === "contribution"
        ? `Aporte para ${state.goal.goal.name}`
        : state.kind === "correction"
          ? "Corrigir aporte"
          : `Justificar ${state.habit.name}`;
  const description = state.kind === "habit"
    ? "Escolha o nome e os dias em que este hábito faz parte da sua rotina."
    : state.kind === "goal"
      ? "Defina um objetivo e um valor em reais."
      : state.kind === "contribution"
        ? `Registre um aporte para a meta “${state.goal.goal.name}”.`
        : state.kind === "correction"
          ? "A correção preserva o valor anterior no histórico."
          : "A justificativa fica registrada e não gera XP.";

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button type="button" className="modal-close icon-button" onClick={onClose} aria-label="Fechar janela"><X aria-hidden="true" /></button>
        <h2 id="modal-title">{title}</h2>
        <p>{description}</p>
        {state.kind === "habit" && (
          <form className="form-grid" onSubmit={submitHabit}>
            <div className="field">
              <label htmlFor="habit-name">Nome do hábito</label>
              <input className="input" id="habit-name" name="name" required maxLength={80} defaultValue={state.initial?.name ?? ""} placeholder="Ex.: caminhar no parque" autoFocus data-testid="input-habit-name" />
            </div>
            <div className="field">
              <label htmlFor="habit-description">Descrição (opcional)</label>
              <textarea className="textarea" id="habit-description" name="description" maxLength={500} defaultValue={state.initial?.description ?? ""} placeholder="Um contexto para você lembrar depois" data-testid="input-habit-description" />
            </div>
            <fieldset className="field weekday-field">
              <legend>Dias da semana</legend>
              <div className="weekday-options">
                {[
                  ["0", "Dom"], ["1", "Seg"], ["2", "Ter"], ["3", "Qua"],
                  ["4", "Qui"], ["5", "Sex"], ["6", "Sáb"],
                ].map(([value, label]) => (
                  <label className="weekday-option" key={value}>
                    <input type="checkbox" name="weekdays" value={value} defaultChecked={state.initial ? state.initial.weekdays.includes(Number(value)) : true} data-testid={`input-habit-weekday-${value}`} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="goal-fields">
              <div className="field">
                <label htmlFor="habit-main-value">Meta principal (opcional)</label>
                <div className="goal-input-row">
                  <input className="input" id="habit-main-value" name="mainGoalValue" type="number" min="0" step="any" defaultValue={state.initial?.mainGoal?.value ?? ""} placeholder="30" data-testid="input-habit-main-value" />
                  <input className="input" name="mainGoalUnit" maxLength={40} defaultValue={state.initial?.mainGoal?.unit ?? ""} placeholder="min" data-testid="input-habit-main-unit" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="habit-min-value">Meta mínima (opcional)</label>
                <div className="goal-input-row">
                  <input className="input" id="habit-min-value" name="minGoalValue" type="number" min="0" step="any" defaultValue={state.initial?.minGoal?.value ?? ""} placeholder="5" data-testid="input-habit-min-value" />
                  <input className="input" name="minGoalUnit" maxLength={40} defaultValue={state.initial?.minGoal?.unit ?? ""} placeholder="min" data-testid="input-habit-min-unit" />
                </div>
                <span className="field-hint">A meta mínima é uma versão reduzida para dias difíceis.</span>
              </div>
            </div>
            <ModalActions onClose={onClose} submitLabel="Salvar hábito" />
          </form>
        )}
        {state.kind === "goal" && (
          <form className="form-grid" onSubmit={submitGoal}>
            <div className="field">
              <label htmlFor="goal-name">Nome da meta</label>
              <input className="input" id="goal-name" name="name" required maxLength={100} defaultValue={state.initial?.goal.name ?? ""} autoFocus data-testid="input-goal-name" />
            </div>
            <div className="field">
              <label htmlFor="goal-description">Descrição (opcional)</label>
              <textarea className="textarea" id="goal-description" name="description" maxLength={500} defaultValue={state.initial?.goal.description ?? ""} data-testid="input-goal-description" />
            </div>
            <div className="field">
              <label htmlFor="goal-target">Valor desejado (R$)</label>
              <input className="input" id="goal-target" name="target" type="number" min="0.01" step="0.01" required defaultValue={state.initial ? (state.initial.goal.targetCents / 100).toFixed(2) : ""} placeholder="0,00" data-testid="input-goal-target" />
            </div>
            <ModalActions onClose={onClose} submitLabel="Salvar meta" />
          </form>
        )}
        {state.kind === "contribution" && (
          <form className="form-grid" onSubmit={submitContribution}>
            <div className="field">
              <label htmlFor="contribution-amount">Valor do aporte (R$)</label>
              <input className="input" id="contribution-amount" name="amount" type="number" min="0.01" step="0.01" required autoFocus placeholder="0,00" data-testid="input-contribution-amount" />
            </div>
            <div className="field">
              <label htmlFor="contribution-note">Observação (opcional)</label>
              <input className="input" id="contribution-note" name="note" maxLength={500} data-testid="input-contribution-note" />
            </div>
            <ModalActions onClose={onClose} submitLabel="Registrar aporte" />
          </form>
        )}
        {state.kind === "correction" && (
          <form className="form-grid" onSubmit={submitCorrection}>
            <div className="field">
              <label htmlFor="correction-amount">Valor corrigido (R$)</label>
              <input className="input" id="correction-amount" name="amount" type="number" min="0.01" step="0.01" required defaultValue={(state.contribution.amountCents / 100).toFixed(2)} autoFocus data-testid="input-correction-amount" />
            </div>
            <div className="field">
              <label htmlFor="correction-note">Motivo da correção (opcional)</label>
              <textarea className="textarea" id="correction-note" name="note" maxLength={500} data-testid="input-correction-note" />
            </div>
            <ModalActions onClose={onClose} submitLabel="Salvar correção" />
          </form>
        )}
        {state.kind === "justification" && (
          <form className="form-grid" onSubmit={submitJustification}>
            <div className="field">
              <label htmlFor="justification-context">Contexto da justificativa</label>
              <textarea className="textarea" id="justification-context" name="context" required maxLength={2000} minLength={1} autoFocus data-testid="input-justification-context" />
              <span className="field-hint">Até duas justificativas em uma janela móvel de sete dias. Justificar não concede XP.</span>
            </div>
            <ModalActions onClose={onClose} submitLabel="Salvar justificativa" />
          </form>
        )}
        {formError && <p className="inline-message error-message" role="alert" data-testid="text-form-error">{formError}</p>}
      </section>
    </div>
  );
}

function ModalActions({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) {
  return (
    <div className="modal-actions">
      <button type="button" className="button button-quiet" onClick={onClose} data-testid="button-cancel-modal">Cancelar</button>
      <button className="button button-primary" type="submit" data-testid="button-save-modal">{submitLabel}</button>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const { state, error, controller, newlyUnlockedAchievementIds } = useAppData();
  const [modal, setModal] = useState<ModalState>(null);
  const today = toLocalDateKey();

  useEffect(() => {
    if (!state) return;
    document.documentElement.classList.toggle("dark", state.preferences.theme === "dark");
    document.documentElement.classList.toggle("reduce-motion", state.preferences.reducedMotion);
    document.documentElement.lang = "pt-BR";
  }, [state?.preferences.theme, state?.preferences.reducedMotion, state]);

  const allHabits = useMemo(
    () => state ? getAllHabitViews(state, today) : [],
    [state, today],
  );
  const todayHabits = useMemo(
    () => state ? getTodayHabits(state, today) : [],
    [state, today],
  );
  const goals = useMemo(
    () => state ? getGoalViews(state) : [],
    [state],
  );
  const dailySummary = state ? getTodaySummary(state, today) : null;
  const streaks = state ? getStreaks(state, today) : null;
  const message = state ? getContextualMessage(state, today) : "";
  const progression = state && progressionRules
    ? buildXpLedger(state, progressionRules)
    : null;
  const xpTotal = progression
    ? progression.reduce((total, entry) => total + entry.amountXp, 0)
    : null;
  const level = xpTotal !== null && progressionRules
    ? getLevelProgress(xpTotal, progressionRules.levels)
    : null;

  const saveHabit = (input: HabitInput, initial?: HabitView): StateChangeResult =>
    initial
      ? controller.updateHabit(initial.id, input, today)
      : controller.createHabit(input, today);
  const setHabitStatus = (habitId: string, status: HabitStatus, context?: string, level?: "main" | "min") =>
    controller.setHabitStatus(habitId, today, status, context, level);
  const pauseHabit = (habitId: string, paused: boolean) =>
    controller.setHabitPaused(habitId, paused, today);
  const deleteHabit = (habit: HabitView) => {
    if (window.confirm(`Excluir “${habit.name}” da rotina? O histórico anterior será preservado.`)) {
      controller.deleteHabit(habit.id, today);
    }
  };
  const saveGoal = (input: GoalInput, initial?: GoalSummary) =>
    initial
      ? controller.updateGoal(initial.goal.id, input)
      : controller.createGoal(input, today);
  const addContribution = (goalId: string, amountCents: number, note: string) =>
    controller.addContribution({ goalId, amountCents, note, date: today });
  const correctContribution = (contributionId: string, amountCents: number, note: string) =>
    controller.correctContribution(contributionId, amountCents, note);
  const archiveGoal = (goal: GoalSummary) => {
    if (window.confirm(`Arquivar a meta “${goal.goal.name}”? Os aportes e o histórico serão preservados.`)) {
      controller.archiveGoal(goal.goal.id, today);
    }
  };
  const exportBackup = () => {
    try {
      const blob = new Blob([controller.exportBackup()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `passo-a-passo-backup-${today}.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (exportError) {
      window.alert(exportError instanceof Error ? exportError.message : "Não foi possível exportar o backup.");
    }
  };
  const importBackup = async (file: File): Promise<string | null> => {
    if (state && hasSavedData(state) && !window.confirm("Restaurar este backup substituirá os dados atuais deste dispositivo. Deseja continuar?")) {
      return "Importação cancelada.";
    }
    try {
      const result = controller.importBackup(await file.text());
      return result.ok ? null : result.error;
    } catch (importError) {
      return importError instanceof Error ? importError.message : "Não foi possível ler o arquivo.";
    }
  };
  const clearData = () => {
    if (window.confirm("Apagar todos os hábitos, registros, metas e preferências deste dispositivo? Esta ação não pode ser desfeita sem um backup.")) {
      controller.clearAllData();
    }
  };

  if (!state) {
    return (
      <RecoveryScreen
        error={error}
        onImport={importBackup}
        onClear={() => {
          if (window.confirm("Remover os dados locais corrompidos? Faça isso apenas se não tiver um backup para restaurar.")) {
            controller.clearAllData();
          }
        }}
      />
    );
  }

  return (
    <ErrorBoundary resetKey={location}>
      <AppShell>
        {error && (
          <div className="global-error" role="alert" data-testid="status-storage-error">
            <span>{error}</span>
            <button type="button" className="icon-button" onClick={() => controller.load()} aria-label="Tentar novamente"><ArrowUpFromLine aria-hidden="true" /></button>
          </div>
        )}
        {newlyUnlockedAchievementIds.length > 0 && (
          <div className="achievement-announcement" role="status" data-testid="announcement-achievement">
            <span className="achievement-announcement-icon"><Award aria-hidden="true" /></span>
            <span className="achievement-announcement-copy">
              <strong>{newlyUnlockedAchievementIds.length === 1 ? "Conquista desbloqueada" : "Conquistas desbloqueadas"}</strong>
              <small>{newlyUnlockedAchievementIds.map((id) => achievementCatalog.find((item) => item.id === id)?.name ?? id).join(", ")}</small>
            </span>
            <Link href="/achievements" className="achievement-announcement-link">Ver conquistas</Link>
            <button type="button" className="icon-button" onClick={() => controller.dismissAchievementNotifications()} aria-label="Dispensar aviso"><X aria-hidden="true" /></button>
          </div>
        )}
        <Switch>
          <Route path="/" component={() => (
            <DashboardPage
              state={state}
              today={today}
              habits={todayHabits}
              summary={dailySummary!}
              streaks={streaks!}
              goals={goals}
              message={message}
              level={level}
              xpTotal={xpTotal}
              achievements={achievementCatalog}
              onAddHabit={() => setModal({ kind: "habit" })}
              onSetStatus={(id, status, level) => setHabitStatus(id, status, undefined, level)}
              onJustify={(habit) => setModal({ kind: "justification", habit })}
            />
          )} />
          <Route path="/habits" component={() => (
            <HabitsPage
              habits={allHabits}
              onAddHabit={() => setModal({ kind: "habit" })}
              onEditHabit={(habit) => setModal({ kind: "habit", initial: habit })}
              onSetStatus={(id, status, level) => setHabitStatus(id, status, undefined, level)}
              onJustify={(habit) => setModal({ kind: "justification", habit })}
              onPauseHabit={pauseHabit}
              onDeleteHabit={deleteHabit}
            />
          )} />
          <Route path="/history" component={() => <HistoryPage state={state} />} />
          <Route path="/achievements" component={() => <AchievementsPage state={state} catalog={achievementCatalog} />} />
          <Route path="/goals" component={() => (
            <GoalsPage
              state={state}
              goals={goals}
              onCreateGoal={() => setModal({ kind: "goal" })}
              onEditGoal={(goal) => setModal({ kind: "goal", initial: goal })}
              onAddContribution={(goal) => setModal({ kind: "contribution", goal })}
              onCorrectContribution={(goal, id) => {
                const contribution = goal.contributions.find((item) => item.id === id);
                if (contribution) setModal({ kind: "correction", contribution, currency: state.preferences.currency });
              }}
              onArchiveGoal={archiveGoal}
            />
          )} />
          <Route path="/settings" component={() => (
            <SettingsPage
              preferences={state.preferences}
              error={error}
              onUpdate={(patch) => { controller.updatePreferences(patch); }}
              onExport={exportBackup}
              onImport={importBackup}
              onClearData={clearData}
            />
          )} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
      <Modal
        state={modal}
        onClose={() => setModal(null)}
        onSaveHabit={saveHabit}
        onSaveGoal={saveGoal}
        onContribute={addContribution}
        onCorrect={correctContribution}
        onJustify={(habitId, context) => setHabitStatus(habitId, "justified", context)}
      />
    </ErrorBoundary>
  );
}

function RecoveryScreen({
  error,
  onImport,
  onClear,
}: {
  error: string | null;
  onImport: (file: File) => Promise<string | null>;
  onClear: () => void;
}) {
  const [message, setMessage] = useState(error);
  const restore = async (file?: File) => {
    if (!file) return;
    const result = await onImport(file);
    setMessage(result ?? "Backup restaurado e validado.");
  };
  return (
    <main className="recovery-screen">
      <div className="recovery-card">
        <span className="brand-mark"><Leaf aria-hidden="true" /></span>
        <h1>Não foi possível carregar os dados</h1>
        <p>Os dados salvos não foram substituídos. Você pode restaurar um backup válido ou remover o armazenamento local.</p>
        {message && <p role="alert" className="inline-message error-message">{message}</p>}
        <label className="button button-primary" htmlFor="recovery-file">
          Restaurar backup JSON
          <input id="recovery-file" type="file" accept="application/json,.json" hidden onChange={(event) => void restore(event.target.files?.[0])} />
        </label>
        <button type="button" className="button button-danger" onClick={onClear}>Remover dados locais</button>
      </div>
    </main>
  );
}

function hasSavedData(state: AppState): boolean {
  return state.habits.length > 0 ||
    state.habitDays.length > 0 ||
    state.goals.length > 0 ||
    state.contributions.length > 0 ||
    state.achievementUnlocks.length > 0;
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
