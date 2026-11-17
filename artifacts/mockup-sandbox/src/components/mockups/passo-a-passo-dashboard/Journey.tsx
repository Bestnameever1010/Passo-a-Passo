import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Check,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Flame,
  Leaf,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import "./_group.css";
import "./Journey.css";

type Habit = {
  id: string;
  name: string;
  note: string;
  completed: boolean;
};

type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
};

type LocalData = { habits: Habit[]; goals: Goal[] };
type DialogState = { kind: "habit" } | { kind: "goal"; goal?: Goal } | null;
const STORAGE_KEY = "passo-a-passo-journey-v1";

function readLocalData(): LocalData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { habits: [], goals: [] };
    const parsed = JSON.parse(saved) as Partial<LocalData>;
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    };
  } catch {
    return { habits: [], goals: [] };
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function greetingLabel() {
  const hour = new Date().getHours();
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const items = [
    { href: "#journey-today", label: "Hoje", icon: Compass },
    { href: "#journey-habits", label: "Hábitos", icon: Leaf },
    { href: "#journey-achievements", label: "Conquistas", icon: Award },
    { href: "#journey-goals", label: "Metas", icon: CircleDollarSign },
  ];
  return (
    <nav className={mobile ? "journey-mobile-nav" : "journey-nav"} aria-label="Navegação principal">
      {items.map(({ href, label, icon: Icon }, index) => (
        <a
          className={`journey-nav-item ${index === 0 ? "is-current" : ""}`}
          href={href}
          key={href}
          aria-current={index === 0 ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

function SectionTitle({
  title,
  note,
  action,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="journey-section-heading">
      <div>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="journey-empty">
      <span className="journey-empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Journey() {
  const [data, setData] = useState<LocalData>(() => readLocalData());
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState("");
  const [activeHabit, setActiveHabit] = useState("");
  const noticeTimer = useRef<number | undefined>(undefined);
  const habitNameRef = useRef<HTMLInputElement>(null);
  const completed = useMemo(() => data.habits.filter((habit) => habit.completed).length, [data.habits]);
  const completion = data.habits.length ? Math.round((completed / data.habits.length) * 100) : 0;
  const message = data.habits.length === 0
    ? "Seu próximo passo começa do jeito que você escolher."
    : completed === data.habits.length
      ? "Você fez sua parte por hoje. Pequenos passos viram caminhos."
      : completed > 0
        ? "Um passo já aconteceu. O resto pode esperar o seu ritmo."
        : "Escolha um passo pequeno para começar.";

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // The prototype continues to work in memory if local storage is unavailable.
    }
  }, [data]);

  useEffect(() => {
    if (!dialog) return;
    const timer = window.setTimeout(() => {
      if (dialog.kind === "habit") habitNameRef.current?.focus();
      else document.getElementById("journey-goal-name")?.focus();
    }, 40);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dialog]);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  function showNotice(text: string) {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2800);
  }

  function toggleHabit(id: string) {
    const habit = data.habits.find((item) => item.id === id);
    if (!habit) return;
    const nextCompleted = !habit.completed;
    setData((current) => ({
      ...current,
      habits: current.habits.map((item) => item.id === id ? { ...item, completed: !item.completed } : item),
    }));
    setActiveHabit(id);
    window.setTimeout(() => setActiveHabit(""), 500);
    if (nextCompleted) showNotice("Mais um passo no seu ritmo. Muito bem.");
  }

  function saveHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    if (!name) return;
    setData((current) => ({
      ...current,
      habits: [...current.habits, { id: crypto.randomUUID(), name, note, completed: false }],
    }));
    setDialog(null);
    showNotice("Seu hábito já tem um lugar na jornada.");
  }

  function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const target = Number(formData.get("target"));
    const saved = Number(formData.get("saved") || 0);
    if (!name || !Number.isFinite(target) || target <= 0 || !Number.isFinite(saved) || saved < 0 || saved > target) return;
    const existing = dialog?.kind === "goal" ? dialog.goal : undefined;
    if (existing) {
      setData((current) => ({
        ...current,
        goals: current.goals.map((goal) => goal.id === existing.id ? { ...goal, name, target, saved } : goal),
      }));
      showNotice("Meta atualizada com os valores que você informou.");
    } else {
      setData((current) => ({
        ...current,
        goals: [...current.goals, { id: crypto.randomUUID(), name, target, saved }],
      }));
      showNotice("Sua meta entrou no mapa.");
    }
    setDialog(null);
  }

  function removeHabit(id: string) {
    setData((current) => ({ ...current, habits: current.habits.filter((habit) => habit.id !== id) }));
    showNotice("Hábito removido da sua lista.");
  }

  function removeGoal(id: string) {
    setData((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== id) }));
    showNotice("Meta removida.");
  }

  return (
    <div className="journey">
      <aside className="journey-sidebar">
        <a className="journey-brand" href="#journey-today" aria-label="Passo a Passo, início">
          <span className="journey-brand-mark"><Leaf aria-hidden="true" /></span>
          <span><strong>Passo a Passo</strong><small>um dia de cada vez</small></span>
        </a>
        <div className="journey-sidebar-caption">Seu espaço</div>
        <Navigation />
        <div className="journey-offline">
          <span className="journey-online-dot" />
          <div><strong>Seu espaço, sempre por perto</strong><span>Seus dados ficam neste dispositivo.</span></div>
        </div>
      </aside>

      <main className="journey-main" id="journey-today">
        <header className="journey-topbar">
          <div className="journey-breadcrumb"><span>Seu espaço</span><ChevronRight aria-hidden="true" /><strong>Hoje</strong></div>
          <div className="journey-top-date"><span className="journey-date-dot" />{new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</div>
        </header>

        <div className="journey-content">
          <section className="journey-welcome">
            <div className="journey-welcome-orbit" aria-hidden="true"><span /><span /><span /></div>
            <div className="journey-welcome-text">
              <div className="journey-eyebrow">{greetingLabel()} <span>·</span> hoje é um bom começo</div>
              <h1>Um passo de<br className="journey-mobile-break" /> cada vez.</h1>
              <p>{message}</p>
            </div>
            <div className="journey-date-card">
              <span>SEU DIA</span>
              <strong>{todayLabel()}</strong>
            </div>
            <div className="journey-sun-disc" aria-hidden="true"><span /></div>
          </section>

          <section className="journey-progress-card" aria-label="Resumo do seu progresso">
            <div className="journey-progress-main">
              <div className="journey-progress-copy">
                <span className="journey-overline">O caminho de hoje</span>
                <strong>{data.habits.length ? `${completed} de ${data.habits.length}` : "Seu primeiro passo"}</strong>
                <span>{data.habits.length ? "hábitos concluídos" : "começa quando você quiser"}</span>
              </div>
              <div className={`journey-progress-ring ${data.habits.length && completion === 100 ? "is-complete" : ""}`} style={{ "--progress": `${completion}%` } as React.CSSProperties}>
                <span>{data.habits.length ? `${completion}%` : <Leaf aria-hidden="true" />}</span>
              </div>
            </div>
            <div className="journey-progress-track" role="progressbar" aria-label="Progresso dos hábitos de hoje" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
              <span style={{ width: `${completion}%` }} />
            </div>
            <div className="journey-stat-row">
              <div className="journey-stat">
                <span className="journey-stat-icon streak"><Flame aria-hidden="true" /></span>
                <div><small>Sequência</small><strong>—</strong></div>
                <span className="journey-stat-caption">em breve</span>
              </div>
              <div className="journey-stat">
                <span className="journey-stat-icon xp"><Sparkles aria-hidden="true" /></span>
                <div><small>Experiência</small><strong>—</strong></div>
                <span className="journey-stat-caption">regras pendentes</span>
              </div>
            </div>
          </section>

          <div className="journey-layout">
            <section className="journey-panel journey-habits-panel" id="journey-habits">
              <SectionTitle
                title="Hábitos de hoje"
                note={data.habits.length ? `${data.habits.length} ${data.habits.length === 1 ? "passo escolhido" : "passos escolhidos"}` : "Sua rotina começa com o que importa para você"}
                action={<button className="journey-add-button" type="button" onClick={() => setDialog({ kind: "habit" })}><Plus aria-hidden="true" /><span>Novo hábito</span></button>}
              />
              {data.habits.length ? (
                <div className="journey-habit-list">
                  {data.habits.map((habit) => (
                    <article className={`journey-habit ${habit.completed ? "is-done" : ""} ${activeHabit === habit.id ? "just-toggled" : ""}`} key={habit.id}>
                      <button
                        className="journey-check"
                        type="button"
                        aria-label={habit.completed ? `Desmarcar ${habit.name}` : `Concluir ${habit.name}`}
                        aria-pressed={habit.completed}
                        onClick={() => toggleHabit(habit.id)}
                      >
                        {habit.completed && <Check aria-hidden="true" />}
                      </button>
                      <div className="journey-habit-copy">
                        <strong>{habit.name}</strong>
                        <span>{habit.note || (habit.completed ? "Feito no seu tempo" : "Um passo de cada vez")}</span>
                      </div>
                      <span className={`journey-status ${habit.completed ? "done" : ""}`}>{habit.completed ? "Concluído" : "No seu ritmo"}</span>
                      <button className="journey-icon-button" type="button" aria-label={`Remover ${habit.name}`} onClick={() => removeHabit(habit.id)}><Trash2 aria-hidden="true" /></button>
                    </article>
                  ))}
                  <button className="journey-add-inline" type="button" onClick={() => setDialog({ kind: "habit" })}><Plus aria-hidden="true" /> Mais um hábito</button>
                </div>
              ) : (
                <EmptyPanel
                  icon={<Leaf aria-hidden="true" />}
                  title="Ainda não há hábitos para hoje"
                  body="Escolha uma ação pequena que faça sentido para você. Ela pode ser o começo de uma rotina."
                  action={<button className="journey-primary-button" type="button" onClick={() => setDialog({ kind: "habit" })}><Plus aria-hidden="true" /> Criar meu primeiro hábito</button>}
                />
              )}
            </section>

            <div className="journey-aside">
              <section className="journey-level-card">
                <div className="journey-level-decoration" aria-hidden="true" />
                <div className="journey-card-topline"><span>Sua jornada</span><span className="journey-level-tag">NÍVEL</span></div>
                <div className="journey-level-number">—</div>
                <div className="journey-level-caption">Cada passo conta. A tabela oficial de níveis ainda está pendente.</div>
                <div className="journey-level-track" aria-hidden="true"><span /></div>
                <div className="journey-level-foot"><span>Progresso da jornada</span><span>aguardando regras</span></div>
              </section>

              <section className="journey-panel" id="journey-achievements">
                <SectionTitle title="Próximas conquistas" note="Um motivo a mais para continuar" />
                <EmptyPanel
                  icon={<Trophy aria-hidden="true" />}
                  title="O mapa ainda está sendo desenhado"
                  body="O catálogo oficial de conquistas ainda não foi disponibilizado."
                />
                <div className="journey-pending-note"><span><Award aria-hidden="true" /></span>Conquistas pendentes do catálogo oficial</div>
              </section>

              <section className="journey-panel journey-goals-panel" id="journey-goals">
                <SectionTitle
                  title="Metas financeiras"
                  note={data.goals.length ? "Seu plano, no seu ritmo" : undefined}
                  action={<button className="journey-round-add" type="button" aria-label="Adicionar meta financeira" onClick={() => setDialog({ kind: "goal" })}><Plus aria-hidden="true" /></button>}
                />
                {data.goals.length ? (
                  <div className="journey-goal-list">
                    {data.goals.map((goal) => {
                      const percent = Math.min(100, Math.round((goal.saved / goal.target) * 100));
                      return (
                        <article className="journey-goal" key={goal.id}>
                          <div className="journey-goal-icon"><Target aria-hidden="true" /></div>
                          <div className="journey-goal-content">
                            <div className="journey-goal-head"><strong>{goal.name}</strong><span>{percent}%</span></div>
                            <div className="journey-goal-track" role="progressbar" aria-label={`Progresso da meta ${goal.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div>
                            <div className="journey-goal-values">{formatMoney(goal.saved)} <span>de {formatMoney(goal.target)}</span></div>
                          </div>
                          <div className="journey-goal-actions">
                            <button type="button" aria-label={`Editar meta ${goal.name}`} onClick={() => setDialog({ kind: "goal", goal })}>Editar</button>
                            <button type="button" aria-label={`Remover meta ${goal.name}`} onClick={() => removeGoal(goal.id)}><Trash2 aria-hidden="true" /></button>
                          </div>
                        </article>
                      );
                    })}
                    <button className="journey-goal-add-link" type="button" onClick={() => setDialog({ kind: "goal" })}><Plus aria-hidden="true" /> Adicionar meta</button>
                  </div>
                ) : (
                  <div className="journey-goal-empty">
                    <span className="journey-money-icon"><CircleDollarSign aria-hidden="true" /></span>
                    <div><strong>Um objetivo de cada vez</strong><p>Uma meta pode ajudar a acompanhar seus próximos passos.</p></div>
                    <button className="journey-goal-create" type="button" onClick={() => setDialog({ kind: "goal" })}>Criar meta <ChevronRight aria-hidden="true" /></button>
                  </div>
                )}
              </section>

              <div className="journey-message"><span className="journey-message-icon"><Sparkles aria-hidden="true" /></span><p>{message}</p><span className="journey-message-dash" aria-hidden="true" /></div>
            </div>
          </div>
          <footer className="journey-footer"><span>Um dia de cada vez.</span><span>Feito para seguir no seu ritmo.</span></footer>
        </div>
      </main>

      <Navigation mobile />

      {notice && <div className="journey-toast" role="status"><Sparkles aria-hidden="true" />{notice}</div>}

      {dialog && (
        <div className="journey-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section className="journey-modal" role="dialog" aria-modal="true" aria-labelledby="journey-modal-title">
            <button className="journey-modal-close" type="button" onClick={() => setDialog(null)} aria-label="Fechar"><X aria-hidden="true" /></button>
            {dialog.kind === "habit" ? (
              <>
                <span className="journey-modal-icon"><Leaf aria-hidden="true" /></span>
                <h2 id="journey-modal-title">Qual é o seu próximo passo?</h2>
                <p>Um hábito simples já pode abrir caminho. Você pode mudar isso quando quiser.</p>
                <form onSubmit={saveHabit}>
                  <label htmlFor="journey-habit-name">Nome do hábito</label>
                  <input ref={habitNameRef} id="journey-habit-name" name="name" placeholder="Ex.: caminhar um pouco" maxLength={60} required />
                  <label htmlFor="journey-habit-note">Lembrete ou detalhe <span>opcional</span></label>
                  <input id="journey-habit-note" name="note" placeholder="Ex.: depois do café da manhã" maxLength={80} />
                  <div className="journey-modal-actions">
                    <button className="journey-cancel-button" type="button" onClick={() => setDialog(null)}>Agora não</button>
                    <button className="journey-primary-button" type="submit"><Plus aria-hidden="true" /> Adicionar hábito</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <span className="journey-modal-icon finance"><Target aria-hidden="true" /></span>
                <h2 id="journey-modal-title">{dialog.goal ? "Ajuste sua meta" : "Uma meta com a sua cara"}</h2>
                <p>Informe os valores que fazem sentido para o seu plano. Nada é preenchido por você.</p>
                <form onSubmit={saveGoal}>
                  <label htmlFor="journey-goal-name">Nome da meta</label>
                  <input id="journey-goal-name" name="name" placeholder="Ex.: minha próxima viagem" maxLength={60} defaultValue={dialog.goal?.name ?? ""} required />
                  <div className="journey-form-split">
                    <div><label htmlFor="journey-goal-target">Valor desejado</label><input id="journey-goal-target" name="target" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0,00" defaultValue={dialog.goal?.target ?? ""} required /></div>
                    <div><label htmlFor="journey-goal-saved">Já guardei <span>opcional</span></label><input id="journey-goal-saved" name="saved" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0,00" defaultValue={dialog.goal?.saved ?? ""} /></div>
                  </div>
                  <div className="journey-modal-actions">
                    <button className="journey-cancel-button" type="button" onClick={() => setDialog(null)}>Agora não</button>
                    <button className="journey-primary-button" type="submit">{dialog.goal ? "Salvar alterações" : "Criar meta"}</button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
