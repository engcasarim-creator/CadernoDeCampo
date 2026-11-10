import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { tiposAdminApi } from '../api/resources';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { TextField } from '../components/ui/TextField';
import type { FieldErrors, TipoCampo } from '../types';

/** Linha do formulário (tudo em string/boolean, como o usuário digita). */
interface CampoForm {
  rotulo: string;
  tipo: TipoCampo;
  unidade: string;
  entraNoCusto: boolean;
}

const MAX_CAMPOS = 10;
const campoVazio = (): CampoForm => ({ rotulo: '', tipo: 'NUMERO', unidade: '', entraNoCusto: false });

/** Ponto de partida sugerido: o exemplo "Tratorista" (horas × valor por hora). */
const EXEMPLO: CampoForm[] = [
  { rotulo: 'Horas de tratorista', tipo: 'NUMERO', unidade: 'h', entraNoCusto: true },
  { rotulo: 'Valor por hora', tipo: 'NUMERO', unidade: 'R$/h', entraNoCusto: true },
];

function validar(nome: string, campos: CampoForm[]): FieldErrors {
  const erros: FieldErrors = {};
  if (nome.trim() === '') erros.nome = 'Campo obrigatório';
  if (campos.length === 0) erros.campos = 'Adicione ao menos um campo';
  campos.forEach((campo, indice) => {
    if (campo.rotulo.trim() === '') erros[`campos.${indice}.rotulo`] = 'Campo obrigatório';
    if (campo.entraNoCusto && campo.tipo !== 'NUMERO') erros[`campos.${indice}.entraNoCusto`] = 'Só campos numéricos entram no custo';
  });
  if (campos.length > 0 && !campos.some((campo) => campo.tipo === 'NUMERO' && campo.entraNoCusto)) {
    erros.campos = 'Marque ao menos um campo numérico que entra no cálculo do custo';
  }
  return erros;
}

/** Cadastro/edição de um tipo de atividade: nome + lista de campos (rótulo, tipo, unidade, entra no custo). */
export function TipoAtividadeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = id !== undefined;
  const [nome, setNome] = useState('');
  const [campos, setCampos] = useState<CampoForm[]>(editando ? [] : EXEMPLO);
  const [erros, setErros] = useState<FieldErrors>({});
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(editando);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!editando) return;
    tiposAdminApi
      .get(Number(id))
      .then((tipo) => {
        setNome(tipo.nome);
        setCampos(tipo.campos.map((c) => ({ rotulo: c.rotulo, tipo: c.tipo, unidade: c.unidade ?? '', entraNoCusto: c.entraNoCusto })));
      })
      .catch((error: unknown) => setErroApi(error instanceof ApiError ? error.message : 'Não foi possível carregar o tipo.'))
      .finally(() => setCarregando(false));
  }, [id, editando]);

  function alterar(indice: number, parcial: Partial<CampoForm>) {
    setCampos((atual) =>
      atual.map((campo, i) => {
        if (i !== indice) return campo;
        const novo = { ...campo, ...parcial };
        if (novo.tipo === 'TEXTO') novo.entraNoCusto = false; // texto nunca entra no custo
        return novo;
      }),
    );
    setErros({});
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setErroApi(null);
    const encontrados = validar(nome, campos);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    const corpo = {
      nome: nome.trim(),
      campos: campos.map((c) => ({
        rotulo: c.rotulo.trim(),
        tipo: c.tipo,
        unidade: c.unidade.trim() === '' ? null : c.unidade.trim(),
        entraNoCusto: c.entraNoCusto,
      })),
    };
    try {
      if (editando) await tiposAdminApi.update(Number(id), corpo);
      else await tiposAdminApi.create(corpo);
      navigate('/admin/tipos-atividade', {
        state: { mensagem: `Tipo de atividade ${editando ? 'atualizado' : 'cadastrado'} com sucesso.` },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setErroApi(error.message);
        setErros(error.details);
      } else {
        setErroApi('Não foi possível salvar. Tente novamente.');
      }
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader
        title={editando ? 'Editar tipo de atividade' : 'Novo tipo de atividade'}
        subtitle="Defina os campos que o usuário vai preencher. O custo da atividade é o produto dos campos marcados como “entra no custo” (ex.: horas × valor por hora)."
      />
      {carregando ? (
        <p className="loading">Carregando…</p>
      ) : (
        <form className="card form-card form-card-wide" onSubmit={(e) => void enviar(e)} noValidate>
          {erroApi && <Alert>{erroApi}</Alert>}
          <TextField
            label="Nome do tipo"
            name="nome"
            value={nome}
            maxLength={80}
            required
            error={erros.nome}
            hint="Ex.: Tratorista"
            onChange={(event) => setNome(event.target.value)}
          />

          <fieldset className="campos-tipo">
            <legend>Campos</legend>
            {campos.map((campo, indice) => (
              <div className="campo-tipo" key={indice}>
                <TextField
                  label="Nome do campo"
                  name={`rotulo-${indice}`}
                  value={campo.rotulo}
                  maxLength={60}
                  required
                  error={erros[`campos.${indice}.rotulo`]}
                  onChange={(event) => alterar(indice, { rotulo: event.target.value })}
                />
                <div className="field">
                  <label htmlFor={`field-tipo-${indice}`}>Tipo</label>
                  <select
                    id={`field-tipo-${indice}`}
                    value={campo.tipo}
                    onChange={(event) => alterar(indice, { tipo: event.target.value as TipoCampo })}
                  >
                    <option value="NUMERO">Número</option>
                    <option value="TEXTO">Texto</option>
                  </select>
                </div>
                <TextField
                  label="Unidade"
                  name={`unidade-${indice}`}
                  value={campo.unidade}
                  maxLength={20}
                  hint="Ex.: h, R$/h"
                  onChange={(event) => alterar(indice, { unidade: event.target.value })}
                />
                <div className="field campo-tipo-custo">
                  <label>
                    <input
                      type="checkbox"
                      checked={campo.entraNoCusto}
                      disabled={campo.tipo !== 'NUMERO'}
                      onChange={(event) => alterar(indice, { entraNoCusto: event.target.checked })}
                    />{' '}
                    Entra no custo
                  </label>
                  {erros[`campos.${indice}.entraNoCusto`] && (
                    <small className="field-error" role="alert">
                      {erros[`campos.${indice}.entraNoCusto`]}
                    </small>
                  )}
                </div>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setCampos((atual) => atual.filter((_, i) => i !== indice));
                    setErros({});
                  }}
                >
                  Remover
                </Button>
              </div>
            ))}
            {erros.campos && (
              <small className="field-error" role="alert">
                {erros.campos}
              </small>
            )}
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={campos.length >= MAX_CAMPOS}
                onClick={() => setCampos((atual) => [...atual, campoVazio()])}
              >
                + Adicionar campo
              </Button>
            </div>
          </fieldset>

          <div className="form-actions">
            <Button type="submit" loading={enviando}>
              Salvar
            </Button>
            <Link to="/admin/tipos-atividade" className="btn btn-secondary">
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
