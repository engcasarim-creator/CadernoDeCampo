import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { TipoPersonalizado, gerarChave } from '../src/modules/tipos-atividade';
import { runMigrations, type Migration } from '../src/database/migrations';
import { buildContainer } from './helpers/buildContainer';
import { dadosPropriedade } from './helpers/propriedadeValida';

let server: Server;
let base: string;

const COORD = { latitude: -24.51, longitude: -50.41 };
const ADMIN = { email: 'root@exemplo.com', nome: 'Root', cpf: '12345678909', senha: 'Admin@12345' };

interface Body {
  id?: number;
  token?: string;
  usuario?: { id: number; papel?: string };
  message?: string;
  details?: Record<string, string>;
  total?: number;
  data?: Array<Record<string, unknown>>;
  papel?: string;
  nome?: string;
  email?: string;
  custoTotal?: number;
  tipoNome?: string;
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
  return { status: response.status, body: text ? (JSON.parse(text) as Body) : null };
}

async function logar(email: string, senha: string) {
  const login = await call('POST', '/api/auth/login', { email, senha });
  expect(login.status).toBe(200);
  return { token: login.body?.token as string, id: login.body?.usuario?.id as number };
}

async function cadastrar(email: string, cpf: string) {
  const r = await call('POST', '/api/auth/register', { nome: 'Comum', email, senha: 'Senha@123', cpf });
  expect(r.status).toBe(201);
  return logar(email, 'Senha@123');
}

const TRATORISTA = {
  nome: 'Tratorista',
  campos: [
    { rotulo: 'Horas de tratorista', tipo: 'NUMERO', unidade: 'h', entraNoCusto: true },
    { rotulo: 'Valor por hora', tipo: 'NUMERO', unidade: 'R$/h', entraNoCusto: true },
  ],
};

beforeAll(async () => {
  const container = buildContainer({ admin: ADMIN });
  await container.iniciar();
  server = createApp(container).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('Área de administrador', () => {
  it('o administrador do seed entra com papel ADMIN; quem se cadastra é USUARIO', async () => {
    const admin = await call('POST', '/api/auth/login', { email: ADMIN.email, senha: ADMIN.senha });
    expect(admin.body?.usuario?.papel).toBe('ADMIN');
    const comum = await cadastrar('comum1@exemplo.com', '52998224725');
    const me = await call('GET', '/api/usuarios/me', undefined, comum.token);
    expect(me.body?.papel).toBe('USUARIO');
  });

  it('bloqueia as rotas /api/admin para anônimos (401) e usuários comuns (403)', async () => {
    const comum = await cadastrar('comum2@exemplo.com', '11144477735');
    for (const rota of ['/api/admin/usuarios', '/api/admin/tipos-atividade']) {
      expect((await call('GET', rota)).status).toBe(401);
      expect((await call('GET', rota, undefined, comum.token)).status).toBe(403);
    }
    expect((await call('POST', '/api/admin/tipos-atividade', TRATORISTA, comum.token)).status).toBe(403);
    expect((await call('PUT', `/api/admin/usuarios/${comum.id}`, {}, comum.token)).status).toBe(403);
  });

  it('lista todos os usuários e edita nome, CPF, papel e senha (e-mail é imutável)', async () => {
    const admin = await logar(ADMIN.email, ADMIN.senha);
    const alvo = await cadastrar('alvo@exemplo.com', '39053344705');

    const lista = await call('GET', '/api/admin/usuarios?page=1&limit=50', undefined, admin.token);
    expect(lista.status).toBe(200);
    expect(lista.body?.data?.some((u) => u.email === 'alvo@exemplo.com')).toBe(true);
    expect(JSON.stringify(lista.body)).not.toContain('senha');

    const ok = await call(
      'PUT',
      `/api/admin/usuarios/${alvo.id}`,
      { nome: 'Alvo Editado', cpf: '39053344705', papel: 'ADMIN', email: 'alvo@exemplo.com', senha: 'NovaSenha@1' },
      admin.token,
    );
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ nome: 'Alvo Editado', papel: 'ADMIN', email: 'alvo@exemplo.com' });
    // a senha nova passa a valer
    await logar('alvo@exemplo.com', 'NovaSenha@1');

    const emailTrocado = await call(
      'PUT',
      `/api/admin/usuarios/${alvo.id}`,
      { nome: 'X', cpf: '39053344705', papel: 'ADMIN', email: 'outro@exemplo.com' },
      admin.token,
    );
    expect(emailTrocado.status).toBe(400);
  });

  it('não deixa o administrador rebaixar a si mesmo nem usar CPF de outra pessoa', async () => {
    const admin = await logar(ADMIN.email, ADMIN.senha);
    const outro = await cadastrar('dup@exemplo.com', '16899535009');
    const rebaixar = await call(
      'PUT',
      `/api/admin/usuarios/${admin.id}`,
      { nome: ADMIN.nome, cpf: ADMIN.cpf, papel: 'USUARIO' },
      admin.token,
    );
    expect(rebaixar.status).toBe(400);
    const duplicado = await call(
      'PUT',
      `/api/admin/usuarios/${outro.id}`,
      { nome: 'Dup', cpf: ADMIN.cpf, papel: 'USUARIO' },
      admin.token,
    );
    expect(duplicado.status).toBe(409);
    expect((await call('GET', '/api/admin/usuarios/9999', undefined, admin.token)).status).toBe(404);
    const fraca = await call(
      'PUT',
      `/api/admin/usuarios/${outro.id}`,
      { nome: 'Dup', cpf: '16899535009', papel: 'USUARIO', senha: '123' },
      admin.token,
    );
    expect(fraca.status).toBe(400);
  });
});

describe('Tipos de atividade personalizados', () => {
  it('cria "Tratorista", impede nome repetido e valida campos', async () => {
    const admin = await logar(ADMIN.email, ADMIN.senha);
    const criado = await call('POST', '/api/admin/tipos-atividade', TRATORISTA, admin.token);
    expect(criado.status).toBe(201);
    expect(criado.body).toMatchObject({ nome: 'Tratorista' });

    expect((await call('POST', '/api/admin/tipos-atividade', { ...TRATORISTA, nome: 'tratorista' }, admin.token)).status).toBe(409);

    const semCusto = await call(
      'POST',
      '/api/admin/tipos-atividade',
      { nome: 'Sem custo', campos: [{ rotulo: 'Obs', tipo: 'TEXTO', unidade: null, entraNoCusto: false }] },
      admin.token,
    );
    expect(semCusto.status).toBe(400);
  });

  it('usuário comum vê o tipo e registra atividade: 8 h × R$ 80 = R$ 640', async () => {
    const admin = await logar(ADMIN.email, ADMIN.senha);
    const tipo = await call('POST', '/api/admin/tipos-atividade', { ...TRATORISTA, nome: 'Tratorista 2' }, admin.token);
    const tipoId = tipo.body?.id as number;

    const u = await cadastrar('prod@exemplo.com', '93541134780');
    const disponiveis = await call('GET', '/api/tipos-atividade', undefined, u.token);
    expect(disponiveis.status).toBe(200);
    expect(JSON.stringify(disponiveis.body)).toContain('Tratorista 2');

    const prop = await call('POST', '/api/propriedades', dadosPropriedade({ nome: 'Sítio', areaHa: 50 }), u.token);
    const talhao = await call('POST', '/api/talhoes', { propriedadeId: prop.body?.id, nome: 'T1', areaHa: 10 }, u.token);
    const safra = await call(
      'POST',
      '/api/safras',
      { talhaoId: talhao.body?.id, cultura: 'Soja', anoAgricola: '2026/2027', status: 'PLANEJADA' },
      u.token,
    );
    const corpo = {
      safraId: safra.body?.id,
      tipo: 'PERSONALIZADA',
      tipoId,
      data: '2026-10-01',
      descricao: 'Preparo do solo',
      detalhes: { horas_de_tratorista: 8, valor_por_hora: 80 },
    };
    const atividade = await call('POST', '/api/atividades', corpo, u.token);
    expect(atividade.status).toBe(201);
    expect(atividade.body).toMatchObject({ tipo: 'PERSONALIZADA', tipoNome: 'Tratorista 2', custoTotal: 640 });

    // detalhes inválidos e tipo inexistente
    const invalida = await call('POST', '/api/atividades', { ...corpo, detalhes: { horas_de_tratorista: -1 } }, u.token);
    expect(invalida.status).toBe(400);
    expect(invalida.body?.details).toHaveProperty('detalhes.horas_de_tratorista');
    expect((await call('POST', '/api/atividades', { ...corpo, tipoId: 9999 }, u.token)).status).toBe(400);
    expect((await call('POST', '/api/atividades', { ...corpo, tipoId: undefined }, u.token)).status).toBe(400);

    // tipo em uso: não muda os campos nem pode ser excluído
    const mudou = await call(
      'PUT',
      `/api/admin/tipos-atividade/${tipoId}`,
      { nome: 'Tratorista 2', campos: [TRATORISTA.campos[0]] },
      admin.token,
    );
    expect(mudou.status).toBe(409);
    const renomear = await call('PUT', `/api/admin/tipos-atividade/${tipoId}`, { ...TRATORISTA, nome: 'Tratorista (novo)' }, admin.token);
    expect(renomear.status).toBe(200);
    expect((await call('DELETE', `/api/admin/tipos-atividade/${tipoId}`, undefined, admin.token)).status).toBe(409);
  });

  it('tipo sem uso pode ser editado e excluído', async () => {
    const admin = await logar(ADMIN.email, ADMIN.senha);
    const tipo = await call('POST', '/api/admin/tipos-atividade', { ...TRATORISTA, nome: 'Descartável' }, admin.token);
    const id = tipo.body?.id;
    const editado = await call(
      'PUT',
      `/api/admin/tipos-atividade/${id}`,
      { nome: 'Descartável', campos: [TRATORISTA.campos[0]] },
      admin.token,
    );
    expect(editado.status).toBe(200);
    expect((await call('DELETE', `/api/admin/tipos-atividade/${id}`, undefined, admin.token)).status).toBe(204);
  });
});

describe('Coordenadas da propriedade', () => {
  it('exigem latitude e longitude dentro das faixas válidas', async () => {
    const u = await cadastrar('geo@exemplo.com', '74602538045');
    const { latitude: _la, longitude: _lo, ...base } = dadosPropriedade({ areaHa: 10 });
    expect((await call('POST', '/api/propriedades', base, u.token)).status).toBe(400);
    expect((await call('POST', '/api/propriedades', { ...base, latitude: 95, longitude: -50 }, u.token)).status).toBe(400);
    expect((await call('POST', '/api/propriedades', { ...base, latitude: -24, longitude: 200 }, u.token)).status).toBe(400);
    const ok = await call('POST', '/api/propriedades', { ...base, ...COORD }, u.token);
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject(COORD);
  });
});

describe('Regras isoladas', () => {
  it('gerarChave remove acentos e símbolos', () => {
    expect(gerarChave('Valor por hora')).toBe('valor_por_hora');
    expect(gerarChave('  Área (ha)! ')).toBe('area_ha');
    expect(gerarChave('2 turnos')).toBe('c_2_turnos');
    expect(gerarChave('???')).toBe('');
  });

  it('TipoPersonalizado rejeita chaves repetidas/reservadas e calcula o custo pelo produto', () => {
    const campo = (rotulo: string) => ({ chave: gerarChave(rotulo), rotulo, tipo: 'NUMERO' as const, unidade: null, entraNoCusto: true });
    expect(() => new TipoPersonalizado({ nome: 'X', campos: [campo('Horas'), campo('horas')] })).toThrow();
    expect(() => new TipoPersonalizado({ nome: 'X', campos: [campo('Data')] })).toThrow();
    const tipo = new TipoPersonalizado({ nome: 'Tratorista', campos: [campo('Horas'), campo('Valor')] });
    expect(tipo.calcularCusto(tipo.lerValores({ horas: 8, valor: 80 }))).toBe(640);
  });

  it('runMigrations aplica só as pendentes e não repete', async () => {
    const aplicadas = new Set<number>();
    const executadas: string[] = [];
    const pool = {
      query: async (sql: string, params?: unknown) => {
        if (sql.startsWith('SELECT id FROM schema_migrations')) return [[...aplicadas].map((id) => ({ id })), []];
        if (sql.startsWith('INSERT INTO schema_migrations')) aplicadas.add((params as number[])[0]);
        else if (!sql.startsWith('CREATE TABLE IF NOT EXISTS schema_migrations')) executadas.push(sql);
        return [[], []];
      },
    };
    const migracoes: Migration[] = [
      { id: 1, descricao: 'a', sql: 'ALTER A' },
      { id: 2, descricao: 'b', sql: 'ALTER B' },
    ];
    const quietly = () => undefined;
    const primeira = await runMigrations(pool as never, migracoes, quietly);
    const segunda = await runMigrations(pool as never, migracoes, quietly);
    expect(primeira).toBe(2);
    expect(segunda).toBe(0);
    expect(executadas).toEqual(['ALTER A', 'ALTER B']);
  });
});
