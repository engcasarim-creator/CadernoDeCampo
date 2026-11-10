import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Testes de arquitetura: garantem as regras das fatias verticais (feature-based).
 *  1. `shared/` nunca depende de um módulo de domínio.
 *  2. Um módulo só usa outro pela porta de entrada (`../outro`, o index.ts), nunca por arquivos internos.
 *  3. Não há ciclos entre módulos.
 */
const SRC = join(__dirname, '..', 'src');
const MODULES = join(SRC, 'modules');

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : caminho.endsWith('.ts') ? [caminho] : [];
  });
}

/** Imports relativos de um arquivo, já resolvidos para caminhos dentro de src (sem extensão). */
function importsDe(arquivo: string): string[] {
  const texto = readFileSync(arquivo, 'utf8');
  const alvos = [...texto.matchAll(/from\s+'(\.[^']*)'/g)].map((m) => m[1]);
  return alvos.map((alvo) => join(arquivo, '..', alvo));
}

const moduloDe = (caminho: string): string | null => {
  const partes = relative(MODULES, caminho).split(sep);
  return partes[0] && !partes[0].startsWith('..') ? partes[0] : null;
};

const nomesDeModulos = readdirSync(MODULES).filter((nome) => statSync(join(MODULES, nome)).isDirectory());

describe('arquitetura por módulos', () => {
  it('shared/ não depende de módulos de domínio', () => {
    const violacoes = arquivos(join(SRC, 'shared')).flatMap((arq) =>
      importsDe(arq)
        .filter((alvo) => alvo.startsWith(MODULES))
        .map((alvo) => `${relative(SRC, arq)} -> ${relative(SRC, alvo)}`),
    );
    expect(violacoes).toEqual([]);
  });

  it('um módulo só acessa outro pela porta de entrada (index.ts)', () => {
    const violacoes: string[] = [];
    for (const modulo of nomesDeModulos) {
      for (const arq of arquivos(join(MODULES, modulo))) {
        for (const alvo of importsDe(arq)) {
          const destino = alvo.startsWith(MODULES) ? moduloDe(alvo) : null;
          if (destino && destino !== modulo && alvo !== join(MODULES, destino)) {
            violacoes.push(`${relative(SRC, arq)} -> ${relative(SRC, alvo)}`);
          }
        }
      }
    }
    expect(violacoes).toEqual([]);
  });

  it('não há dependência circular entre módulos', () => {
    const grafo = new Map<string, Set<string>>();
    for (const modulo of nomesDeModulos) {
      const deps = new Set<string>();
      for (const arq of arquivos(join(MODULES, modulo))) {
        for (const alvo of importsDe(arq)) {
          const destino = alvo.startsWith(MODULES) ? moduloDe(alvo) : null;
          if (destino && destino !== modulo) deps.add(destino);
        }
      }
      grafo.set(modulo, deps);
    }
    const visitando = new Set<string>();
    const concluidos = new Set<string>();
    const ciclos: string[] = [];
    const visitar = (modulo: string, caminho: string[]): void => {
      if (concluidos.has(modulo)) return;
      if (visitando.has(modulo)) {
        ciclos.push([...caminho, modulo].join(' -> '));
        return;
      }
      visitando.add(modulo);
      grafo.get(modulo)?.forEach((dep) => visitar(dep, [...caminho, modulo]));
      visitando.delete(modulo);
      concluidos.add(modulo);
    };
    nomesDeModulos.forEach((m) => visitar(m, []));
    expect(ciclos).toEqual([]);
  });
});
