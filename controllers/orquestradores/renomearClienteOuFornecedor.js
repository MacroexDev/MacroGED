import { renomearPastaEntidade, renomearOcorrenciasNomeEntidade } from '../fileManager.js';
import { sanitizarNome } from '../../utils/sanitizar.js';

/**
 * Orquestra a renomeação da pasta e das ocorrências de nome em arquivos e subpastas
 * @param {'cliente'|'fornecedor'} tipo 
 * @param {string} nomeAntigo 
 * @param {string} nomeNovo 
 */
export async function renomearClienteOuFornecedor(tipo, nomeAntigo, nomeNovo) {
  if (!nomeAntigo || !nomeNovo) throw new Error('Nome antigo e novo são obrigatórios');

  const nomeAntigoLimpo = sanitizarNome(nomeAntigo);
  const nomeNovoLimpo = sanitizarNome(nomeNovo);

  // Renomeia a pasta raiz do cliente ou fornecedor
  renomearPastaEntidade(tipo, nomeAntigoLimpo, nomeNovoLimpo);

  // Renomeia todas as ocorrências internas na árvore geral
  renomearOcorrenciasNomeEntidade(nomeAntigoLimpo, nomeNovoLimpo);

  return `✅ Todas as ocorrências de "${nomeAntigoLimpo}" foram renomeadas para "${nomeNovoLimpo}"`;
}
