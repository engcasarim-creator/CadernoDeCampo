import type { ReactNode } from 'react';
import type { ResourceRecord } from '../../types';

export interface TableColumn<T> {
  header: string;
  render(row: T): ReactNode;
}

interface DataTableProps<T extends ResourceRecord> {
  columns: TableColumn<T>[];
  rows: T[];
  renderActions?(row: T): ReactNode;
  emptyMessage?: string;
}

/** Tabela genérica: serve para qualquer recurso. */
export function DataTable<T extends ResourceRecord>({
  columns,
  rows,
  renderActions,
  emptyMessage = 'Nenhum registro encontrado.',
}: DataTableProps<T>) {
  if (rows.length === 0) return <p className="empty">{emptyMessage}</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header}>{column.header}</th>
            ))}
            {renderActions && <th className="actions-col">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.header} data-label={column.header}>
                  {column.render(row)}
                </td>
              ))}
              {renderActions && <td className="actions-col">{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
