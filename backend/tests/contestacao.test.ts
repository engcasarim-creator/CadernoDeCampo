import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { ConflictError } from '../src/shared/errors';
import { EmailDesativado } from '../src/shared/email';
import {
  ArmazenamentoEmMemoria,
  buildContainer,
  EmailEmMemoria,
  InMemoryContestacoes,
} from './helpers/buildContainer';
import { dadosPropriedade } from './helpers/propriedadeValida';

const ADMIN = { email: 'root@exemplo.com', nome: 'Root', cpf: '12345678909', senha: 'Admin@12345' };
const PDF = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n';

interface Resp {
  id?: number;
  token?: string;
  usuario?: { id: number };
  message?: string;
  details?: Record<string, string>;
  status?: string;
  decisao?: string | null;
  emailStatus?: string | null;
  arquivos?: Array<Record<string, unknown> & { id: number; nomeOriginal: string }>;
  total?: number;
  naoLidas?: number;
  data?: Array<Record<string, unknown> & { id: number; titulo?: string; mensagem?: string; lida?: boolean }>;
  contestacao?: Resp;
  solicitante?: { email: string } | null;
  propriedade?: { responsavel: { email: string } } | null;
}

let server: Server;
let base: string;
let email: EmailEmMemoria;
let armazenamento: ArmazenamentoEmMemoria;
let contestacoes: InMemoryContestacoes;
let falharTransferencia = false;

async function call(method: string, path: string, body?: unknown, token?: string) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: (text ? JSON.parse(text) : null) as Resp | null };
}

type Arquivo = { nome: string; conteudo: string | Uint8Array; tipo?: string };
const pdf = (nome = 'matricula.pdf', conteudo: string | Uint8Array = PDF): Arquivo => ({ nome, conteudo, tipo: 'application/pdf' });

async function enviar(token: string | undefined, campos: Record<string, string>, arquivos: Arquivo[]) {
  const form = new FormData();
  for (const [chave, valor] of Object.entries(campos)) form.append(chave, valor);
  for (const a of arquivos) form.append('arquivos', new Blob([a.conteudo as BlobPart], { type: a.tipo ?? 'application/pdf' }), a.nome);
  const response = await fetch(`${base}/api/contestacoes`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const text = await response.text();
  return { status: response.status, texto: text, body: (text ? JSON.parse(text) : null) as Resp | null };
}

async function entrar(emailUsuario: string, senha: string) {
  const r = await call('POST', '/api/auth/login', { email: emailUsuario, senha });
  return { token: r.body?.token as string, id: r.body?.usuario?.id as number };
}

let seq = 0;

/** CPF válido e diferente a cada chamada (dígitos verificadores calculados). */
function cpfNovo(): string {
  const base = String(100000000 + ++seq * 7919).slice(0, 9).split('').map(Number);
  const digito = (nums: number[]) => {
    const soma = nums.reduce((acc, n, i) => acc + n * (nums.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(base);
  const d2 = digito([...base, d1]);
  return [...base, d1, d2].join('');
}

async function cadastrar(prefixo: string) {
  const emailUsuario = `${prefixo}${seq + 1}@exemplo.com`;
  await call('POST', '/api/auth/register', { nome: `Pessoa ${prefixo}`, email: emailUsuario, senha: 'Senha@123', cpf: cpfNovo() });
  return { ...(await entrar(emailUsuario, 'Senha@123')), email: emailUsuario };
}

/** Cenário padrão: `dono` cadastrou a propriedade; `real` é quem vai contestar. */
async function cenario() {
  const [dono, real] = [await cadastrar('dono'), await cadastrar('real')];
  const dados = dadosPropriedade();
  const criada = await call('POST', '/api/propriedades', dados, dono.token);
  const admin = await entrar(ADMIN.email, ADMIN.senha);
  const pedido = { car: String(dados.car), ccir: String(dados.ccir), justificativa: 'Sou o proprietário: matrícula e ITR em anexo.' };
  return { dono, real, admin, dados, propriedadeId: criada.body?.id as number, pedido };
}

beforeAll(async () => {
  email = new EmailEmMemoria();
  armazenamento = new ArmazenamentoEmMemoria();
  contestacoes = new InMemoryContestacoes();
  const container = buildContainer({
    admin: ADMIN,
    email,
    arquivos: armazenamento,
    contestacoes,
    envolverAdminPropriedades: (admin) => ({
      listar: (r, b) => admin.listar(r, b),
      buscarPorId: (id) => admin.buscarPorId(id),
      listarTransferencias: (id) => admin.listarTransferencias(id),
      transferir: async (t) => {
        if (falharTransferencia) throw new ConflictError('O responsável por esta propriedade mudou.');
        await admin.transferir(t);
      },
    }),
  });
  await container.iniciar();
  server = createApp(container).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
  email.enviados.length = 0;
  email.resultado = 'ENVIADO';
  falharTransferencia = false;
});

describe('abrir contestação (dono real)', () => {
  it('abre o pedido com PDFs e o guarda; a resposta não vaza chave de arquivo nem dados do outro dono', async () => {
    const { real, dono, pedido } = await cenario();
    const r = await enviar(real.token, pedido, [pdf('matricula.pdf'), pdf('itr.pdf')]);
    expect(r.status).toBe(201);
    expect(r.body?.status).toBe('EM_ANALISE');
    expect(r.body?.arquivos).toHaveLength(2);
    expect(r.body?.arquivos?.[0]).not.toHaveProperty('chave');
    expect(armazenamento.arquivos.size).toBeGreaterThanOrEqual(2);
    expect(r.texto).not.toContain(dono.email);
    expect(r.texto).not.toContain('propriedadeId');
  });

  it('exige login', async () => {
    const { pedido } = await cenario();
    expect((await enviar(undefined, pedido, [pdf()])).status).toBe(401);
  });

  it.each([
    ['sem anexo', () => [] as Arquivo[]],
    ['conteúdo que não é PDF (extensão trocada)', () => [pdf('falso.pdf', 'MZ\u0090\u0000 executável')]],
    ['extensão diferente de .pdf', () => [pdf('prova.exe')]],
    ['tipo MIME diferente de PDF', () => [{ nome: 'prova.pdf', conteudo: PDF, tipo: 'image/png' }]],
    ['mais de 5 arquivos', () => Array.from({ length: 6 }, (_, i) => pdf(`a${i}.pdf`))],
    ['arquivo maior que 5 MB', () => [pdf('grande.pdf', `%PDF-1.4\n${'x'.repeat(5 * 1024 * 1024 + 10)}`)]],
  ])('recusa (400): %s', async (_nome, arquivos) => {
    const { real, pedido } = await cenario();
    const antes = armazenamento.arquivos.size;
    const r = await enviar(real.token, pedido, arquivos());
    expect(r.status).toBe(400);
    expect(r.body?.details?.arquivos).toBeTruthy();
    expect(armazenamento.arquivos.size).toBe(antes);
  });

  it('valida justificativa, CAR e CCIR', async () => {
    const { real, pedido } = await cenario();
    const curta = await enviar(real.token, { ...pedido, justificativa: 'curta' }, [pdf()]);
    expect(curta.status).toBe(400);
    expect(curta.body?.details?.justificativa).toBeTruthy();
    const car = await enviar(real.token, { ...pedido, car: 'abc' }, [pdf()]);
    expect(car.body?.details?.car).toBeTruthy();
    const ccir = await enviar(real.token, { ...pedido, ccir: '123' }, [pdf()]);
    expect(ccir.body?.details?.ccir).toBeTruthy();
  });

  it('recusa CAR que não está cadastrado, o próprio imóvel e pedido repetido', async () => {
    const { real, dono, pedido, dados } = await cenario();
    const outroCar = `PR-4127106-${'F'.repeat(32)}`;
    expect((await enviar(real.token, { car: outroCar, justificativa: pedido.justificativa }, [pdf()])).status).toBe(400);
    expect((await enviar(dono.token, pedido, [pdf()])).status).toBe(409);
    expect((await enviar(real.token, { ...pedido, ccir: String(dados.ccir) }, [pdf()])).status).toBe(201);
    expect((await enviar(real.token, pedido, [pdf()])).status).toBe(409);
  });

  it('o nome do arquivo não chega ao disco (chave gerada) e é limpo', async () => {
    const { real, pedido } = await cenario();
    const r = await enviar(real.token, pedido, [pdf('../../etc/passwd.pdf')]);
    expect(r.status).toBe(201);
    expect(r.body?.arquivos?.[0]?.nomeOriginal).toBe('passwd.pdf');
    expect([...armazenamento.arquivos.keys()].every((k) => /^[0-9a-f-]{36}\.pdf$/.test(k))).toBe(true);
  });
});

describe('saída para o dono real no cadastro bloqueado', () => {
  it('o 409 do cadastro indica "contestável" só quando o conflito é com OUTRO usuário', async () => {
    const { real, dono, dados } = await cenario();
    const outro = await call('POST', '/api/propriedades', dados, real.token);
    expect(outro.status).toBe(409);
    expect(outro.body?.details?.contestavel).toBeTruthy();
    expect(JSON.stringify(outro.body)).not.toContain(dono.email);
    const proprio = await call('POST', '/api/propriedades', dados, dono.token);
    expect(proprio.status).toBe(409);
    expect(proprio.body?.details?.contestavel).toBeUndefined();
  });
});

describe('isolamento: cada um vê só o que é seu', () => {
  it('outro usuário e o dono contestado recebem 404 no pedido e no arquivo', async () => {
    const { real, dono, pedido } = await cenario();
    const outro = await cadastrar('curioso');
    const criada = (await enviar(real.token, pedido, [pdf()])).body as Resp;
    const arquivoId = criada.arquivos?.[0]?.id;
    for (const intruso of [outro, dono]) {
      expect((await call('GET', `/api/contestacoes/${criada.id}`, undefined, intruso.token)).status).toBe(404);
      expect((await call('GET', `/api/contestacoes/${criada.id}/arquivos/${arquivoId}`, undefined, intruso.token)).status).toBe(404);
      expect((await call('GET', '/api/contestacoes', undefined, intruso.token)).body?.total).toBe(0);
    }
    const meu = await call('GET', `/api/contestacoes/${criada.id}`, undefined, real.token);
    expect(meu.status).toBe(200);
    const arquivo = await fetch(`${base}/api/contestacoes/${criada.id}/arquivos/${arquivoId}`, { headers: { Authorization: `Bearer ${real.token}` } });
    expect(arquivo.status).toBe(200);
    expect(arquivo.headers.get('content-type')).toContain('application/pdf');
    expect(await arquivo.text()).toBe(PDF);
  });

  it('a área de administração é só para ADMIN', async () => {
    const { real, pedido } = await cenario();
    const criada = (await enviar(real.token, pedido, [pdf()])).body as Resp;
    for (const [metodo, caminho, corpo] of [
      ['GET', '/api/admin/contestacoes', undefined],
      ['GET', `/api/admin/contestacoes/${criada.id}`, undefined],
      ['GET', `/api/admin/contestacoes/${criada.id}/arquivos/${criada.arquivos?.[0]?.id}`, undefined],
      ['PUT', `/api/admin/contestacoes/${criada.id}/decisao`, { decisao: 'DEFERIDA', motivo: 'Documentos conferem.' }],
    ] as const) {
      expect((await call(metodo, caminho, corpo)).status).toBe(401);
      expect((await call(metodo, caminho, corpo, real.token)).status).toBe(403);
    }
  });
});

describe('decisão do administrador', () => {
  it('DEFERIDA: lê o PDF, transfere a propriedade, avisa no sistema e por e-mail', async () => {
    const { real, dono, admin, propriedadeId, pedido } = await cenario();
    const criada = (await enviar(real.token, pedido, [pdf('matricula.pdf')])).body as Resp;

    const fila = await call('GET', '/api/admin/contestacoes?status=EM_ANALISE', undefined, admin.token);
    expect(fila.body?.data?.some((c) => c.id === criada.id)).toBe(true);
    const detalhe = await call('GET', `/api/admin/contestacoes/${criada.id}`, undefined, admin.token);
    expect(detalhe.body?.propriedade?.responsavel.email).toBe(dono.email);
    expect(detalhe.body?.solicitante?.email).toBe(real.email);
    const pdfAdmin = await fetch(`${base}/api/admin/contestacoes/${criada.id}/arquivos/${criada.arquivos?.[0]?.id}`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    expect(await pdfAdmin.text()).toBe(PDF);

    const motivo = 'Matrícula e ITR em nome do solicitante.';
    const decidida = await call('PUT', `/api/admin/contestacoes/${criada.id}/decisao`, { decisao: 'DEFERIDA', motivo }, admin.token);
    expect(decidida.status).toBe(200);
    expect(decidida.body?.contestacao?.status).toBe('DEFERIDA');
    expect(decidida.body?.contestacao?.emailStatus).toBe('ENVIADO');

    // A propriedade passou para o solicitante.
    expect((await call('GET', `/api/propriedades/${propriedadeId}`, undefined, real.token)).status).toBe(200);
    expect((await call('GET', `/api/propriedades/${propriedadeId}`, undefined, dono.token)).status).toBe(404);

    // Aviso no sistema.
    const avisos = await call('GET', '/api/notificacoes', undefined, real.token);
    expect(avisos.body?.naoLidas).toBe(1);
    expect(avisos.body?.data?.[0]?.titulo).toContain('deferido');
    expect(avisos.body?.data?.[0]?.mensagem).toContain(motivo);
    expect((await call('PUT', `/api/notificacoes/${avisos.body?.data?.[0]?.id}/lida`, undefined, real.token)).status).toBe(204);
    expect((await call('GET', '/api/notificacoes', undefined, real.token)).body?.naoLidas).toBe(0);
    // O aviso é só do solicitante.
    expect((await call('GET', '/api/notificacoes', undefined, dono.token)).body?.total).toBe(0);

    // E-mail.
    expect(email.enviados).toHaveLength(1);
    expect(email.enviados[0]).toMatchObject({ para: real.email });
    expect(email.enviados[0]?.texto).toContain('DEFERIDO');
    expect(email.enviados[0]?.texto).toContain(motivo);

    // O solicitante vê a decisão no próprio pedido.
    const meu = await call('GET', `/api/contestacoes/${criada.id}`, undefined, real.token);
    expect(meu.body).toMatchObject({ status: 'DEFERIDA', decisao: motivo });
  });

  it('INDEFERIDA: a propriedade fica com o dono atual e o solicitante é avisado com o motivo', async () => {
    const { real, dono, admin, propriedadeId, pedido } = await cenario();
    const criada = (await enviar(real.token, pedido, [pdf()])).body as Resp;
    const motivo = 'Documento ilegível: envie a matrícula atualizada.';
    const r = await call('PUT', `/api/admin/contestacoes/${criada.id}/decisao`, { decisao: 'INDEFERIDA', motivo }, admin.token);
    expect(r.body?.contestacao?.status).toBe('INDEFERIDA');
    expect((await call('GET', `/api/propriedades/${propriedadeId}`, undefined, dono.token)).status).toBe(200);
    expect((await call('GET', `/api/propriedades/${propriedadeId}`, undefined, real.token)).status).toBe(404);
    expect(email.enviados[0]?.texto).toContain('INDEFERIDO');
    expect(email.enviados[0]?.texto).toContain(motivo);
    expect((await call('GET', '/api/notificacoes', undefined, real.token)).body?.data?.[0]?.titulo).toContain('indeferido');
    // Depois de decidido, pode abrir um novo pedido.
    expect((await enviar(real.token, pedido, [pdf()])).status).toBe(201);
  });

  it('valida o corpo: decisão inválida e motivo curto ou longo demais', async () => {
    const { real, admin, pedido } = await cenario();
    const criada = (await enviar(real.token, pedido, [pdf()])).body as Resp;
    const url = `/api/admin/contestacoes/${criada.id}/decisao`;
    expect((await call('PUT', url, { decisao: 'TALVEZ', motivo: 'Motivo válido aqui.' }, admin.token)).status).toBe(400);
    expect((await call('PUT', url, { decisao: 'DEFERIDA', motivo: 'curto' }, admin.token)).status).toBe(400);
    expect((await call('PUT', url, { decisao: 'DEFERIDA', motivo: 'x'.repeat(301) }, admin.token)).status).toBe(400);
    expect((await call('PUT', '/api/admin/contestacoes/99999/decisao', { decisao: 'DEFERIDA', motivo: 'Motivo válido aqui.' }, admin.token)).status).toBe(404);
    expect((await call('GET', `/api/admin/contestacoes/${criada.id}`, undefined, admin.token)).body?.contestacao?.status).toBe('EM_ANALISE');
  });

  it('não decide duas vezes, nem com duas decisões simultâneas', async () => {
    const { real, admin, pedido } = await cenario();
    const criada = (await enviar(real.token, pedido, [pdf()])).body as Resp;
    const url = `/api/admin/contestacoes/${criada.id}/decisao`;
    const [a, b] = await Promise.all([
      call('PUT', url, { decisao: 'DEFERIDA', motivo: 'Documentos conferem.' }, admin.token),
      call('PUT', url, { decisao: 'INDEFERIDA', motivo: 'Documentos não conferem.' }, admin.token),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect((await call('PUT', url, { decisao: 'INDEFERIDA', motivo: 'Outra tentativa depois.' }, admin.token)).status).toBe(409);
    expect(email.enviados).toHaveLength(1);
  });

  it('se a transferência falhar, o pedido volta para EM_ANALISE e ninguém é avisado', async () => {
    const { real, admin, pedido } = await cenario();
    const criada = (await enviar(real.token, pedido, [pdf()])).body as Resp;
    const url = `/api/admin/contestacoes/${criada.id}/decisao`;
    falharTransferencia = true;
    expect((await call('PUT', url, { decisao: 'DEFERIDA', motivo: 'Documentos conferem.' }, admin.token)).status).toBe(409);
    expect((await call('GET', `/api/contestacoes/${criada.id}`, undefined, real.token)).body).toMatchObject({ status: 'EM_ANALISE', decisao: null });
    expect(email.enviados).toHaveLength(0);
    expect((await call('GET', '/api/notificacoes', undefined, real.token)).body?.total).toBe(0);
    falharTransferencia = false;
    expect((await call('PUT', url, { decisao: 'DEFERIDA', motivo: 'Documentos conferem.' }, admin.token)).status).toBe(200);
  });

  it('falha no e-mail não desfaz a decisão: o status do e-mail fica registrado e o aviso no sistema existe', async () => {
    for (const resultado of ['FALHOU', 'NAO_CONFIGURADO'] as const) {
      const { real, admin, pedido } = await cenario();
      const criada = (await enviar(real.token, pedido, [pdf()])).body as Resp;
      email.resultado = resultado;
      const r = await call('PUT', `/api/admin/contestacoes/${criada.id}/decisao`, { decisao: 'INDEFERIDA', motivo: 'Documentos insuficientes.' }, admin.token);
      expect(r.status).toBe(200);
      expect(r.body?.contestacao?.status).toBe('INDEFERIDA');
      expect(r.body?.contestacao?.emailStatus).toBe(resultado);
      expect((await call('GET', '/api/notificacoes', undefined, real.token)).body?.naoLidas).toBe(1);
    }
  });

  it('propriedade excluída depois do pedido: só pode ser indeferido', async () => {
    const { real, dono, admin, propriedadeId, pedido } = await cenario();
    const criada = (await enviar(real.token, pedido, [pdf()])).body as Resp;
    expect((await call('DELETE', `/api/propriedades/${propriedadeId}`, undefined, dono.token)).status).toBe(204);
    // No MySQL a FK zera propriedade_id; aqui simulamos o mesmo efeito.
    const url = `/api/admin/contestacoes/${criada.id}/decisao`;
    const deferir = await call('PUT', url, { decisao: 'DEFERIDA', motivo: 'Documentos conferem.' }, admin.token);
    expect([409, 404]).toContain(deferir.status);
    expect((await call('PUT', url, { decisao: 'INDEFERIDA', motivo: 'Propriedade não existe mais.' }, admin.token)).status).toBe(200);
  });

  it('filtro de status inválido é recusado', async () => {
    const { admin } = await cenario();
    expect((await call('GET', '/api/admin/contestacoes?status=XYZ', undefined, admin.token)).status).toBe(400);
  });
});

describe('sem armazenamento órfão', () => {
  it('se gravar o pedido falha, os PDFs já salvos são removidos', async () => {
    const quebrado = new InMemoryContestacoes();
    quebrado.criar = async () => {
      throw new Error('banco fora do ar');
    };
    const armaz = new ArmazenamentoEmMemoria();
    const container = buildContainer({ admin: ADMIN, contestacoes: quebrado, arquivos: armaz });
    await container.iniciar();
    const srv = createApp(container).listen(0);
    const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
    try {
      const login = async (e: string) =>
        ((await (await fetch(`${url}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, senha: 'Senha@123' }) })).json()) as Resp).token as string;
      const registrar = (e: string, cpf: string) =>
        fetch(`${url}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Fulano', email: e, senha: 'Senha@123', cpf }) });
      await registrar('a@x.com', cpfNovo());
      await registrar('b@x.com', cpfNovo());
      const dados = dadosPropriedade();
      await fetch(`${url}/api/propriedades`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await login('a@x.com')}` }, body: JSON.stringify(dados) });
      const form = new FormData();
      form.append('car', String(dados.car));
      form.append('justificativa', 'Sou o proprietário: documentos em anexo.');
      form.append('arquivos', new Blob([PDF], { type: 'application/pdf' }), 'a.pdf');
      const r = await fetch(`${url}/api/contestacoes`, { method: 'POST', headers: { Authorization: `Bearer ${await login('b@x.com')}` }, body: form });
      expect(r.status).toBe(500);
      expect(armaz.arquivos.size).toBe(0);
    } finally {
      srv.close();
    }
  });

  it('e-mail desativado (sem SMTP) também é um resultado válido', async () => {
    expect(await new EmailDesativado().enviar()).toBe('NAO_CONFIGURADO');
  });
});
