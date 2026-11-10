import type { StatusContestacao } from '../../types';
import { ROTULO_STATUS } from '../../utils/contestacao';

export function StatusBadge({ status }: { status: StatusContestacao }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{ROTULO_STATUS[status]}</span>;
}
