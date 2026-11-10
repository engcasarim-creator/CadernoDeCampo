import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ArmazenamentoDeArquivos } from './ArmazenamentoDeArquivos';

const CHAVE_VALIDA = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/** Guarda os arquivos numa pasta do disco (no Docker, um volume nomeado, então sobrevive a recriar o container). */
export class ArmazenamentoLocal implements ArmazenamentoDeArquivos {
  constructor(private readonly pasta: string) {}

  #caminho(chave: string): string {
    if (!CHAVE_VALIDA.test(chave) || chave.includes('..')) throw new Error('Chave de arquivo inválida');
    return join(this.pasta, chave);
  }

  async salvar(chave: string, conteudo: Buffer): Promise<void> {
    await mkdir(this.pasta, { recursive: true });
    // 'wx': nunca sobrescreve um arquivo existente.
    await writeFile(this.#caminho(chave), conteudo, { flag: 'wx', mode: 0o640 });
  }

  async ler(chave: string): Promise<Buffer> {
    return readFile(this.#caminho(chave));
  }

  async remover(chave: string): Promise<void> {
    await rm(this.#caminho(chave), { force: true });
  }
}
