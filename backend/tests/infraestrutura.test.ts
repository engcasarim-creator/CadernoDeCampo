import { mkdtemp, readdir, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SMTPServer } from 'smtp-server';
import { afterAll, describe, expect, it } from 'vitest';
import { criarEmailSender, EmailDesativado, NodemailerEmailSender } from '../src/shared/email';
import { ArmazenamentoLocal } from '../src/shared/storage';
import { loadEnv } from '../src/config/env';
import { nomeSeguro, pareceUmPdf } from '../src/modules/contestacoes/pdf';

describe('e-mail via SMTP (servidor SMTP de verdade, local)', () => {
  const recebidos: string[] = [];
  const servidor = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    onData(stream, _sessao, callback) {
      const partes: Buffer[] = [];
      stream.on('data', (parte: Buffer) => partes.push(parte));
      stream.on('end', () => {
        recebidos.push(Buffer.concat(partes).toString('utf8'));
        callback();
      });
    },
  });
  const porta = new Promise<number>((resolve) => servidor.listen(0, '127.0.0.1', () => resolve((servidor.server.address() as AddressInfo).port)));
  afterAll(() => new Promise<void>((resolve) => servidor.close(() => resolve())));

  it('entrega o e-mail ao servidor SMTP', async () => {
    const sender = new NodemailerEmailSender({ host: '127.0.0.1', port: await porta, secure: false, user: '', password: '', from: 'Caderno <nao-responda@exemplo.com>' });
    const resultado = await sender.enviar({ para: 'produtor@exemplo.com', assunto: 'Pedido deferido', texto: 'Motivo: documentos conferem.' });
    expect(resultado).toBe('ENVIADO');
    expect(recebidos).toHaveLength(1);
    expect(recebidos[0]).toContain('To: produtor@exemplo.com');
    expect(recebidos[0]).toContain('Subject: Pedido deferido');
    expect(recebidos[0]).toContain('Motivo: documentos conferem.');
  });

  it('devolve FALHOU (sem lançar erro) quando o servidor não responde', async () => {
    const sender = new NodemailerEmailSender({ host: '127.0.0.1', port: 1, secure: false, user: '', password: '', from: 'a@b.com' });
    expect(await sender.enviar({ para: 'x@y.com', assunto: 'a', texto: 'b' })).toBe('FALHOU');
  });

  it('sem SMTP configurado usa o e-mail desativado', async () => {
    expect(criarEmailSender(null)).toBeInstanceOf(EmailDesativado);
    expect(await criarEmailSender(null).enviar({ para: 'x@y.com', assunto: 'a', texto: 'b' })).toBe('NAO_CONFIGURADO');
  });
});

describe('configuração (SMTP e uploads)', () => {
  it('lê SMTP_* e UPLOADS_DIR do ambiente; sem SMTP_HOST o e-mail fica desativado', () => {
    const antes = { ...process.env };
    Object.assign(process.env, { DB_HOST: 'h', DB_NAME: 'n', DB_USER: 'u', DB_PASSWORD: 'p', JWT_SECRET: 's' });
    try {
      delete process.env.SMTP_HOST;
      delete process.env.UPLOADS_DIR;
      expect(loadEnv().smtp).toBeNull();
      expect(loadEnv().uploadsDir).toBe('./uploads');
      Object.assign(process.env, { SMTP_HOST: 'smtp.exemplo.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'u@exemplo.com', SMTP_PASSWORD: 'x', UPLOADS_DIR: '/data/up' });
      expect(loadEnv().smtp).toMatchObject({ host: 'smtp.exemplo.com', port: 465, secure: true, from: 'u@exemplo.com' });
      expect(loadEnv().uploadsDir).toBe('/data/up');
    } finally {
      process.env = antes;
    }
  });
});

describe('armazenamento local de arquivos', () => {
  const pastas: string[] = [];
  afterAll(async () => {
    await Promise.all(pastas.map((p) => rm(p, { recursive: true, force: true })));
  });
  const novo = async () => {
    const pasta = await mkdtemp(join(tmpdir(), 'uploads-'));
    pastas.push(pasta);
    return { pasta, armazenamento: new ArmazenamentoLocal(join(pasta, 'sub')) };
  };

  it('salva, lê e remove', async () => {
    const { pasta, armazenamento } = await novo();
    await armazenamento.salvar('a1.pdf', Buffer.from('%PDF-1.4 oi'));
    expect((await armazenamento.ler('a1.pdf')).toString()).toBe('%PDF-1.4 oi');
    await armazenamento.remover('a1.pdf');
    await armazenamento.remover('a1.pdf'); // remover de novo não falha
    await expect(armazenamento.ler('a1.pdf')).rejects.toThrow();
    expect(await readdir(join(pasta, 'sub'))).toEqual([]);
  });

  it('não sobrescreve arquivo existente', async () => {
    const { armazenamento } = await novo();
    await armazenamento.salvar('x.pdf', Buffer.from('1'));
    await expect(armazenamento.salvar('x.pdf', Buffer.from('2'))).rejects.toThrow();
    expect((await armazenamento.ler('x.pdf')).toString()).toBe('1');
  });

  it.each(['../fora.pdf', '..', 'a/b.pdf', '/etc/passwd', 'a\\b.pdf', '', '.oculto', 'a..b/../c'])('recusa a chave perigosa %j', async (chave) => {
    const { armazenamento } = await novo();
    await expect(armazenamento.salvar(chave, Buffer.from('x'))).rejects.toThrow('Chave de arquivo inválida');
    await expect(armazenamento.ler(chave)).rejects.toThrow('Chave de arquivo inválida');
  });
});

describe('utilitários de PDF', () => {
  it('reconhece PDF pelo conteúdo, não pela extensão', () => {
    expect(pareceUmPdf(Buffer.from('%PDF-1.7\n...'))).toBe(true);
    expect(pareceUmPdf(Buffer.from('<html>%PDF-</html>'))).toBe(false);
    expect(pareceUmPdf(Buffer.from('%PDF'))).toBe(false);
    expect(pareceUmPdf(Buffer.alloc(0))).toBe(false);
  });

  it('limpa o nome do arquivo (caminho, controle, tamanho, acentos do multer em latin1)', () => {
    expect(nomeSeguro('../../etc/passwd.pdf')).toBe('passwd.pdf');
    expect(nomeSeguro('C:\\Users\\x\\prova.pdf')).toBe('prova.pdf');
    expect(nomeSeguro('a\u0000b\nc.pdf')).toBe('abc.pdf');
    expect(nomeSeguro(`${'a'.repeat(300)}.pdf`)).toHaveLength(150);
    expect(nomeSeguro('')).toBe('documento.pdf');
    expect(nomeSeguro(Buffer.from('matrícula.pdf', 'utf8').toString('latin1'))).toBe('matrícula.pdf');
  });
});
