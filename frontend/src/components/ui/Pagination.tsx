import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onChange(page: number): void;
}

export function Pagination({ page, totalPages, total, onChange }: PaginationProps) {
  return (
    <nav className="pagination" aria-label="Paginação">
      <span>
        Página {page} de {totalPages} · {total} {total === 1 ? 'registro' : 'registros'}
      </span>
      <div className="pagination-buttons">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ← Anterior
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Próxima →
        </Button>
      </div>
    </nav>
  );
}
