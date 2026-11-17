import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Leaf,
  Pause,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { formatLocalDate, formatWeekdays, getHabitHistory, getMonthView } from "@/app/view-models";
import { toLocalDateKey } from "@/domain/dates";
import type { HabitView } from "@/app/view-models";
import type { AppState, HabitStatus } from "@/domain/model";
import { CardHeading, EmptyState, PageHeading, StatusLabel } from "./common";

export function HabitsPage({
  habits,
  onAddHabit,
  onEditHabit,
  onSetStatus,
  onJustify,
  onPauseHabit,
  onDeleteHabit,
}: {
  habits: HabitView[];
  onAddHabit: () => void;
  onEditHabit: (habit: HabitView) => void;
  onSetStatus: (id: string, status: "pending" | "completed" | "neutral", level?: "main" | "min") => void;
  onJustify: (habit: HabitView) => void;
  onPauseHabit: (id: string, paused: boolean) => void;
  onDeleteHabit: (habit: HabitView) => void;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");
  const shown = habits.filter((habit) => filter === "all" || habit.status === filter);

  return (
    <div className="content fade-up">
      <PageHeading
        eyebrow="Sua rotina"
        title="Hábitos"
        subtitle="Crie uma rotina que combine com a sua vida, sem pressa."
        action={
          <button className="button button-primary" onClick={onAddHabit} data-testid="button-add-habit">
            <Plus aria-hidden="true" /> Criar hábito
          </button>
        }
      />
      <section className="card page-card">
        <div className="toolbar">
          <div className="filter-row" role="group" aria-label="Filtrar hábitos">
            {(["all", "active", "paused"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`filter-chip ${filter === item ? "active" : ""}`}
                aria-pressed={filter === item}
                data-testid={`button-filter-${item}`}
              >
                {item === "all" ? `Todos · ${habits.length}` : item === "active" ? "Ativos" : "Pausados"}
              </button>
            ))}
          </div>
          <span className="card-kicker">Você pode alterar os dias e a descrição sem perder o histórico.</span>
        </div>
        {shown.length ? (
          <div className="table-list">
            {shown.map((habit) => (
              <div className="manage-row" key={habit.id} data-testid={`row-habit-${habit.id}`}>
                <button
                  type="button"
                  className={`check-button ${habit.dayStatus === "completed" ? "done" : ""}`}
                  disabled={!habit.scheduledToday}
                  onClick={() => onSetStatus(habit.id, habit.dayStatus === "completed" ? "pending" : "completed")}
                  aria-label={habit.dayStatus === "completed" ? `Desmarcar ${habit.name}` : `Concluir ${habit.name}`}
                  data-testid={`button-habit-status-${habit.id}`}
                >
                  {habit.dayStatus === "completed" && <Check aria-hidden="true" />}
                </button>
                <div className="manage-copy">
                  <strong>{habit.name}</strong>
                  <span>{habit.description || formatWeekdays(habit.weekdays)} · {habit.status === "active" ? "ativo" : "pausado"}</span>
                </div>
                {habit.scheduledToday && (
                  <StatusLabel tone={habit.dayStatus === "completed" ? "complete" : habit.dayStatus === "justified" ? "justified" : "pending"}>
                    {statusLabel(habit.dayStatus)}
                  </StatusLabel>
                )}
                <Link
                  className="icon-button"
                  href={`/history?habit=${encodeURIComponent(habit.id)}`}
                  title="Ver histórico do hábito"
                  aria-label={`Ver histórico de ${habit.name}`}
                  data-testid={`link-habit-history-${habit.id}`}
                >
                  <CalendarDays aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onEditHabit(habit)}
                  aria-label={`Editar ${habit.name}`}
                  data-testid={`button-edit-habit-${habit.id}`}
                >
                  <Edit3 aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onPauseHabit(habit.id, habit.status === "active")}
                  aria-label={habit.status === "active" ? `Pausar ${habit.name}` : `Retomar ${habit.name}`}
                  data-testid={`button-pause-habit-${habit.id}`}
                >
                  {habit.status === "active" ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onDeleteHabit(habit)}
                  aria-label={`Excluir ${habit.name}`}
                  data-testid={`button-delete-habit-${habit.id}`}
                >
                  <Trash2 aria-hidden="true" />
                </button>
                {habit.scheduledToday && habit.dayStatus !== "justified" && (
                  <button
                    type="button"
                    className="text-action"
                    onClick={() => onJustify(habit)}
                    data-testid={`button-justify-habit-${habit.id}`}
                  >
                    Justificar hoje
                  </button>
                )}
                {habit.scheduledToday && habit.dayStatus === "pending" && (
                  <button
                    type="button"
                    className="text-action secondary-action"
                    onClick={() => onSetStatus(habit.id, "neutral")}
                    data-testid={`button-neutral-habit-${habit.id}`}
                  >
                    Marcar neutro
                  </button>
                )}
                {habit.scheduledToday && habit.dayStatus === "neutral" && (
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
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Leaf aria-hidden="true" />}
            title={filter === "all" ? "Sua lista está pronta" : `Nenhum hábito ${filter === "active" ? "ativo" : "pausado"}`}
            body={filter === "all"
              ? "Adicione um hábito importante para você e escolha os dias que combinam com sua rotina."
              : "A lista será atualizada quando houver hábitos neste filtro."}
            action={filter === "all" ? (
              <button className="button button-primary" onClick={onAddHabit} data-testid="button-empty-add-habit">
                <Plus aria-hidden="true" /> Criar primeiro hábito
              </button>
            ) : undefined}
          />
        )}
      </section>
    </div>
  );
}

export function HistoryPage({ state }: { state: AppState }) {
  const [month, setMonth] = useState(() => new Date());
  const [selectedHabit, setSelectedHabit] = useState(
    () => new URLSearchParams(window.location.search).get("habit") ?? "all",
  );
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthData = getMonthView(
    state,
    year,
    monthIndex,
    selectedHabit === "all" ? undefined : selectedHabit,
  );
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month);
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const today = toLocalDateKey();
  const selectedHistory = useMemo(() => {
    if (selectedHabit === "all") {
      return state.habitDays
        .map((entry) => {
          const habit = state.habits.find((item) => item.id === entry.habitId);
          const revision = habit?.revisions.find((item) => item.id === entry.habitRevisionId);
          const status = entry.events.at(-1)?.status ?? "pending";
          return {
            date: entry.date,
            name: revision?.name ?? "Hábito",
            status,
            context: entry.events.at(-1)?.context,
          };
        })
        .filter((entry) => entry.date.startsWith(`${year}-${String(monthIndex + 1).padStart(2, "0")}`))
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    return getHabitHistory(state, selectedHabit)
      .filter((entry) => entry.date.startsWith(`${year}-${String(monthIndex + 1).padStart(2, "0")}`));
  }, [state, selectedHabit, year, monthIndex]);

  return (
    <div className="content fade-up">
      <PageHeading
        eyebrow="Seu caminho"
        title="Histórico"
        subtitle="Veja seus hábitos e justificativas sem apagar os passos anteriores."
      />
      <div className="grid dashboard-grid">
        <section className="card">
          <div className="card-title-row">
            <div>
              <h2 className="card-title">Calendário de atividades</h2>
              <div className="card-kicker">Os registros são agrupados pela data local.</div>
            </div>
            <div className="calendar-top">
              <button type="button" className="icon-button" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} aria-label="Mês anterior" data-testid="button-previous-month"><ChevronLeft aria-hidden="true" /></button>
              <span className="month-title">{monthLabel}</span>
              <button type="button" className="icon-button" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label="Próximo mês" data-testid="button-next-month"><ChevronRight aria-hidden="true" /></button>
            </div>
          </div>
          <div className="field history-filter">
            <label htmlFor="history-habit">Histórico de</label>
            <select className="select" id="history-habit" value={selectedHabit} onChange={(event) => setSelectedHabit(event.target.value)} data-testid="select-history-habit">
              <option value="all">Todos os hábitos</option>
              {state.habits.map((habit) => (
                <option key={habit.id} value={habit.id}>{habit.revisions.at(-1)?.name ?? "Hábito"}</option>
              ))}
            </select>
          </div>
          <div className="calendar-grid" role="grid" aria-label={`Calendário de ${monthLabel}`}>
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <div className="weekday" key={day} role="columnheader">{day}</div>)}
            {Array.from({ length: firstWeekday }, (_, index) => <div key={`blank-${index}`} aria-hidden="true" />)}
            {monthData.days.map((day) => (
              <div
                className={`calendar-day ${day.date > today ? "muted" : ""} ${day.isComplete ? "calendar-complete" : day.justified > 0 ? "calendar-justified" : day.completed > 0 ? "calendar-partial" : ""}`}
                key={day.date}
                role="gridcell"
                aria-label={`${formatLocalDate(day.date)}: ${day.completed} concluídos, ${day.justified} justificados`}
                data-testid={`calendar-day-${day.date}`}
              >
                <span className="day-number">{Number(day.date.slice(-2))}</span>
                {day.scheduled > 0 && (
                  <span className="day-dot" aria-hidden="true">
                    {day.isComplete ? "✓" : day.completed > 0 ? `${day.completed}/${day.scheduled}` : "•"}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="calendar-legend">
            <span><i className="legend-dot complete" />Concluído</span>
            <span><i className="legend-dot partial" />Parcial</span>
            <span><i className="legend-dot justified" />Com justificativa</span>
            <span><i className="legend-dot neutral" />Sem registro</span>
          </div>
        </section>
        <div className="side-stack history-side">
          <section className="card">
            <CardHeading title="Resumo do período" detail={monthLabel} />
            <div className="period-stats">
              <div className="period-stat"><strong>{monthData.completedHabits}</strong><span>hábitos concluídos</span></div>
              <div className="period-stat"><strong>{monthData.justifiedHabits}</strong><span>justificativas</span></div>
              <div className="period-stat"><strong>{monthData.completeDays}</strong><span>dias completos</span></div>
            </div>
          </section>
          <section className="card">
            <CardHeading title="Atividade registrada" detail={selectedHistory.length ? `${selectedHistory.length} registros no período` : "Nenhum registro neste período"} />
            {selectedHistory.length ? (
              <div className="activity-list">
                {selectedHistory.map((entry, index) => (
                  <div className="activity-row" key={`${entry.date}:${entry.name}:${index}`}>
                    <div><strong>{entry.name}</strong><span>{formatLocalDate(entry.date, { day: "numeric", month: "short" })}</span></div>
                    <div className="activity-status"><StatusLabel tone={entry.status}>{statusLabel(entry.status as HabitStatus)}</StatusLabel>{entry.context && <small>{entry.context}</small>}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mini-empty">As atividades aparecerão aqui conforme forem registradas.</div>
            )}
          </section>
          <section className="card xp-history-card">
            <CardHeading title="Evolução de XP" />
            <div className="mini-empty">
              O histórico de XP será exibido quando a tabela original de progressão estiver disponível.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: HabitStatus): string {
  switch (status) {
    case "completed": return "Concluído";
    case "justified": return "Justificado";
    case "neutral": return "Neutro";
    case "pending": return "Pendente";
  }
}
