import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { AuthCard } from '../components/layout/AuthCard';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { useForm } from '../hooks/useForm';
import type { FieldErrors } from '../types';
import { formatCpf, isValidCpf, isValidEmail, passwordIssues } from '../utils/validators';

interface RegisterValues extends Record<string, string> {
  nome: string;
  email: string;
  cpf: string;
  senha: string;
  confirmarSenha: string;
}

function validate(values: RegisterValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.nome.trim() === '') errors.nome = 'Informe o nome';
  if (values.email.trim() === '') errors.email = 'Informe o e-mail';
  else if (!isValidEmail(values.email)) errors.email = 'E-mail inválido';
  if (values.cpf.trim() === '') errors.cpf = 'Informe o CPF';
  else if (!isValidCpf(values.cpf)) errors.cpf = 'CPF inválido';
  const issues = passwordIssues(values.senha);
  if (values.senha === '') errors.senha = 'Informe a senha';
  else if (issues.length > 0) errors.senha = `A senha deve ${issues.join(', ')}`;
  if (values.confirmarSenha === '') errors.confirmarSenha = 'Confirme a senha';
  else if (values.confirmarSenha !== values.senha) errors.confirmarSenha = 'As senhas não conferem';
  return errors;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { values, errors, setErrors, setField } = useForm<RegisterValues>({
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    confirmarSenha: '',
  });
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroApi(null);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setEnviando(true);
    try {
      await authApi.register({
        nome: values.nome.trim(),
        email: values.email.trim().toLowerCase(),
        cpf: values.cpf,
        senha: values.senha,
      });
      navigate('/login', { replace: true, state: { mensagem: 'Cadastro realizado! Faça login para continuar.' } });
    } catch (error) {
      if (error instanceof ApiError) {
        setErroApi(error.message);
        setErrors(error.details); // mostra o erro da API no campo correspondente
      } else {
        setErroApi('Não foi possível concluir o cadastro. Tente novamente.');
      }
      setEnviando(false);
    }
  }

  return (
    <AuthCard title="Criar conta" subtitle="Cadastre-se para registrar as atividades da sua lavoura.">
      {erroApi && <Alert>{erroApi}</Alert>}
      <form onSubmit={handleSubmit} noValidate>
        <TextField
          label="Nome completo"
          name="nome"
          required
          autoComplete="name"
          value={values.nome}
          error={errors.nome}
          onChange={(e) => setField('nome', e.target.value)}
        />
        <TextField
          label="E-mail"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={(e) => setField('email', e.target.value)}
        />
        <TextField
          label="CPF"
          name="cpf"
          required
          inputMode="numeric"
          placeholder="000.000.000-00"
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
          hint="Mínimo de 8 caracteres, com maiúscula, minúscula, número e caractere especial."
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
          Cadastrar
        </Button>
      </form>
      <p className="auth-switch">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </AuthCard>
  );
}
