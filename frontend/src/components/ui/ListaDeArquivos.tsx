import { useState } from 'react';
import { ApiError } from '../../api/client';
import type { ArquivoContestacao } from '../../types';
import { formatarTamanho } from '../../utils/contestacao';
import { Alert } from './Alert';

interface Props {
  arquivos: ArquivoContestacao[];
  baixar(arquivoId: number): Promise<Blob>;
}

/** Abre o PDF numa nova aba. O arquivo é protegido: vem por fetch com o token e vira um link temporário. */
export function ListaDeArquivos({ arquivos, baixar }: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState<number | null>(null);

  async function abrir(arquivo: ArquivoContestacao) {
    setErro(null);
    setAbrindo(arquivo.id);
    // A aba é aberta já no clique (senão o navegador bloqueia o pop-up) e recebe o PDF quando chega.
    const aba = window.open('', '_blank');
    try {
      const blob = new Blob([await baixar(arquivo.id)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      if (aba) aba.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      aba?.close();
      setErro(error instanceof ApiError ? error.message : 'Não foi possível abrir o arquivo.');
    } finally {
      setAbrindo(null);
    }
  }

  return (
    <>
      {erro && <Alert>{erro}</Alert>}
      <ul className="arquivos">
        {arquivos.map((arquivo) => (
          <li key={arquivo.id}>
            <button type="button" className="link-button" disabled={abrindo === arquivo.id} onClick={() => void abrir(arquivo)}>
              📄 {arquivo.nomeOriginal}
            </button>{' '}
            <small>({formatarTamanho(arquivo.tamanho)})</small>
          </li>
        ))}
      </ul>
    </>
  );
}
