import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Moldura das telas públicas (login e cadastro). */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="brand">🌱 Caderno de Campo Digital</p>
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}
