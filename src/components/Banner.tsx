import type { ReactNode } from 'react';

interface BannerProps {
  variant: 'overview' | 'agent';
  title: string;
  agentName?: string;
  onLogout?: () => void;
  right?: ReactNode;
}

export function Banner({ variant, title, agentName, onLogout, right }: BannerProps) {
  return (
    <header className={`banner banner--${variant}`}>
      <span className="banner-wordmark">FREEDOM ACADEMY</span>
      <span className="banner-title">{title}</span>
      <span className="banner-spacer" />
      {agentName && <span className="banner-agent-name">{agentName}</span>}
      {right}
      {onLogout && (
        <button className="banner-logout" onClick={onLogout}>
          Log out
        </button>
      )}
    </header>
  );
}
