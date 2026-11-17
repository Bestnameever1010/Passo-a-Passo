import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Award, CalendarDays, CheckSquare, CircleDollarSign, Compass, Leaf, Settings2 } from 'lucide-react';

const navigation = [
  { href: '/', label: 'Hoje', icon: Compass },
  { href: '/habits', label: 'Hábitos', icon: CheckSquare },
  { href: '/history', label: 'Histórico', icon: CalendarDays },
  { href: '/achievements', label: 'Conquistas', icon: Award },
  { href: '/goals', label: 'Metas', icon: CircleDollarSign },
  { href: '/settings', label: 'Configurações', icon: Settings2 },
];

function NavItems() {
  const [location] = useLocation();
  return <>{navigation.map(({ href, label, icon: Icon }) => (
    <Link href={href} key={href} className={`nav-link ${location === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <Icon aria-hidden="true" /><span>{label}</span>
    </Link>
  ))}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const title = navigation.find((item) => item.href === location)?.label ?? 'Hoje';
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date());
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" data-testid="link-brand">
        <span className="brand-mark"><Leaf size={19} strokeWidth={2.2} /></span>
        <span><span className="brand-name">Passo a Passo</span><span className="brand-sub">um dia de cada vez</span></span>
      </Link>
      <div className="nav-caption">Seu espaço</div>
      <nav className="nav-list" aria-label="Navegação principal"><NavItems /></nav>
      <div className="side-footer">
        <div className="offline-chip"><span className="offline-dot" />Seus dados ficam neste dispositivo</div>
        <p className="side-note">Cada pequeno passo conta.</p>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <span className="crumb">Seu espaço <span aria-hidden="true">/</span> <strong>{title}</strong></span>
        <div className="top-actions"><span className="date-pill">{today}</span><span className="avatar" aria-label="Passo a Passo">PP</span></div>
      </header>
      {children}
    </main>
    <nav className="mobile-nav" aria-label="Navegação principal"><NavItems /></nav>
  </div>;
}
