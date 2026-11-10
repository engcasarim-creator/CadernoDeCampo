import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { contestacoesApi } from '../api/resources';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { TextAreaField } from '../components/ui/TextAreaField';
import { TextField } from '../components/ui/TextField';
import type { FieldErrors } from '../types';
import { formatarTamanho, MAX_ARQUIVOS, MAX_BYTES, problemaNosArquivos } from '../utils/contestacao';

const JUSTIFICATIVA_MINIMA = 20;

interface EstadoDaRota {
  car?: string;
  ccir?: string;
}

/** O dono real de uma propriedade já cadastrada por outra pessoa abre o pedido e anexa PDFs de prova. */
export function ContestacaoNovaPage() {
  const navigate = useNavigate();
  const inicial = (useLocation().state ?? {}) as EstadoDaRota;
  const [car, setCar] = useState(inicial.car ?? '');
  const [ccir, setCcir] = useState(inicial.ccir ?? '');
  const [justificativa, setJustificativa] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erros, setErros] = useState<FieldErrors>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function escolherArquivos(event: ChangeEvent<HTMLInputElement>) {
    const escolhidos = Array.from(event.target.files ?? []);
    setArquivos(escolhidos);
    setErros((atual) => ({ ...atual, arquivos: problemaNosArquivos(escolhidos) ?? '' }));
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    const encontrados: FieldErrors = {};
    if (car.trim() === '') encontrados.car = 'Informe o CAR do imóvel';
    if (justificativa.trim().length < JUSTIFICATIVA_MINIMA) {
      encontrados.justificativa = `Explique com pelo menos ${JUSTIFICATIVA_MINIMA} caracteres`;
    }
    const problema = problemaNosArquivos(arquivos);
    if (problema) encontrados.arquivos = problema;
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    const form = new FormData();
    form.append('car', car.trim());
    if (ccir.trim() !== '') form.append('ccir', ccir.trim());
    form.append('justificativa', justificativa.trim());
    arquivos.forEach((arquivo) => form.append('arquivos', arquivo));

    setEnviando(true);
    try {
      await contestacoesApi.abrir(form);
      navigate('/contestacoes', { state: { mensagem: 'Pedido enviado. Você será avisado aqui e por e-mail quando o administrador decidir.' } });
    } catch (error) {
      if (error instanceof ApiError) {
        setErro(error.message);
        setErros(error.details);
      } else {
        setErro('Não foi possível enviar o pedido. Tente novamente.');
      }
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Contestar propriedade"
        subtitle="Use quando o imóvel que você é responsável já está cadastrado por outra pessoa. O administrador analisa os seus documentos e responde por aqui e por e-mail."
        actions={
          <Link to="/contestacoes" className="btn btn-secondary">
            Meus pedidos
          </Link>
        }
      />
      <form className="card form-card" onSubmit={(e) => void enviar(e)} noValidate>
        {erro && <Alert>{erro}</Alert>}
        <TextField
          label="CAR do imóvel"
          name="car"
          required
          maxLength={60}
          value={car}
          error={erros.car}
          hint="Como está no recibo de inscrição no CAR."
          onChange={(e) => setCar(e.target.value)}
        />
        <TextField
          label="CCIR do imóvel"
          name="ccir"
          maxLength={30}
          value={ccir}
          error={erros.ccir}
          hint="Opcional, mas ajuda o administrador a localizar o cadastro."
          onChange={(e) => setCcir(e.target.value)}
        />
        <TextAreaField
          label="Por que este imóvel é seu?"
          name="justificativa"
          required
          maxLength={2000}
          value={justificativa}
          error={erros.justificativa}
          hint={`Ex.: sou o proprietário conforme a matrícula anexa. Mínimo ${JUSTIFICATIVA_MINIMA} caracteres.`}
          onChange={(e) => setJustificativa(e.target.value)}
        />
        <div className="field">
          <label htmlFor="field-arquivos">
            Documentos em PDF<span aria-hidden="true"> *</span>
          </label>
          <input id="field-arquivos" name="arquivos" type="file" accept="application/pdf,.pdf" multiple aria-invalid={Boolean(erros.arquivos)} onChange={escolherArquivos} />
          {erros.arquivos ? (
            <small className="field-error" role="alert">
              {erros.arquivos}
            </small>
          ) : (
            <small className="field-hint">
              Matrícula, ITR, escritura, CAR/CCIR... Até {MAX_ARQUIVOS} arquivos de {MAX_BYTES / 1024 / 1024} MB cada.
            </small>
          )}
          {arquivos.length > 0 && (
            <ul className="arquivos">
              {arquivos.map((a) => (
                <li key={`${a.name}-${a.size}`}>
                  📄 {a.name} <small>({formatarTamanho(a.size)})</small>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="form-actions">
          <Button type="submit" loading={enviando}>
            Enviar pedido
          </Button>
          <Link to="/propriedades" className="btn btn-secondary">
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
