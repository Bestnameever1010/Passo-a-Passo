import { Award, CalendarDays, CheckSquare, CircleDollarSign, Compass, Leaf, Plus, Settings2, Sparkles, Trophy } from "lucide-react";
import "./_group.css";

const navigation = [
  { href: "/", label: "Hoje", icon: Compass },
  { href: "/habits", label: "Hábitos", icon: CheckSquare },
  { href: "/history", label: "Histórico", icon: CalendarDays },
  { href: "/achievements", label: "Conquistas", icon: Award },
  { href: "/goals", label: "Metas", icon: CircleDollarSign },
  { href: "/settings", label: "Configurações", icon: Settings2 },
];

function CurrentNavigation() {
  return <>{navigation.map(({ href, label, icon: Icon }) => (
    <a href={href} key={href} className={`nav-link ${href === "/" ? "active" : ""}`}>
      <Icon aria-hidden="true" /><span>{label}</span>
    </a>
  ))}</>;
}

function CurrentShell({ children }: { children: React.ReactNode }) {
  const date = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(new Date());
  return <div className="app-shell">
    <aside className="sidebar">
      <a href="/" className="brand">
        <span className="brand-mark"><Leaf size={19} /></span>
        <span><span className="brand-name">Passo a Passo</span><span className="brand-sub">um dia de cada vez</span></span>
      </a>
      <div className="nav-caption">Seu espaço</div>
      <nav className="nav-list" aria-label="Navegação principal"><CurrentNavigation /></nav>
      <div className="side-footer">
        <div className="offline-chip"><span className="offline-dot" />Seus dados ficam neste dispositivo</div>
        <p className="side-note">Cada pequeno passo conta.</p>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <span className="crumb">Seu espaço <span aria-hidden="true">/</span> <strong>Hoje</strong></span>
        <div className="top-actions"><span className="date-pill">{date}</span><span className="avatar" aria-label="Passo a Passo">PP</span></div>
      </header>
      {children}
    </main>
    <nav className="mobile-nav" aria-label="Navegação principal"><CurrentNavigation /></nav>
  </div>;
}

function CardHeading({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="card-title-row"><div><h2 className="card-title">{title}</h2>{detail && <div className="card-kicker">{detail}</div>}</div>{action}</div>;
}

function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{body}</p>{action}</div>;
}

export function Current() {
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return <div className="dashboard-current">
    <CurrentShell>
      <div className="content fade-up">
        <section className="welcome-card">
          <div className="welcome-copy">
            <div className="eyebrow">{greeting}</div>
            <h1>Um passo de cada vez.</h1>
            <p>Comece com um hábito importante para você.</p>
          </div>
          <div className="date-label">{today}</div>
        </section>
        <div className="dashboard-grid">
          <div>
            <div className="stats-row">
              <div className="stat-card"><div className="stat-label">Progresso de hoje</div><div className="stat-value">0<span className="stat-denominator"> / 0</span></div><div className="progress-track"><div className="progress-fill" style={{ width: 0 }} /></div></div>
              <div className="stat-card"><div className="stat-label">Sequência atual</div><div className="stat-value">0</div><div className="stat-meta">recorde: 0 dias completos</div></div>
              <div className="stat-card"><div className="stat-label">Experiência</div><div className="stat-value">—</div><div className="stat-meta">Aguardando as regras oficiais</div></div>
            </div>
            <section className="card">
              <CardHeading title="Hábitos de hoje" detail="0 hábitos programados" action={<button className="button button-soft"><Plus aria-hidden="true" />Adicionar</button>} />
              <EmptyState icon={<Leaf aria-hidden="true" />} title="Sem hábitos para hoje" body="Hoje não há hábitos programados para sua rotina." />
            </section>
          </div>
          <div className="side-stack">
            <section className="level-panel">
              <div className="level-heading"><span className="level-title">Sua jornada</span><span className="level-badge">Nível</span></div>
              <div className="level-number">—</div>
              <div className="level-note">A tabela de níveis original ainda não foi disponibilizada.</div>
            </section>
            <section className="card">
              <CardHeading title="Próximas conquistas" detail="0 desbloqueadas" action={<a href="/achievements" className="tiny-link">Ver todas →</a>} />
              <div className="mini-empty"><div className="achievement-mark" style={{ margin: "0 auto 12px" }}><Trophy aria-hidden="true" /></div>O catálogo original de conquistas ainda não foi carregado.</div>
            </section>
            <section className="card">
              <CardHeading title="Metas financeiras" action={<a href="/goals" className="tiny-link">Abrir metas →</a>} />
              <div className="mini-empty"><CircleDollarSign aria-hidden="true" /><span>Uma meta pode ajudar a acompanhar seus próximos passos.</span></div>
            </section>
            <div className="daily-message"><Sparkles aria-hidden="true" /><span>Comece com um hábito importante para você.</span></div>
          </div>
        </div>
      </div>
    </CurrentShell>
  </div>;
}
