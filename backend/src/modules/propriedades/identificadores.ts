/**
 * Identificadores oficiais do imóvel rural.
 *
 * CAR  (Cadastro Ambiental Rural, SICAR): UF-CÓDIGO_IBGE_DO_MUNICÍPIO(7)-HASH(32 hexadecimais),
 *      ex.: PR-4127106-A1B2C3D4E5F67890A1B2C3D4E5F67890. O recibo mostra o hash em grupos de 4 separados por ponto.
 * CCIR (Certificado de Cadastro de Imóvel Rural, INCRA): usamos o código do imóvel rural do certificado,
 *      13 dígitos (000.000.000.000-0).
 *
 * Aqui só se confere o FORMATO (e a coerência UF × código do IBGE). Confirmar que o número existe e pertence
 * à pessoa exigiria consulta ao SICAR/INCRA, que este sistema não faz.
 */

/** Código IBGE de cada UF (2 primeiros dígitos do código do município). */
const CODIGO_IBGE_DA_UF: Readonly<Record<string, string>> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27', SE: '28', BA: '29',
  MG: '31', ES: '32', RJ: '33', SP: '35',
  PR: '41', SC: '42', RS: '43',
  MS: '50', MT: '51', GO: '52', DF: '53',
};

const CAR_NORMALIZADO = /^([A-Z]{2})-(\d{7})-([0-9A-F]{32})$/;
const CCIR_NORMALIZADO = /^\d{13}$/;

/** Remove pontos, espaços e hífens extras e usa maiúsculas: forma que vai para o banco. */
export function normalizarCar(texto: string): string {
  const limpo = texto.toUpperCase().replace(/[\s.]/g, '');
  const m = /^([A-Z]{2})-?(\d{7})-?([0-9A-F]{32})$/.exec(limpo);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : limpo;
}

/** Devolve a mensagem de erro do CAR, ou null se estiver correto para a UF informada. */
export function problemaNoCar(car: string, uf: string): string | null {
  const m = CAR_NORMALIZADO.exec(car);
  if (!m) return 'CAR inválido. Formato: UF-1234567-32 caracteres (0-9 e A-F), como no recibo de inscrição.';
  if (m[1] !== uf) return `O CAR começa com ${m[1]}, mas a propriedade está em ${uf}.`;
  if (CODIGO_IBGE_DA_UF[uf] !== undefined && !m[2].startsWith(CODIGO_IBGE_DA_UF[uf])) {
    return `O código do município no CAR não é de ${uf}.`;
  }
  return null;
}

/** Só dígitos: forma que vai para o banco. */
export function normalizarCcir(texto: string): string {
  return texto.replace(/[\s.\-]/g, '');
}

export function problemaNoCcir(ccir: string): string | null {
  return CCIR_NORMALIZADO.test(ccir) ? null : 'CCIR inválido. Informe os 13 dígitos do código do imóvel rural (000.000.000.000-0).';
}

/** Apresentação ao usuário: hash do CAR em grupos de 4 e CCIR com pontuação. */
export function formatarCar(car: string): string {
  const m = CAR_NORMALIZADO.exec(car);
  return m ? `${m[1]}-${m[2]}-${m[3].replace(/(.{4})(?=.)/g, '$1.')}` : car;
}

export function formatarCcir(ccir: string): string {
  return CCIR_NORMALIZADO.test(ccir) ? ccir.replace(/^(\d{3})(\d{3})(\d{3})(\d{3})(\d)$/, '$1.$2.$3.$4-$5') : ccir;
}
