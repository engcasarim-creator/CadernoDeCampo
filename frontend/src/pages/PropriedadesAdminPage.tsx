import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { propriedadesAdminApi } from '../api/resources';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { TextField } from '../components/ui/TextField';
import type { Page, PropriedadeAdmin } from '../types';
import { formatNumber } from '../utils/format';

const PAGE_SIZE = 10;

/** Administrador: todas as propriedades do sistema, com o responsável, e busca por CAR/CCIR/nome/responsável. */
export function PropriedadesAdminPage() {
  const [page, setPage] = useState(1);
  const [digitado, setDigitado] = useState('');
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState<Page<PropriedadeAdmin> | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setErro(null);
    propriedadesAdminApi
      .listar({ page, limit: PAGE_SIZE, busca })
      .then((dados) => ativo && setResultado(dados))
      .catch((error: unknown) => ativo && setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar as propriedades.'));
    return () => {
      ativo = false;
    };
  }, [page, busca]);

  function buscar(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setBusca(digitado);
  }

  return (
    <>
      <PageHeader
        title="Propriedades (administração)"
        subtitle="Todas as propriedades cadastradas. Se alguém cadastrou a propriedade de outra pessoa, localize-a pelo CAR ou CCIR e transfira para o responsável correto."
      />
      {erro && <Alert>{erro}</Alert>}
      <form className="search-bar" onSubmit={buscar} role="search">
        <TextField
          label="Buscar"
          name="busca"
          value={digitado}
          maxLength={100}
          hint="CAR, CCIR, nome, município ou nome/e-mail do responsável"
          onChange={(event) => setDigitado(event.target.value)}
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>
      {resultado === null ? (
        <p className="loading">Carregando…</p>
      ) : (
        <>
          <DataTable
            columns={[
              { header: 'Propriedade', render: (p) => `${p.nome} — ${p.municipio}/${p.uf} (${formatNumber(p.areaHa)} ha)` },
              { header: 'Responsável', render: (p) => `${p.responsavel.nome} (${p.responsavel.email})` },
              { header: 'CAR', render: (p) => p.car ?? 'Não informado' },
              { header: 'CCIR', render: (p) => p.ccir ?? 'Não informado' },
            ]}
            rows={resultado.data}
            emptyMessage="Nenhuma propriedade encontrada."
            renderActions={(p) => (
              <Link to={`/admin/propriedades/${p.id}`} className="btn btn-secondary">
                Detalhes
              </Link>
            )}
          />
          <Pagination page={resultado.page} totalPages={resultado.totalPages} total={resultado.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
