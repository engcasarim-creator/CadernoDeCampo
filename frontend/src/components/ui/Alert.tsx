import type { ReactNode } from 'react';

interface AlertProps {
  type?: 'error' | 'success' | 'info';
  children: ReactNode;
}

export function Alert({ type = 'error', children }: AlertProps) {
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
