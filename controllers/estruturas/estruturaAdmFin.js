import { criarPasta } from '../fileManager.js';

/**
 * Cria a estrutura administrativa e financeira fixa.
 */
export function criarEstruturaAdmFin() {
  criarPasta('DOCUMENTOS MACROAPP/ADM+FIN/FINANCEIRO');
  criarPasta('DOCUMENTOS MACROAPP/ADM+FIN/FORNECEDORES');
}
