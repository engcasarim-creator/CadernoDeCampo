import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { DynamicField } from '../components/forms/DynamicField';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import type { SelectOption } from '../components/ui/SelectField';
import { PageHeader } from '../components/ui/PageHeader';
import type { FieldConfig, ResourceConfig } from '../config/types';
import { useForm } from '../hooks/useForm';
import type { FormValues, ResourceRecord } from '../types';
import { validateFields, visibleFields } from '../utils/formValidation';

function emptyValues(fields: FieldConfig[]): FormValues {
  return Object.fromEntries(fields.map((field) => [field.name, '']));
}

/** Campos fixos da configuração + campos extras da API (ex.: os do tipo "Tratorista"). */
function useAllFields<T extends ResourceRecord>(config: ResourceConfig<T>): FieldConfig[] {
  const [extras, setExtras] = useState<FieldConfig[]>([]);

  useEffect(() => {
    let ativo = true;
    setExtras([]);
    config
      .loadExtraFields?.()
      .then((loaded) => ativo && setExtras(loaded))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [config]);

  return useMemo(() => [...config.fields, ...extras], [config, extras]);
}

/** Carrega as opções dos campos que se relacionam com outros recursos (ex.: escolher a propriedade). */
function useRelationOptions(fields: FieldConfig[]) {
  const [options, setOptions] = useState<Record<string, SelectOption[]>>({});

  useEffect(() => {
    let ativo = true;
    fields.forEach((field) => {
      field.loadOptions?.().then((loaded) => {
        if (ativo) setOptions((current) => ({ ...current, [field.name]: loaded }));
      }).catch(() => undefined);
    });
    return () => {
      ativo = false;
    };
  }, [fields]);

  return options;
}

/** Cadastro e edição genéricos (rota /novo e /:id/editar). */
export function ResourceFormPage<T extends ResourceRecord>({ config }: { config: ResourceConfig<T> }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = id !== undefined;
  const { values, setValues, errors, setErrors, setField } = useForm<FormValues>({});
  const fields = useAllFields(config);
  const relationOptions = useRelationOptions(fields);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [conflito, setConflito] = useState<{ to: string; label: string; state?: unknown } | null>(null);
  const [carregando, setCarregando] = useState(editando);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!editando) {
      // Mantém o que já foi digitado quando os campos extras terminam de carregar.
      setValues((atual) => ({ ...emptyValues(fields), ...atual }));
      return;
    }
    setCarregando(true);
    config.api
      .get(Number(id))
      .then((item) => setValues({ ...emptyValues(fields), ...config.toValues(item) }))
      .catch((error: unknown) =>
        setErroApi(error instanceof ApiError ? error.message : 'Não foi possível carregar o registro.'),
      )
      .finally(() => setCarregando(false));
  }, [config, fields, id, editando, setValues]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroApi(null);
    setConflito(null);
    const found = validateFields(fields, values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setEnviando(true);
    try {
      const payload = config.toPayload(values, fields);
      if (editando) await config.api.update(Number(id), payload);
      else await config.api.create(payload);
      navigate(`/${config.path}`, {
        state: { mensagem: `${config.singular} ${editando ? 'atualizado(a)' : 'cadastrado(a)'} com sucesso.` },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setErroApi(error.message);
        if (error.status === 409) setConflito(config.acaoDeConflito?.(values, error.details) ?? null);
        // Erros de "detalhes.campo" (atividades) são mostrados no campo "campo".
        setErrors(
          Object.fromEntries(
            Object.entries(error.details).map(([k, v]) => [
              config.errorField ? config.errorField(k, values) : k.replace('detalhes.', ''),
              v,
            ]),
          ),
        );
      } else {
        setErroApi('Não foi possível salvar. Tente novamente.');
      }
      setEnviando(false);
    }
  }

  const titulo = editando ? `Editar ${config.singular.toLowerCase()}` : config.novo;

  return (
    <>
      <PageHeader title={titulo} />
      {carregando ? (
        <p className="loading">Carregando…</p>
      ) : (
        <form className="card form-card" onSubmit={handleSubmit} noValidate>
          {erroApi && <Alert>{erroApi}</Alert>}
          {conflito && (
            <p>
              <Link to={conflito.to} state={conflito.state} className="btn btn-secondary">
                {conflito.label}
              </Link>
            </p>
          )}
          {visibleFields(fields, values).map((field) => (
            <DynamicField
              key={field.name}
              field={field}
              value={values[field.name] ?? ''}
              error={errors[field.name]}
              loadedOptions={relationOptions[field.name]}
              onChange={setField}
            />
          ))}
          <div className="form-actions">
            <Button type="submit" loading={enviando}>
              Salvar
            </Button>
            <Link to={`/${config.path}`} className="btn btn-secondary">
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
