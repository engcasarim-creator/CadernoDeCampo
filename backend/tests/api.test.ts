import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { buildContainer } from './helpers/buildContainer';

let server: Server;
let base: string;

/** Campos das respostas da API que os testes inspecionam (tudo opcional). */
interface ApiBody {
  id?: number;
  token?: string;
  usuario?: { id: number };
  message?: string;
  details?: Record<string, string>;
  nome?: string;
  uf?: string;
  tipo?: string;
  total?: number;
  data?: unknown[];
}

async function call(method: string, path: string, body?: unknown, token?: string) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as ApiBody) : null };
}

async function cadastrarELogar(email: string, cpf: string) {
  const cadastro = await call('POST', '/api/auth/register', { nome: 'Fulano', email, senha: 'Senha@123', cpf });
  expect(cadastro.status).toBe(201);
  const login = await call('POST', '/api/auth/login', { email, senha: 'Senha@123' });
  expect(login.status).toBe(200);
  return { token: login.body?.token as string, id: login.body?.usuario?.id as number };
}

beforeAll(async () => {
  server = createApp(buildContainer()).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('API (HTTP completo, sem MySQL)', () => {
  it('exige autenticação em todas as rotas dos 4 CRUDs', async () => {
    for (const recurso of ['propriedades', 'talhoes', 'safras', 'atividades']) {
      expect((await call('GET', `/api/${recurso}`)).status).toBe(401);
      expect((await call('POST', `/api/${recurso}`, {})).status).toBe(401);
      expect((await call('PUT', `/api/${recurso}/1`, {})).status).toBe(401);
      expect((await call('DELETE', `/api/${recurso}/1`)).status).toBe(401);
    }
    expect((await call('GET', '/api/propriedades', undefined, 'token-falso')).status).toBe(401);
  });

  it('cadastro: valida campos e devolve erros por campo', async () => {
    const resposta = await call('POST', '/api/auth/register', { nome: '', email: 'x', senha: '1', cpf: '123' });
    expect(resposta.status).toBe(400);
    expect(Object.keys(resposta.body?.details ?? {})).toEqual(expect.arrayContaining(['nome', 'email', 'senha', 'cpf']));
  });

  it('login: usuário inexistente e senha errada recebem 401 com a mesma mensagem', async () => {
    await cadastrarELogar('login@exemplo.com', '529.982.247-25');
    const errada = await call('POST', '/api/auth/login', { email: 'login@exemplo.com', senha: 'Errada@123' });
    const inexistente = await call('POST', '/api/auth/login', { email: 'nao@existe.com', senha: 'Senha@123' });
    expect(errada.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(errada.body?.message).toBe(inexistente.body?.message);
  });

  it('perfil: só edita o próprio usuário e não altera o e-mail', async () => {
    const a = await cadastrarELogar('a@exemplo.com', '111.444.777-35');
    const b = await cadastrarELogar('b@exemplo.com', '390.533.447-05');
    const edicao = { nome: 'Novo', cpf: '111.444.777-35', senha: 'Outra@1234' };

    expect((await call('PUT', `/api/usuarios/${b.id}`, edicao, a.token)).status).toBe(403);
    expect((await call('PUT', `/api/usuarios/${a.id}`, { ...edicao, email: 'troca@exemplo.com' }, a.token)).status).toBe(400);
    const ok = await call('PUT', `/api/usuarios/${a.id}`, edicao, a.token);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ nome: 'Novo', email: 'a@exemplo.com' });
    expect(ok.body).not.toHaveProperty('senhaHash');
    expect((await call('GET', '/api/usuarios/me', undefined, a.token)).body?.nome).toBe('Novo');
  });

  it('CRUDs encadeados, relacionamento, paginação, filtro, isolamento entre usuários e 404', async () => {
    const dono = await cadastrarELogar('dono@exemplo.com', '168.995.350-09');
    const outro = await cadastrarELogar('outro@exemplo.com', '935.411.347-80');
    const t = dono.token;

    // Propriedade -> Talhão -> Safra -> Atividade
    const prop = await call('POST', '/api/propriedades', { nome: 'Fazenda Boa Vista', municipio: 'Tibagi', uf: 'pr', areaHa: 120.5 }, t);
    expect(prop.status).toBe(201);
    expect(prop.body?.uf).toBe('PR');
    const propId = prop.body?.id as number;

    const talhao = await call('POST', '/api/talhoes', { propriedadeId: propId, nome: 'Talhão 1', areaHa: 30 }, t);
    expect(talhao.status).toBe(201);
    const talhaoId = talhao.body?.id as number;

    const safra = await call('POST', '/api/safras', { talhaoId, cultura: 'Soja', anoAgricola: '2026/2027', status: 'PLANEJADA' }, t);
    expect(safra.status).toBe(201);
    const safraId = safra.body?.id as number;

    const atividade = await call(
      'POST',
      '/api/atividades',
      { safraId, tipo: 'APLICACAO', data: '2026-11-10', descricao: 'Herbicida', detalhes: { produto: 'Glifosato', doseHa: 2, areaHa: 30, precoPorUnidade: 25 } },
      t,
    );
    expect(atividade.status).toBe(201);
    expect(atividade.body).toMatchObject({ tipo: 'APLICACAO', custoTotal: 1500 });

    // Relacionamento inválido: talhão que não existe / que é de outro usuário
    expect((await call('POST', '/api/safras', { talhaoId: 9999, cultura: 'Milho', anoAgricola: '2026/2027', status: 'PLANEJADA' }, t)).status).toBe(404);
    expect((await call('POST', '/api/safras', { talhaoId, cultura: 'Milho', anoAgricola: '2026/2027', status: 'PLANEJADA' }, outro.token)).status).toBe(404);

    // Isolamento: o outro usuário não vê nem altera nada
    expect((await call('GET', `/api/propriedades/${propId}`, undefined, outro.token)).status).toBe(404);
    expect((await call('GET', '/api/propriedades', undefined, outro.token)).body?.total).toBe(0);
    expect((await call('DELETE', `/api/propriedades/${propId}`, undefined, outro.token)).status).toBe(404);

    // Paginação
    for (let i = 2; i <= 12; i++) {
      await call('POST', '/api/talhoes', { propriedadeId: propId, nome: `Talhão ${i}`, areaHa: i }, t);
    }
    const pagina1 = await call('GET', '/api/talhoes?page=1&limit=5', undefined, t);
    expect(pagina1.body).toMatchObject({ page: 1, limit: 5, total: 12, totalPages: 3 });
    expect(pagina1.body?.data).toHaveLength(5);
    const pagina3 = await call('GET', '/api/talhoes?page=3&limit=5', undefined, t);
    expect(pagina3.body?.data).toHaveLength(2);
    expect((await call('GET', '/api/talhoes?page=0', undefined, t)).status).toBe(400);
    expect((await call('GET', `/api/talhoes?propriedadeId=${propId}&limit=100`, undefined, t)).body?.total).toBe(12);
    expect((await call('GET', '/api/talhoes?propriedadeId=777', undefined, t)).body?.total).toBe(0);

    // Edição e exclusão; 404 para o que não existe
    const editado = await call('PUT', `/api/talhoes/${talhaoId}`, { propriedadeId: propId, nome: 'Renomeado', areaHa: 31 }, t);
    expect(editado.body).toMatchObject({ nome: 'Renomeado', areaHa: 31 });
    expect((await call('PUT', '/api/talhoes/9999', { propriedadeId: propId, nome: 'X', areaHa: 1 }, t)).status).toBe(404);
    expect((await call('DELETE', '/api/talhoes/9999', undefined, t)).status).toBe(404);
    expect((await call('DELETE', `/api/atividades/${atividade.body?.id}`, undefined, t)).status).toBe(204);
    expect((await call('GET', `/api/atividades/${atividade.body?.id}`, undefined, t)).status).toBe(404);

    // Validação de tipo/detalhes de atividade
    const invalida = await call('POST', '/api/atividades', { safraId, tipo: 'COLHEITA', data: '2026-13-40', descricao: 'x', detalhes: {} }, t);
    expect(invalida.status).toBe(400);
    expect((await call('POST', '/api/atividades', { safraId, tipo: 'VOO', data: '2026-11-10', descricao: 'x', detalhes: {} }, t)).status).toBe(400);
  });

  it('talhões: a soma das áreas não pode ultrapassar a área da propriedade', async () => {
    const { token: t } = await cadastrarELogar('area@exemplo.com', '746.025.380-45');
    const prop = await call('POST', '/api/propriedades', { nome: 'Sítio', municipio: 'Tibagi', uf: 'PR', areaHa: 100 }, t);
    const propId = prop.body?.id as number;
    const corpo = (nome: string, areaHa: number) => ({ propriedadeId: propId, nome, areaHa });

    const a = await call('POST', '/api/talhoes', corpo('A', 60), t);
    expect(a.status).toBe(201);

    // 40,01 ha não cabem nos 40 ha que sobraram: erro 400 com mensagem explicando os números
    const excede = await call('POST', '/api/talhoes', corpo('B', 40.01), t);
    expect(excede.status).toBe(400);
    expect(excede.body?.message).toContain('ultrapassa');
    expect(excede.body?.details?.areaHa).toContain('40 ha disponíveis');

    // Preencher exatamente o que sobra é permitido; depois disso, nada mais cabe
    expect((await call('POST', '/api/talhoes', corpo('B', 40), t)).status).toBe(201);
    expect((await call('POST', '/api/talhoes', corpo('C', 0.01), t)).status).toBe(400);

    // Edição: a área do próprio talhão não conta contra ele mesmo
    const id = a.body?.id as number;
    expect((await call('PUT', `/api/talhoes/${id}`, corpo('A', 61), t)).status).toBe(400);
    expect((await call('PUT', `/api/talhoes/${id}`, corpo('A', 60), t)).status).toBe(200);
    expect((await call('PUT', `/api/talhoes/${id}`, corpo('A', 10), t)).status).toBe(200);

    // Propriedade: não pode encolher abaixo da soma dos talhões (10 + 40 = 50 ha)
    const dados = (areaHa: number) => ({ nome: 'Sítio', municipio: 'Tibagi', uf: 'PR', areaHa });
    const encolher = await call('PUT', `/api/propriedades/${propId}`, dados(49.99), t);
    expect(encolher.status).toBe(400);
    expect(encolher.body?.details?.areaHa).toContain('50 ha');
    expect((await call('PUT', `/api/propriedades/${propId}`, dados(50), t)).status).toBe(200);
    expect((await call('PUT', `/api/propriedades/${propId}`, dados(150), t)).status).toBe(200);
  });

  it('comparativo plantio × colheita: soma por safra, converte sacas em kg e respeita o dono', async () => {
    const dono = await cadastrarELogar('comparativo@exemplo.com', '284.915.307-97');
    const outro = await cadastrarELogar('curioso@exemplo.com', '615.082.943-05');
    const t = dono.token;

    const prop = await call('POST', '/api/propriedades', { nome: 'Fazenda', municipio: 'Castro', uf: 'PR', areaHa: 50 }, t);
    const talhao = await call('POST', '/api/talhoes', { propriedadeId: prop.body?.id, nome: 'T1', areaHa: 20 }, t);
    const safra = await call('POST', '/api/safras', { talhaoId: talhao.body?.id, cultura: 'Soja', anoAgricola: '2026/2027', status: 'EM_ANDAMENTO' }, t);
    const safraId = safra.body?.id as number;
    const atividade = (tipo: string, descricao: string, detalhes: object) =>
      call('POST', '/api/atividades', { safraId, tipo, data: '2026-10-01', descricao, detalhes }, t);

    // Sem atividades: tudo zerado e sem relação calculável
    const vazio = await call('GET', `/api/safras/${safraId}/comparativo`, undefined, t);
    expect(vazio.status).toBe(200);
    expect(vazio.body).toMatchObject({ relacaoColhidoPlantado: null, plantio: { atividades: 0 }, colheita: { atividades: 0 } });

    await atividade('PLANTIO', 'Plantio principal', { sementeKg: 100, precoPorKg: 10 }); // custo 1000
    await atividade('PLANTIO', 'Replantio', { sementeKg: 20, precoPorKg: 10 }); //          custo 200
    await atividade('APLICACAO', 'Herbicida', { produto: 'X', doseHa: 1, areaHa: 20, precoPorUnidade: 50 }); // fora do comparativo
    await atividade('COLHEITA', 'Colheita', { sacas: 50, custoPorSaca: 8 }); //                custo 400

    const resposta = await call('GET', `/api/safras/${safraId}/comparativo`, undefined, t);
    expect(resposta.body).toMatchObject({
      safraId,
      cultura: 'Soja',
      kgPorSaca: 60,
      plantio: { atividades: 2, sementeKg: 120, custo: 1200 },
      colheita: { atividades: 1, sacas: 50, kg: 3000, custo: 400 },
      diferenca: { quantidadeKg: 2880, custo: -800 },
      relacaoColhidoPlantado: 25,
    });

    expect((await call('GET', `/api/safras/${safraId}/comparativo`)).status).toBe(401);
    expect((await call('GET', `/api/safras/${safraId}/comparativo`, undefined, outro.token)).status).toBe(404);
    expect((await call('GET', '/api/safras/9999/comparativo', undefined, t)).status).toBe(404);
  });

  it('responde 404 em JSON para rota inexistente e 400 para JSON malformado', async () => {
    expect((await call('GET', '/api/nada')).status).toBe(404);
    const malformado = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{quebrado',
    });
    expect(malformado.status).toBe(400);
  });
});
