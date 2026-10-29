import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { propriedadesConfig, talhoesConfig, safrasConfig, atividadesConfig } from '../config/resources';
import { useAuth } from '../context/AuthContext';

const CARDS = [propriedadesConfig, talhoesConfig, safrasConfig, atividadesConfig].map((config) => ({
  path: config.path,
  titulo: config.plural,
  total: () => config.api.list({ page: 1, limit: 1 }).then((page) => page.total),
}));

function SummaryCard({ path, titulo, total }: (typeof CARDS)[number]) {
  const [valor, setValor] = useState<number | null>(null);

  useEffect(() => {
    let ativo = true;
    total()
      .then((quantidade) => ativo && setValor(quantidade))
      .catch(() => ativo && setValor(null));
    return () => {
      ativo = false;
    };
  }, [total]);

  return (
    <Link to={`/${path}`} className="card summary-card">
      <span className="summary-value">{valor ?? '—'}</span>
      <span className="summary-label">{titulo}</span>
    </Link>
  );
}

export function DashboardPage() {
  const { usuario } = useAuth();
  return (
    <>
      <PageHeader title={`Olá, ${usuario?.nome ?? ''}!`} subtitle="Resumo do seu caderno de campo." />
      <section className="summary-grid">
        {CARDS.map((card) => (
          <SummaryCard key={card.path} {...card} />
        ))}
      </section>
      <p className="hint-text">
        Comece cadastrando uma <Link to="/propriedades/novo">propriedade</Link>, depois seus talhões, safras e as
        atividades de campo.
      </p>
    </>
  );
}
