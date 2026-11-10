import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { buildContainer } from './helpers/buildContainer';
import { dadosPropriedade } from './helpers/propriedadeValida';

let server: Server;
let base: string;

const ADMIN = { email: 'root@exemplo.com', nome: 'Root', cpf: '12345678909', senha: 'Admin@12345' };

interface Resp {
  id?: number;
  token?: string;
  usuario?: { id: number };
  total?: number;
  data?: Array<{ id: number; nome: string; car: string; responsavel: { id: number; email: string; cpf: string } }>;
  responsavel?: { id: number; email: string };
  transferencias?: Array<{ motivo: string; de: { email: string }; para: { email: string }; realizadaPor: { nome: string } }>;
  details?: Record<string, string>;
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
  return { status: response.status, body: text ? (JSON.parse(text) as Resp) : null };
}

async function entrar(email: string, senha: string) {
  const r = await call('POST', '/api/auth/login', { email, senha });
  return { token: r.body?.token as string, id: r.body?.usuario?.id as number };
}

async function cadastrar(email: string, cpf: string) {
  await call('POST', '/api/auth/register', { nome: `Nome ${email}`, email, senha: 'Senha@123', cpf });
  return entrar(email, 'Senha@123');
}

beforeAll(async () => {
  const container = buildContainer({ admin: ADMIN });
  await container.iniciar();
  server = createApp(container).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('Administração de propriedades', () => {
  it('só o administrador acessa (401 sem login, 403 para usuário comum)', async () => {
    const comum = await cadastrar('comum@exemplo.com', '52998224725');
    for (const [metodo, rota, corpo] of [
      ['GET', '/api/admin/propriedades', undefined],
      ['GET', '/api/admin/propriedades/1', undefined],
      ['POST', '/api/admin/propriedades/1/transferencia', { novoUsuarioId: 1, motivo: 'motivo qualquer longo' }],
    ] as const) {
      expect((await call(metodo, rota, corpo)).status).toBe(401);
      expect((await call(metodo, rota, corpo, comum.token)).status).toBe(403);
    }
  });

  it('lista propriedades de todos os usuários com o responsável e busca por CAR (mesmo colado com pontuação)', async () => {
    const admin = await entrar(ADMIN.email, ADMIN.senha);
    const a = await cadastrar('prod-a@exemplo.com', '11144477735');
    const b = await cadastrar('prod-b@exemplo.com', '39053344705');
    const pa = await call('POST', '/api/propriedades', dadosPropriedade({ nome: 'Fazenda Alfa' }), a.token);
    await call('POST', '/api/propriedades', dadosPropriedade({ nome: 'Fazenda Beta' }), b.token);

    const todas = await call('GET', '/api/admin/propriedades?limit=100', undefined, admin.token);
    expect(todas.status).toBe(200);
    expect(todas.body?.data?.map((p) => p.nome)).toEqual(expect.arrayContaining(['Fazenda Alfa', 'Fazenda Beta']));
    const alfa = todas.body?.data?.find((p) => p.nome === 'Fazenda Alfa');
    expect(alfa?.responsavel).toMatchObject({ id: a.id, email: 'prod-a@exemplo.com', cpf: '11144477735' });

    const porCar = await call('GET', `/api/admin/propriedades?busca=${encodeURIComponent(String((pa.body as { car?: string }).car).toLowerCase())}`, undefined, admin.token);
    expect(porCar.body?.data?.map((p) => p.nome)).toEqual(['Fazenda Alfa']);
    const porResponsavel = await call('GET', '/api/admin/propriedades?busca=prod-b%40', undefined, admin.token);
    expect(porResponsavel.body?.data?.map((p) => p.nome)).toEqual(['Fazenda Beta']);
    // curingas do LIKE valem como texto comum
    expect((await call('GET', '/api/admin/propriedades?busca=%25', undefined, admin.token)).body?.total).toBe(0);
  });

  it('transfere para o responsável correto: dados acompanham, histórico é gravado e o antigo perde o acesso', async () => {
    const admin = await entrar(ADMIN.email, ADMIN.senha);
    const invasor = await cadastrar('invasor@exemplo.com', '16899535009');
    const dono = await cadastrar('dono-real@exemplo.com', '93541134780');

    const criada = await call('POST', '/api/propriedades', dadosPropriedade({ nome: 'Sítio Disputado', areaHa: 80 }), invasor.token);
    const propId = criada.body?.id as number;
    await call('POST', '/api/talhoes', { propriedadeId: propId, nome: 'T1', areaHa: 10 }, invasor.token);

    // o dono real tenta cadastrar e é barrado
    const tentativa = await call('POST', '/api/propriedades', dadosPropriedade({ car: (criada.body as { car?: string }).car }), dono.token);
    expect(tentativa.status).toBe(409);

    const resultado = await call(
      'POST',
      `/api/admin/propriedades/${propId}/transferencia`,
      { novoUsuarioId: dono.id, motivo: 'CAR confirmado pelo dono no SICAR' },
      admin.token,
    );
    expect(resultado.status).toBe(200);
    expect(resultado.body?.responsavel?.email).toBe('dono-real@exemplo.com');
    expect(resultado.body?.transferencias).toHaveLength(1);
    expect(resultado.body?.transferencias?.[0]).toMatchObject({
      motivo: 'CAR confirmado pelo dono no SICAR',
      de: { email: 'invasor@exemplo.com' },
      para: { email: 'dono-real@exemplo.com' },
      realizadaPor: { nome: ADMIN.nome },
    });

    // o invasor não vê mais; o dono vê a propriedade e o talhão que acompanhou
    expect((await call('GET', `/api/propriedades/${propId}`, undefined, invasor.token)).status).toBe(404);
    expect((await call('GET', `/api/propriedades/${propId}`, undefined, dono.token)).status).toBe(200);
    expect((await call('GET', '/api/talhoes', undefined, dono.token)).body?.total).toBe(1);
    expect((await call('GET', '/api/talhoes', undefined, invasor.token)).body?.total).toBe(0);
    // e o invasor não consegue recadastrar a mesma propriedade
    expect((await call('POST', '/api/propriedades', dadosPropriedade({ car: (criada.body as { car?: string }).car }), invasor.token)).status).toBe(409);

    const detalhe = await call('GET', `/api/admin/propriedades/${propId}`, undefined, admin.token);
    expect(detalhe.body?.transferencias).toHaveLength(1);
  });

  it('valida a transferência: motivo, usuário de destino, mesmo responsável e propriedade inexistente', async () => {
    const admin = await entrar(ADMIN.email, ADMIN.senha);
    const u = await cadastrar('valida@exemplo.com', '74602538045');
    const p = await call('POST', '/api/propriedades', dadosPropriedade(), u.token);
    const url = `/api/admin/propriedades/${p.body?.id}/transferencia`;

    const curto = await call('POST', url, { novoUsuarioId: admin.id, motivo: 'curto' }, admin.token);
    expect(curto.status).toBe(400);
    expect(curto.body?.details).toHaveProperty('motivo');
    expect((await call('POST', url, { motivo: 'motivo bem explicado' }, admin.token)).status).toBe(400);
    expect((await call('POST', url, { novoUsuarioId: 9999, motivo: 'motivo bem explicado' }, admin.token)).status).toBe(404);
    const mesmo = await call('POST', url, { novoUsuarioId: u.id, motivo: 'motivo bem explicado' }, admin.token);
    expect(mesmo.status).toBe(400);
    expect(mesmo.body?.details).toHaveProperty('novoUsuarioId');
    expect((await call('POST', '/api/admin/propriedades/9999/transferencia', { novoUsuarioId: admin.id, motivo: 'motivo bem explicado' }, admin.token)).status).toBe(404);
    expect((await call('GET', '/api/admin/propriedades/9999', undefined, admin.token)).status).toBe(404);
    // nada foi alterado nas tentativas inválidas
    expect((await call('GET', `/api/admin/propriedades/${p.body?.id}`, undefined, admin.token)).body?.transferencias).toHaveLength(0);
  });
});
