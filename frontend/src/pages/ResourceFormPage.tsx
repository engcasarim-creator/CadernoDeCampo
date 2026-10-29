import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { DynamicField } from '../components/forms/DynamicField';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import type { SelectOption } from '../components/ui/SelectField';
import { PageHeader } from '../components/ui/PageHeader';
import type { ResourceConfig } from '../config/types';
import { useForm } from '../hooks/useForm';
import type { FormValues, ResourceRecord } from '../types';
import { validateFields, visibleFields } from '../utils/formValidation';

function emptyValues<T extends ResourceRecord>(config: ResourceConfig<T>): FormValues {
  return Object.fromEntries(config.fields.map((field) => [field.name, '']));
}

/** Carrega as opções dos campos que se relacionam com outros recursos (ex.: escolher a propriedade). */
function useRelationOptions<T extends ResourceRecord>(config: ResourceConfig<T>) {
  const [options, setOptions] = useState<Record<string, SelectOption[]>>({});

  useEffect(() => {
    let ativo = true;
    config.fields.forEach((field) => {
      field.loadOptions?.().then((loaded) => {
        if (ativo) setOptions((current) => ({ ...current, [field.name]: loaded }));
      }).catch(() => undefined);
    });
    return () => {
      ativo = false;
    };
  }, [config]);

  return options;
}

/** Cadastro e edição genéricos (rota /novo e /:id/editar). */
export function ResourceFormPage<T extends ResourceRecord>({ config }: { config: ResourceConfig<T> }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = id !== undefined;
  const { values, setValues, errors, setErrors, setField } = useForm<FormValues>(emptyValues(config));
  const relationOptions = useRelationOptions(config);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(editando);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!editando) {
      setValues(emptyValues(config));
      return;
    }
    setCarregando(true);
    config.api
      .get(Number(id))
      .then((item) => setValues({ ...emptyValues(config), ...config.toValues(item) }))
      .catch((error: unknown) =>
        setErroApi(error instanceof ApiError ? error.message : 'Não foi possível carregar o registro.'),
      )
      .finally(() => setCarregando(false));
  }, [config, id, editando, setValues]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroApi(null);
    const found = validateFields(config.fields, values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setEnviando(true);
    try {
      const payload = config.toPayload(values);
      if (editando) await config.api.update(Number(id), payload);
      else await config.api.create(payload);
      navigate(`/${config.path}`, {
        state: { mensagem: `${config.singular} ${editando ? 'atualizado(a)' : 'cadastrado(a)'} com sucesso.` },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setErroApi(error.message);
        // Erros de "detalhes.campo" (atividades) são mostrados no campo "campo".
        setErrors(Object.fromEntries(Object.entries(error.details).map(([k, v]) => [k.replace('detalhes.', ''), v])));
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
          {visibleFields(config.fields, values).map((field) => (
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
