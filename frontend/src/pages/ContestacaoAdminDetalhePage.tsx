import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { contestacoesAdminApi } from '../api/resources';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { ListaDeArquivos } from '../components/ui/ListaDeArquivos';
import { PageHeader } from '../components/ui/PageHeader';
import { SelectField } from '../components/ui/SelectField';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TextAreaField } from '../components/ui/TextAreaField';
import type { ContestacaoAdminDetalhe, FieldErrors } from '../types';
import { formatarDataHora, ROTULO_EMAIL } from '../utils/contestacao';
import { formatNumber } from '../utils/format';

const MOTIVO_MINIMO = 10;
const MOTIVO_MAXIMO = 300;
type Decisao = 'DEFERIDA' | 'INDEFERIDA';

const OPCOES = [
  { value: 'DEFERIDA', label: 'Deferir — passar a propriedade para o solicitante' },
  { value: 'INDEFERIDA', label: 'Indeferir — manter com o responsável atual' },
];

/** Administrador: lê o pedido e os PDFs, decide (deferido/indeferido) e informa o motivo ao solicitante. */
export function ContestacaoAdminDetalhePage() {
  const contestacaoId = Number(useParams().id);
  const [detalhe, setDetalhe] = useState<ContestacaoAdminDetalhe | null>(null);
  const [decisao, setDecisao] = useState<Decisao | ''>('');
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<FieldErrors>({});
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    contestacoesAdminApi
      .obter(contestacaoId)
      .then(setDetalhe)
      .catch((error: unknown) => setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar o pedido.'));
  }, [contestacaoId]);

  async function decidir(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);
    const encontrados: FieldErrors = {};
    if (decisao === '') encontrados.decisao = 'Escolha deferir ou indeferir';
    if (motivo.trim().length < MOTIVO_MINIMO) encontrados.motivo = `Escreva o motivo em pelo menos ${MOTIVO_MINIMO} caracteres`;
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0 || decisao === '' || detalhe === null) return;

    const confirmado = window.confirm(
      decisao === 'DEFERIDA'
        ? `Deferir o pedido #${contestacaoId}?\n\nA propriedade passa agora para ${detalhe.solicitante?.nome ?? 'o solicitante'} (com talhões, safras e atividades) e ele será avisado no sistema e por e-mail.`
        : `Indeferir o pedido #${contestacaoId}?\n\nO solicitante será avisado no sistema e por e-mail com o motivo informado.`,
    );
    if (!confirmado) return;

    setEnviando(true);
    try {
      const atualizado = await contestacoesAdminApi.decidir(contestacaoId, { decisao, motivo: motivo.trim() });
      setDetalhe(atualizado);
      setSucesso('Decisão registrada e solicitante avisado.');
    } catch (error) {
      if (error instanceof ApiError) {
        setErro(error.message);
        setErros(error.details);
      } else {
        setErro('Não foi possível registrar a decisão. Tente novamente.');
      }
    } finally {
      setEnviando(false);
    }
  }

  const c = detalhe?.contestacao;

  return (
    <>
      <PageHeader
        title={c ? `Pedido #${c.id}` : 'Pedido de contestação'}
        subtitle="Leia os documentos, confira o responsável atual e decida."
        actions={
          <Link to="/admin/contestacoes" className="btn btn-secondary">
            Voltar
          </Link>
        }
      />
      {erro && <Alert>{erro}</Alert>}
      {sucesso && <Alert type="success">{sucesso}</Alert>}
      {detalhe === null || c === undefined ? (
        !erro && <p className="loading">Carregando…</p>
      ) : (
        <>
          <section className="card detalhe-grid">
            <dl>
              <dt>Situação</dt>
              <dd>
                <StatusBadge status={c.status} />
              </dd>
              <dt>Solicitante</dt>
              <dd>{detalhe.solicitante ? `${detalhe.solicitante.nome} — ${detalhe.solicitante.email}` : 'Usuário removido'}</dd>
              <dt>CPF do solicitante</dt>
              <dd>{detalhe.solicitante?.cpf ?? '—'}</dd>
              <dt>CAR informado</dt>
              <dd>{c.car}</dd>
              <dt>CCIR informado</dt>
              <dd>{c.ccir ?? 'Não informado'}</dd>
              <dt>Enviado em</dt>
              <dd>{formatarDataHora(c.criadaEm)}</dd>
            </dl>
            <dl>
              <dt>Propriedade contestada</dt>
              <dd>
                {detalhe.propriedade
                  ? `${detalhe.propriedade.nome} — ${detalhe.propriedade.municipio}/${detalhe.propriedade.uf} (${formatNumber(detalhe.propriedade.areaHa)} ha)`
                  : 'Excluída depois do pedido (só pode ser indeferido)'}
              </dd>
              <dt>CAR cadastrado</dt>
              <dd>{detalhe.propriedade?.car ?? '—'}</dd>
              <dt>CCIR cadastrado</dt>
              <dd>{detalhe.propriedade?.ccir ?? '—'}</dd>
              <dt>Responsável atual</dt>
              <dd>{detalhe.propriedade ? `${detalhe.propriedade.responsavel.nome} — ${detalhe.propriedade.responsavel.email}` : '—'}</dd>
              <dt>CPF do responsável atual</dt>
              <dd>{detalhe.propriedade?.responsavel.cpf ?? '—'}</dd>
            </dl>
          </section>

          <section className="card">
            <h2>Justificativa do solicitante</h2>
            <p className="texto-livre">{c.justificativa}</p>
            <h2 className="secao">Documentos enviados</h2>
            <ListaDeArquivos arquivos={c.arquivos} baixar={(arquivoId) => contestacoesAdminApi.baixarArquivo(c.id, arquivoId)} />
            <p className="muted">
              Atenção: o sistema só confere que os arquivos são PDFs. Verifique nos documentos se o CAR/CCIR e o nome conferem com o solicitante.
            </p>
          </section>

          {c.status === 'EM_ANALISE' ? (
            <form className="card form-card" onSubmit={(e) => void decidir(e)} noValidate>
              <h2>Decisão</h2>
              <SelectField
                label="Decisão"
                name="decisao"
                required
                options={OPCOES}
                value={decisao}
                error={erros.decisao}
                onChange={(e) => setDecisao(e.target.value as Decisao | '')}
              />
              <TextAreaField
                label="Motivo (o solicitante lê este texto)"
                name="motivo"
                required
                maxLength={MOTIVO_MAXIMO}
                value={motivo}
                error={erros.motivo}
                hint="Curto e direto. Ex.: Matrícula e ITR em nome do solicitante."
                onChange={(e) => setMotivo(e.target.value)}
              />
              <Button type="submit" loading={enviando}>
                Registrar decisão e avisar o solicitante
              </Button>
            </form>
          ) : (
            <section className={`card decisao decisao-${c.status.toLowerCase()}`}>
              <h2>Decisão: {c.status === 'DEFERIDA' ? 'deferido' : 'indeferido'}</h2>
              <p>{c.decisao}</p>
              {c.decididaEm && <p className="muted">Em {formatarDataHora(c.decididaEm)}</p>}
              {c.emailStatus && <p className="muted">Aviso por e-mail: {ROTULO_EMAIL[c.emailStatus]}. O aviso dentro do sistema foi criado.</p>}
            </section>
          )}
        </>
      )}
    </>
  );
}
