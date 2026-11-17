import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="subhead">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function CardHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-title-row">
      <div>
        <h2 className="card-title">{title}</h2>
        {detail && <div className="card-kicker">{detail}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function StatusLabel({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`status-label status-${tone}`}>{children}</span>;
}
