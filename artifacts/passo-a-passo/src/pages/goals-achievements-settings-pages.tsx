import { useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  Award,
  Check,
  CircleDollarSign,
  Edit3,
  Leaf,
  Plus,
  ShieldCheck,
  Trash2,
  Trophy,
} from "lucide-react";
import { formatLocalDate, formatMoneyForState } from "@/app/view-models";
import type { AppPreferences, AchievementDefinition, AppState, GoalSummary } from "@/domain/model";
import { CardHeading, EmptyState, PageHeading, StatusLabel } from "./common";

export function AchievementsPage({
  state,
  catalog,
}: {
  state: AppState;
  catalog: AchievementDefinition[];
}) {
  const unlocked = new Map(state.achievementUnlocks.map((item) => [item.achievementId, item]));
  const entries = catalog.map((achievement) => ({
    achievement,
    unlock: unlocked.get(achievement.id),
  }));
  const unlockedCount = entries.filter((entry) => entry.unlock).length;

  return (
    <div className="content fade-up">
      <PageHeading
        eyebrow="Pequenas conquistas"
        title="Conquistas"
        subtitle="Marcos reconhecem o caminho que você percorre, no seu tempo."
      />
      <section className="card page-card">
        <CardHeading title="Seu catálogo" detail={`${unlockedCount} de ${entries.length} desbloqueadas`} />
        {entries.length ? (
          <div className="catalog-grid">
            {entries.map(({ achievement, unlock }) => (
              <article
                className={`achievement-card ${unlock ? "unlocked" : "locked"}`}
                key={achievement.id}
                data-testid={`card-achievement-${achievement.id}`}
              >
                <div className="achievement-top">
                  <span className="achievement-mark">{unlock ? <Award aria-hidden="true" /> : <Trophy aria-hidden="true" />}</span>
                  <StatusLabel tone={unlock ? "complete" : "pending"}>{unlock ? "Desbloqueada" : "Bloqueada"}</StatusLabel>
                </div>
                <h3>{achievement.name}</h3>
                <p>{achievement.description}</p>
                {unlock ? (
                  <span className="achievement-date">Desbloqueada em {formatLocalDate(unlock.unlockedOn, { day: "numeric", month: "long", year: "numeric" })}</span>
                ) : (
                  <span className="achievement-reward">Recompensa: {achievement.rewardXp} XP</span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Trophy aria-hidden="true" />}
            title="O catálogo oficial ainda não está disponível"
            body="Os critérios e recompensas dependem da especificação original. Nenhuma conquista ou recompensa fictícia foi adicionada."
          />
        )}
      </section>
    </div>
  );
}

export function GoalsPage({
  state,
  goals,
  onCreateGoal,
  onEditGoal,
  onAddContribution,
  onCorrectContribution,
  onArchiveGoal,
}: {
  state: AppState;
  goals: GoalSummary[];
  onCreateGoal: () => void;
  onEditGoal: (goal: GoalSummary) => void;
  onAddContribution: (goal: GoalSummary) => void;
  onCorrectContribution: (goal: GoalSummary, contributionId: string) => void;
  onArchiveGoal: (goal: GoalSummary) => void;
}) {
  const inProgress = goals.filter((summary) => !summary.isComplete);
  const completed = goals.filter((summary) => summary.isComplete);

  return (
    <div className="content fade-up">
      <PageHeading
        eyebrow="Seu futuro, no seu ritmo"
        title="Metas financeiras"
        subtitle="Acompanhe valores e aportes sem misturá-los ao seu progresso em XP."
        action={<button className="button button-primary" onClick={onCreateGoal} data-testid="button-create-goal"><Plus aria-hidden="true" /> Criar meta</button>}
      />
      {!goals.length ? (
        <section className="card">
          <EmptyState
            icon={<CircleDollarSign aria-hidden="true" />}
            title="Dê um propósito a uma meta"
            body="Defina o valor desejado e registre aportes em centavos. O saldo e o percentual serão calculados pelos seus lançamentos."
            action={<button className="button button-primary" onClick={onCreateGoal} data-testid="button-empty-create-goal"><Plus aria-hidden="true" /> Criar primeira meta</button>}
          />
        </section>
      ) : (
        <>
          {inProgress.length > 0 && (
            <section className="goal-section">
              <h2 className="section-title">Em andamento</h2>
              <div className="goal-cards">
                {inProgress.map((summary) => (
                  <GoalCard
                    key={summary.goal.id}
                    state={state}
                    summary={summary}
                    onEdit={() => onEditGoal(summary)}
                    onContribute={() => onAddContribution(summary)}
                    onCorrect={(id) => onCorrectContribution(summary, id)}
                    onArchive={() => onArchiveGoal(summary)}
                  />
                ))}
              </div>
            </section>
          )}
          {completed.length > 0 && (
            <section className="goal-section">
              <h2 className="section-title">Concluídas</h2>
              <div className="goal-cards">
                {completed.map((summary) => (
                  <GoalCard
                    key={summary.goal.id}
                    state={state}
                    summary={summary}
                    onEdit={() => onEditGoal(summary)}
                    onContribute={() => onAddContribution(summary)}
                    onCorrect={(id) => onCorrectContribution(summary, id)}
                    onArchive={() => onArchiveGoal(summary)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function GoalCard({
  state,
  summary,
  onEdit,
  onContribute,
  onCorrect,
  onArchive,
}: {
  state: AppState;
  summary: GoalSummary;
  onEdit: () => void;
  onContribute: () => void;
  onCorrect: (id: string) => void;
  onArchive: () => void;
}) {
  return (
    <article className="card goal-card" data-testid={`card-goal-${summary.goal.id}`}>
      <div className="goal-card-heading">
        <div>
          <div className="eyebrow">{summary.isComplete ? "Meta concluída" : "Meta em andamento"}</div>
          <h2 className="card-title">{summary.goal.name}</h2>
          {summary.goal.description && <p className="goal-description">{summary.goal.description}</p>}
        </div>
        {summary.isComplete && <StatusLabel tone="complete"><Check aria-hidden="true" /> Concluída</StatusLabel>}
      </div>
      <div className="goal-total">
        {formatMoneyForState(state, summary.contributedCents)}
        <span> de {formatMoneyForState(state, summary.goal.targetCents)}</span>
      </div>
      <div className="goal-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.percentComplete} aria-label={`${summary.percentComplete}% da meta`}>
        <span style={{ width: `${summary.percentComplete}%` }} />
      </div>
      <div className="goal-progress-caption">
        <span>{summary.percentComplete}% da meta</span>
        <span>{formatMoneyForState(state, summary.remainingCents)} restantes</span>
      </div>
      <div className="goal-actions">
        <button type="button" className="button button-primary" onClick={onContribute} data-testid={`button-add-contribution-${summary.goal.id}`}><Plus aria-hidden="true" /> Registrar aporte</button>
        <button type="button" className="button button-soft" onClick={onEdit} data-testid={`button-edit-goal-${summary.goal.id}`}><Edit3 aria-hidden="true" /> Editar meta</button>
        <button type="button" className="icon-button" onClick={onArchive} aria-label={`Arquivar meta ${summary.goal.name}`} data-testid={`button-archive-goal-${summary.goal.id}`}><Archive aria-hidden="true" /></button>
      </div>
      <div className="goal-contributions">
        <CardHeading title="Movimentações" detail={`${summary.contributions.length} ${summary.contributions.length === 1 ? "aporte" : "aportes"}`} />
        {summary.contributions.length ? (
          <div className="transaction-list">
            {summary.contributions.slice().reverse().map((contribution) => (
              <div className="transaction-row" key={contribution.id} data-testid={`row-contribution-${contribution.id}`}>
                <div className="transaction-copy">
                  <strong>{contribution.note || "Aporte"}</strong>
                  <span>{formatLocalDate(contribution.date, { day: "numeric", month: "short", year: "numeric" })}</span>
                  {contribution.revisions.map((revision, index) => (
                    <small key={`${contribution.id}:${index}`} className="correction-note">
                      Corrigido de {formatMoneyForState(state, revision.previousAmountCents)} · {revision.note || formatLocalDate(revision.correctedAt.slice(0, 10))}
                    </small>
                  ))}
                </div>
                <div className="transaction-end">
                  <div className="transaction-amount">{formatMoneyForState(state, contribution.amountCents)}</div>
                  <button type="button" className="text-action" onClick={() => onCorrect(contribution.id)} data-testid={`button-correct-contribution-${contribution.id}`}>Corrigir</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mini-empty">Ainda não há aportes nesta meta.</div>
        )}
      </div>
    </article>
  );
}

export function SettingsPage({
  preferences,
  error,
  onUpdate,
  onExport,
  onImport,
  onClearData,
}: {
  preferences: AppPreferences;
  error: string | null;
  onUpdate: (preferences: Partial<AppPreferences>) => void;
  onExport: () => void;
  onImport: (file: File) => Promise<string | null>;
  onClearData: () => void;
}) {
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const readBackup = async (file?: File) => {
    setImportMessage(null);
    setImportError(null);
    if (!file) return;
    const result = await onImport(file);
    if (result) {
      setImportError(result);
    } else {
      setImportMessage("Backup validado e restaurado.");
    }
  };

  return (
    <div className="content fade-up">
      <PageHeading
        eyebrow="Do seu jeito"
        title="Configurações"
        subtitle="Personalize a aparência e mantenha seus dados sob seu controle."
      />
      <section className="card page-card">
        <CardHeading title="Aparência" detail="Ajuste o aplicativo ao seu conforto" />
        <div className="setting-section">
          <div><h3>Tema</h3><p>Escolha entre o tema claro e o escuro.</p></div>
          <div className="theme-options" role="group" aria-label="Tema">
            {(["light", "dark"] as const).map((theme) => (
              <button
                type="button"
                key={theme}
                onClick={() => onUpdate({ theme })}
                className={`theme-option ${preferences.theme === theme ? "active" : ""}`}
                aria-pressed={preferences.theme === theme}
                data-testid={`button-theme-${theme}`}
              >
                {theme === "light" ? "Claro" : "Escuro"}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-section">
          <div><h3>Movimento reduzido</h3><p>Reduza animações e transições da interface.</p></div>
          <label className="preference-toggle">
            <input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => onUpdate({ reducedMotion: event.target.checked })} data-testid="input-reduced-motion" />
            <span>{preferences.reducedMotion ? "Ativado" : "Desativado"}</span>
          </label>
        </div>
        <div className="setting-section">
          <div><h3>Início da semana</h3><p>Escolha como o calendário organiza os dias.</p></div>
          <select className="select compact-select" value={preferences.weekStartsOn} onChange={(event) => onUpdate({ weekStartsOn: Number(event.target.value) as 0 | 1 })} aria-label="Início da semana" data-testid="select-week-start">
            <option value={1}>Segunda-feira</option>
            <option value={0}>Domingo</option>
          </select>
        </div>
      </section>

      <section className="card page-card">
        <CardHeading title="Gerenciamento de dados" detail="Os dados do aplicativo ficam no armazenamento local deste dispositivo" />
        <div className="setting-section">
          <div><h3>Exportar backup</h3><p>Baixe seus hábitos, registros, metas e preferências em JSON.</p></div>
          <button type="button" className="button button-soft" onClick={onExport} data-testid="button-export-backup"><ArrowDownToLine aria-hidden="true" /> Exportar JSON</button>
        </div>
        <div className="setting-section">
          <div><h3>Restaurar backup</h3><p>O arquivo será validado antes de substituir os dados atuais.</p></div>
          <label className="button button-soft" htmlFor="backup-file" data-testid="label-import-backup">
            Escolher arquivo
            <input id="backup-file" type="file" accept="application/json,.json" hidden onChange={(event) => void readBackup(event.target.files?.[0])} data-testid="input-import-backup" />
          </label>
        </div>
        {importMessage && <p className="inline-message success-message" role="status">{importMessage}</p>}
        {(importError || error) && <p className="inline-message error-message" role="alert">{importError || error}</p>}
        <div className="setting-section danger-section">
          <div><h3>Apagar dados deste dispositivo</h3><p>Esta ação remove os dados locais do Passo a Passo após confirmação.</p></div>
          <button type="button" className="button button-danger" onClick={onClearData} data-testid="button-clear-data"><Trash2 aria-hidden="true" /> Apagar dados</button>
        </div>
      </section>

      <section className="card page-card">
        <CardHeading title="Sobre o aplicativo" />
        <div className="setting-section">
          <div><h3>Progresso com intenção</h3><p>O Passo a Passo organiza hábitos, histórico e metas financeiras em um só lugar.</p></div>
          <span className="brand-mark"><Leaf size={18} aria-hidden="true" /></span>
        </div>
        <div className="setting-section">
          <div><h3>Uso offline</h3><p>As funcionalidades essenciais não dependem da API.</p></div>
          <span className="offline-chip"><span className="offline-dot" /> Local</span>
        </div>
        <div className="setting-section">
          <div><h3>Privacidade</h3><p>Seus registros permanecem no armazenamento deste navegador. Exporte um backup antes de trocar de dispositivo.</p></div>
          <ShieldCheck aria-hidden="true" className="setting-icon" />
        </div>
      </section>
    </div>
  );
}
