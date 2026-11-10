import { useState, type FormEvent } from 'react';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { TextField } from '../components/ui/TextField';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useForm';
import type { FieldErrors, Usuario } from '../types';
import { formatCpfDisplay } from '../utils/format';
import { formatCpf, isValidCpf, passwordIssues } from '../utils/validators';

interface ProfileValues extends Record<string, string> {
  nome: string;
  cpf: string;
  senha: string;
  confirmarSenha: string;
}

function validate(values: ProfileValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.nome.trim() === '') errors.nome = 'Informe o nome';
  if (values.cpf.trim() === '') errors.cpf = 'Informe o CPF';
  else if (!isValidCpf(values.cpf)) errors.cpf = 'CPF inválido';
  const issues = passwordIssues(values.senha);
  if (values.senha === '') errors.senha = 'Informe a senha (nova ou atual)';
  else if (issues.length > 0) errors.senha = `A senha deve ${issues.join(', ')}`;
  if (values.confirmarSenha === '') errors.confirmarSenha = 'Confirme a senha';
  else if (values.confirmarSenha !== values.senha) errors.confirmarSenha = 'As senhas não conferem';
  return errors;
}

function ProfileForm({ usuario }: { usuario: Usuario }) {
  const { atualizarUsuario } = useAuth();
  const { values, errors, setErrors, setField } = useForm<ProfileValues>({
    nome: usuario.nome,
    cpf: formatCpfDisplay(usuario.cpf),
    senha: '',
    confirmarSenha: '',
  });
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroApi(null);
    setSucesso(false);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setEnviando(true);
    try {
      const atualizado = await authApi.update(usuario.id, {
        nome: values.nome.trim(),
        cpf: values.cpf,
        senha: values.senha,
      });
      atualizarUsuario(atualizado); // o contexto atualiza o nome na barra de navegação
      setField('senha', '');
      setField('confirmarSenha', '');
      setSucesso(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setErroApi(error.message);
        setErrors(error.details);
      } else {
        setErroApi('Não foi possível salvar. Tente novamente.');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit} noValidate>
      {sucesso && <Alert type="success">Dados atualizados com sucesso!</Alert>}
      {erroApi && <Alert>{erroApi}</Alert>}
      <TextField
        label="E-mail"
        name="email"
        value={usuario.email}
        disabled
        readOnly
        hint="O e-mail não pode ser alterado."
      />
      <TextField
        label="Nome completo"
        name="nome"
        required
        value={values.nome}
        error={errors.nome}
        onChange={(e) => setField('nome', e.target.value)}
      />
      <TextField
        label="CPF"
        name="cpf"
        required
        inputMode="numeric"
        value={values.cpf}
        error={errors.cpf}
        onChange={(e) => setField('cpf', formatCpf(e.target.value))}
      />
      <TextField
        label="Senha"
        name="senha"
        type="password"
        required
        autoComplete="new-password"
        hint="Digite a nova senha (ou repita a atual). Mínimo de 8 caracteres, com maiúscula, minúscula, número e caractere especial."
        value={values.senha}
        error={errors.senha}
        onChange={(e) => setField('senha', e.target.value)}
      />
      <TextField
        label="Confirmar senha"
        name="confirmarSenha"
        type="password"
        required
        autoComplete="new-password"
        value={values.confirmarSenha}
        error={errors.confirmarSenha}
        onChange={(e) => setField('confirmarSenha', e.target.value)}
      />
      <Button type="submit" loading={enviando}>
        Salvar alterações
      </Button>
    </form>
  );
}

export function ProfilePage() {
  const { usuario } = useAuth();
  if (!usuario) return null; // ProtectedRoute garante que existe; isto só satisfaz o TypeScript
  return (
    <>
      <PageHeader title="Meu perfil" subtitle="Atualize seus dados de acesso." />
      <ProfileForm usuario={usuario} />
    </>
  );
}
