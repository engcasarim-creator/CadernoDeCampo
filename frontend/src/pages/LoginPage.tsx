import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ApiError } from '../api/client';
import { AuthCard } from '../components/layout/AuthCard';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useForm';
import type { FieldErrors } from '../types';
import { isValidEmail } from '../utils/validators';

function validate(email: string, senha: string): FieldErrors {
  const errors: FieldErrors = {};
  if (email.trim() === '') errors.email = 'Informe o e-mail';
  else if (!isValidEmail(email)) errors.email = 'E-mail inválido';
  if (senha === '') errors.senha = 'Informe a senha';
  return errors;
}

/** Aviso opcional vindo do cadastro ("Cadastro realizado!"). */
function useFlashMessage(): string | null {
  const { state } = useLocation() as { state: { mensagem?: string } | null };
  return state?.mensagem ?? null;
}

export function LoginPage() {
  const { usuario, login } = useAuth();
  const mensagem = useFlashMessage();
  const { values, errors, setErrors, setField } = useForm({ email: '', senha: '' });
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Já logado? Vai direto para a área logada.
  if (usuario) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroApi(null);
    const found = validate(values.email, values.senha);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setEnviando(true);
    try {
      await login(values.email.trim().toLowerCase(), values.senha);
      // O redirecionamento acontece no <Navigate> acima, assim que o contexto recebe o usuário.
    } catch (error) {
      setErroApi(error instanceof ApiError ? error.message : 'Não foi possível entrar. Tente novamente.');
      setEnviando(false);
    }
  }

  return (
    <AuthCard title="Entrar" subtitle="Acesse o seu caderno de campo.">
      {mensagem && <Alert type="success">{mensagem}</Alert>}
      {erroApi && <Alert>{erroApi}</Alert>}
      <form onSubmit={handleSubmit} noValidate>
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={(e) => setField('email', e.target.value)}
        />
        <TextField
          label="Senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          value={values.senha}
          error={errors.senha}
          onChange={(e) => setField('senha', e.target.value)}
        />
        <Button type="submit" loading={enviando}>
          Entrar
        </Button>
      </form>
      <p className="auth-switch">
        Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
      </p>
    </AuthCard>
  );
}
