import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { RAIO_DE_DUPLICIDADE_M } from '../src/modules/propriedades/PropriedadeService';
import {
  formatarCar,
  formatarCcir,
  normalizarCar,
  normalizarCcir,
  problemaNoCar,
  problemaNoCcir,
} from '../src/modules/propriedades/identificadores';
import { caixaEmVolta, distanciaMetros } from '../src/shared/utils/geo';
import { buildContainer } from './helpers/buildContainer';
import { dadosPropriedade } from './helpers/propriedadeValida';

let server: Server;
let base: string;

interface Body {
  id?: number;
  token?: string;
  message?: string;
  details?: Record<string, string>;
  car?: string;
  ccir?: string;
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
  return { status: response.status, body: text ? (JSON.parse(text) as Body) : null, text };
}

async function usuario(email: string, cpf: string): Promise<string> {
  await call('POST', '/api/auth/register', { nome: 'Produtor', email, senha: 'Senha@123', cpf });
  const login = await call('POST', '/api/auth/login', { email, senha: 'Senha@123' });
  return login.body?.token as string;
}

beforeAll(async () => {
  server = createApp(buildContainer()).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('CAR e CCIR: formato', () => {
  it('normaliza pontuação e confere UF, código do IBGE e tamanho', () => {
    const hash = 'A1B2C3D4E5F67890A1B2C3D4E5F67890';
    expect(normalizarCar(' pr-4127106-a1b2.c3d4.e5f6.7890.a1b2.c3d4.e5f6.7890 ')).toBe(`PR-4127106-${hash}`);
    expect(formatarCar(`PR-4127106-${hash}`)).toBe('PR-4127106-A1B2.C3D4.E5F6.7890.A1B2.C3D4.E5F6.7890');
    expect(problemaNoCar(`PR-4127106-${hash}`, 'PR')).toBeNull();
    expect(problemaNoCar(`PR-4127106-${hash}`, 'SC')).toContain('começa com PR');
    expect(problemaNoCar(`SC-4127106-${hash}`, 'SC')).toContain('não é de SC'); // 41 = Paraná
    expect(problemaNoCar('PR-123', 'PR')).toContain('inválido');
    expect(problemaNoCar(`PR-4127106-${hash.slice(1)}Z`, 'PR')).toContain('inválido');

    expect(normalizarCcir('950.123.456.789-0')).toBe('9501234567890');
    expect(formatarCcir('9501234567890')).toBe('950.123.456.789-0');
    expect(problemaNoCcir('9501234567890')).toBeNull();
    expect(problemaNoCcir('123')).toContain('13 dígitos');
  });
});

describe('Distância entre centroides', () => {
  it('Haversine: 0,001° de latitude ≈ 111 m e a caixa de busca contém o raio', () => {
    const a = { latitude: -24.5, longitude: -50.4 };
    expect(distanciaMetros(a, a)).toBe(0);
    expect(distanciaMetros(a, { latitude: -24.501, longitude: -50.4 })).toBeCloseTo(111.2, 0);
    const caixa = caixaEmVolta(a, 50);
    expect(caixa.latMax - caixa.latMin).toBeGreaterThan(0.0008);
    expect(caixa.lngMax - caixa.lngMin).toBeGreaterThan(0.0008);
    const pontoA49m = { latitude: a.latitude + 49.9 / 111_195, longitude: a.longitude };
    expect(pontoA49m.latitude).toBeLessThanOrEqual(caixa.latMax);
  });
});

describe('Uma propriedade só pode ter um responsável', () => {
  it('exige CAR e CCIR válidos e coerentes com a UF', async () => {
    const t = await usuario('a1@exemplo.com', '52998224725');
    const { car: _c, ccir: _i, ...semIds } = dadosPropriedade();
    const faltando = await call('POST', '/api/propriedades', semIds, t);
    expect(faltando.status).toBe(400);
    expect(faltando.body?.details).toHaveProperty('car');
    expect(faltando.body?.details).toHaveProperty('ccir');

    expect((await call('POST', '/api/propriedades', dadosPropriedade({ car: 'PR-123' }), t)).body?.details).toHaveProperty('car');
    expect((await call('POST', '/api/propriedades', dadosPropriedade({ ccir: '123' }), t)).body?.details).toHaveProperty('ccir');
    const outraUf = await call('POST', '/api/propriedades', dadosPropriedade({ uf: 'SC' }), t); // CAR é do PR
    expect(outraUf.status).toBe(400);
    expect(outraUf.body?.details?.car).toContain('PR');

    // pontuação e minúsculas são aceitas e o CAR volta formatado
    const ok = await call('POST', '/api/propriedades', dadosPropriedade({ car: 'pr-4127106-1234.abcd.abcd.abcd.abcd.abcd.abcd.abcd' }), t);
    expect(ok.status).toBe(201);
    expect(ok.body?.car).toBe('PR-4127106-1234.ABCD.ABCD.ABCD.ABCD.ABCD.ABCD.ABCD');
  });

  it('impede o mesmo CAR, CCIR ou centroide em dois usuários, sem revelar quem cadastrou', async () => {
    const dono = await usuario('dono@exemplo.com', '11144477735');
    const intruso = await usuario('intruso@exemplo.com', '39053344705');
    const original = dadosPropriedade({ nome: 'Fazenda Secreta do João' });
    expect((await call('POST', '/api/propriedades', original, dono)).status).toBe(201);

    for (const [campo, tentativa] of [
      ['car', dadosPropriedade({ car: original.car })],
      ['ccir', dadosPropriedade({ ccir: original.ccir })],
      // mesmo ponto (a ~20 m): mesmo com CAR e CCIR novos é a mesma propriedade
      ['latitude', dadosPropriedade({ latitude: (original.latitude as number) + 0.0002, longitude: original.longitude })],
    ] as const) {
      const r = await call('POST', '/api/propriedades', tentativa, intruso);
      expect(r.status, campo).toBe(409);
      expect(r.body?.details, campo).toHaveProperty(campo);
      expect(r.text).not.toContain('João');
      expect(r.text).not.toContain('Secreta');
      expect(r.text).not.toContain('dono@exemplo.com');
    }
    // nada foi criado para o intruso
    expect((await call('GET', '/api/propriedades', undefined, intruso)).body).toMatchObject({ total: 0 });
  });

  it('o CAR comparado ignora pontuação e maiúsculas', async () => {
    const a = await usuario('p1@exemplo.com', '16899535009');
    const b = await usuario('p2@exemplo.com', '93541134780');
    const original = dadosPropriedade();
    await call('POST', '/api/propriedades', original, a);
    const disfarçado = dadosPropriedade({ car: String(original.car).toLowerCase().replace(/(.{4})/g, '$1.') });
    const r = await call('POST', '/api/propriedades', disfarçado, b);
    expect(r.status).toBe(409);
  });

  it('o próprio usuário também não duplica, e a mensagem cita a propriedade dele', async () => {
    const t = await usuario('solo@exemplo.com', '74602538045');
    const original = dadosPropriedade({ nome: 'Sítio Aurora' });
    expect((await call('POST', '/api/propriedades', original, t)).status).toBe(201);
    const repetida = await call('POST', '/api/propriedades', dadosPropriedade({ car: original.car }), t);
    expect(repetida.status).toBe(409);
    expect(repetida.body?.details?.car).toContain('Sítio Aurora');
  });

  it('vizinhos distantes (acima do raio) convivem, e editar a si mesmo não conflita', async () => {
    const a = await usuario('viz1@exemplo.com', '28491530797');
    const b = await usuario('viz2@exemplo.com', '61508294305');
    const dadosA = dadosPropriedade({ latitude: -23.0, longitude: -50.0 });
    const criada = await call('POST', '/api/propriedades', dadosA, a);
    expect(criada.status).toBe(201);
    // ~110 m ao sul (2x o raio): é outra propriedade
    const metros = RAIO_DE_DUPLICIDADE_M * 2;
    const vizinha = await call(
      'POST',
      '/api/propriedades',
      dadosPropriedade({ latitude: -23.0 - metros / 111_195, longitude: -50.0 }),
      b,
    );
    expect(vizinha.status).toBe(201);
    // editar a própria propriedade (mesmo CAR/CCIR/ponto) funciona
    const edit = await call('PUT', `/api/propriedades/${criada.body?.id}`, { ...dadosA, nome: 'Renomeada' }, a);
    expect(edit.status).toBe(200);
    // mas não dá para "migrar" o CAR para o de outro usuário
    const roubo = await call('PUT', `/api/propriedades/${criada.body?.id}`, { ...dadosA, car: vizinha.body?.car }, a);
    expect(roubo.status).toBe(409);
    expect(roubo.body?.details).toHaveProperty('car');
  });
});
