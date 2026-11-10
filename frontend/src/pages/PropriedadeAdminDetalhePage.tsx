import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { propriedadesAdminApi, usuariosAdminApi } from '../api/resources';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { SelectField, type SelectOption } from '../components/ui/SelectField';
import { TextField } from '../components/ui/TextField';
import type { FieldErrors, PropriedadeAdminDetalhe } from '../types';
import { formatNumber } from '../utils/format';

const MOTIVO_MINIMO = 10;

/** Todos os usuários (a API é paginada), para escolher o novo responsável. */
async function carregarUsuarios(): Promise<SelectOption[]> {
  const opcoes: SelectOption[] = [];
  let page = 1;
  for (;;) {
    const resposta = await usuariosAdminApi.list({ page, limit: 100 });
    opcoes.push(...resposta.data.map((u) => ({ value: String(u.id), label: `${u.nome} (${u.email})` })));
    if (page >= resposta.totalPages) return opcoes;
    page += 1;
  }
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Detalhe da propriedade para o administrador: responsável atual, transferência e histórico. */
export function PropriedadeAdminDetalhePage() {
  const { id } = useParams();
  const propriedadeId = Number(id);
  const [detalhe, setDetalhe] = useState<PropriedadeAdminDetalhe | null>(null);
  const [usuarios, setUsuarios] = useState<SelectOption[]>([]);
  const [novoUsuarioId, setNovoUsuarioId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<FieldErrors>({});
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    propriedadesAdminApi
      .obter(propriedadeId)
      .then(setDetalhe)
      .catch((error: unknown) => setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar a propriedade.'));
    carregarUsuarios()
      .then(setUsuarios)
      .catch(() => setErro('Não foi possível carregar a lista de usuários.'));
  }, [propriedadeId]);

  async function transferir(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);
    const encontrados: FieldErrors = {};
    if (novoUsuarioId === '') encontrados.novoUsuarioId = 'Escolha o novo responsável';
    if (motivo.trim().length < MOTIVO_MINIMO) encontrados.motivo = `Explique o motivo com pelo menos ${MOTIVO_MINIMO} caracteres`;
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0 || detalhe === null) return;

    const destino = usuarios.find((u) => u.value === novoUsuarioId)?.label ?? 'o usuário escolhido';
    const confirmado = window.confirm(
      `Transferir "${detalhe.nome}" de ${detalhe.responsavel.nome} para ${destino}?\n\n` +
        'Os talhões, safras e atividades desta propriedade também passam para o novo responsável.',
    );
    if (!confirmado) return;

    setEnviando(true);
    try {
      setDetalhe(await propriedadesAdminApi.transferir(propriedadeId, { novoUsuarioId: Number(novoUsuarioId), motivo: motivo.trim() }));
      setNovoUsuarioId('');
      setMotivo('');
      setSucesso('Propriedade transferida. A troca ficou registrada no histórico.');
    } catch (error) {
      if (error instanceof ApiError) {
        setErro(error.message);
        setErros(error.details);
      } else {
        setErro('Não foi possível transferir. Tente novamente.');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader
        title={detalhe ? detalhe.nome : 'Propriedade'}
        subtitle="Administração: responsável atual, transferência e histórico"
        actions={
          <Link to="/admin/propriedades" className="btn btn-secondary">
            Voltar
          </Link>
        }
      />
      {erro && <Alert>{erro}</Alert>}
      {sucesso && <Alert type="success">{sucesso}</Alert>}
      {detalhe === null ? (
        !erro && <p className="loading">Carregando…</p>
      ) : (
        <>
          <section className="card detalhe-grid">
            <dl>
              <dt>Localização</dt>
              <dd>
                {detalhe.municipio}/{detalhe.uf} — {formatNumber(detalhe.areaHa)} ha
              </dd>
              <dt>CAR</dt>
              <dd>{detalhe.car ?? 'Não informado'}</dd>
              <dt>CCIR</dt>
              <dd>{detalhe.ccir ?? 'Não informado'}</dd>
              <dt>Centroide</dt>
              <dd>{detalhe.latitude === null || detalhe.longitude === null ? 'Não informado' : `${detalhe.latitude}, ${detalhe.longitude}`}</dd>
            </dl>
            <dl>
              <dt>Responsável atual</dt>
              <dd>{detalhe.responsavel.nome}</dd>
              <dt>E-mail</dt>
              <dd>{detalhe.responsavel.email}</dd>
              <dt>CPF</dt>
              <dd>{detalhe.responsavel.cpf}</dd>
            </dl>
          </section>

          <form className="card form-card" onSubmit={(e) => void transferir(e)} noValidate>
            <h2>Transferir para outro responsável</h2>
            <SelectField
              label="Novo responsável"
              name="novoUsuarioId"
              required
              options={usuarios.filter((u) => u.value !== String(detalhe.responsavel.id))}
              value={novoUsuarioId}
              error={erros.novoUsuarioId}
              onChange={(event) => setNovoUsuarioId(event.target.value)}
            />
            <TextField
              label="Motivo"
              name="motivo"
              required
              maxLength={255}
              value={motivo}
              error={erros.motivo}
              hint="Ex.: dono real comprovou o CAR no SICAR. Fica registrado no histórico."
              onChange={(event) => setMotivo(event.target.value)}
            />
            <Button type="submit" loading={enviando}>
              Transferir propriedade
            </Button>
          </form>

          <h2 className="secao">Histórico de transferências</h2>
          <DataTable
            columns={[
              { header: 'Data', render: (t) => formatarData(t.realizadaEm) },
              { header: 'De', render: (t) => `${t.de.nome} (${t.de.email})` },
              { header: 'Para', render: (t) => `${t.para.nome} (${t.para.email})` },
              { header: 'Realizada por', render: (t) => t.realizadaPor.nome },
              { header: 'Motivo', render: (t) => t.motivo },
            ]}
            rows={detalhe.transferencias}
            emptyMessage="Esta propriedade nunca foi transferida."
          />
        </>
      )}
    </>
  );
}
