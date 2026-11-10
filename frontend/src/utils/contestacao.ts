import type { StatusContestacao, StatusEmail } from '../types';

export const MAX_ARQUIVOS = 5;
export const MAX_BYTES = 5 * 1024 * 1024;

export const ROTULO_STATUS: Record<StatusContestacao, string> = {
  EM_ANALISE: 'Em análise',
  DEFERIDA: 'Deferido',
  INDEFERIDA: 'Indeferido',
};

export const ROTULO_EMAIL: Record<StatusEmail, string> = {
  PENDENTE: 'Enviando…',
  ENVIADO: 'E-mail enviado',
  FALHOU: 'E-mail não enviado (falha no servidor de e-mail)',
  NAO_CONFIGURADO: 'E-mail não enviado (servidor de e-mail não configurado)',
};

export function formatarTamanho(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Confere os PDFs escolhidos antes de enviar (o servidor confere de novo; isto só poupa tempo ao usuário). */
export function problemaNosArquivos(arquivos: File[]): string | null {
  if (arquivos.length === 0) return 'Anexe ao menos um documento em PDF';
  if (arquivos.length > MAX_ARQUIVOS) return `Envie no máximo ${MAX_ARQUIVOS} arquivos`;
  const naoPdf = arquivos.find((a) => !a.name.toLowerCase().endsWith('.pdf'));
  if (naoPdf) return `"${naoPdf.name}" não é um PDF`;
  const grande = arquivos.find((a) => a.size > MAX_BYTES);
  if (grande) return `"${grande.name}" passa de ${MAX_BYTES / 1024 / 1024} MB`;
  return null;
}
