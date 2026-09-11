import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  connected: boolean;
}

export function Sidebar({ children, connected }: Props) {
  return (
    <aside className="sidebar">
      <header>
        <img className="logo" src="/favicon.svg" alt="logo" />
        <h1>Maritime Ops</h1>
      </header>
      <div className="body">{children}</div>
      <footer>
        AIS feed: <span className={`tag ${connected ? 'ok' : 'danger'}`}>{connected ? 'live' : 'disconnected'}</span>
      </footer>
    </aside>
  );
}
