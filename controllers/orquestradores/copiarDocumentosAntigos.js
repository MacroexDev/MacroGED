import { buscarDadosDoCliente } from '../../services/processoService.js';
import { copiarDocumentosAntigosParaCliente } from '../fileManager.js';
import { sanitizarNome } from '../../utils/sanitizar.js';

/**
 * Orquestra a cópia de documentos antigos para a pasta do cliente,
 * usando o PROCESS_ID como ID_CLIENTE.
 */
export async function copiarDocumentosAntigos(idCliente) {
  const dados = await buscarDadosDoCliente(idCliente);
  if (!dados || !dados.nomeCliente) throw new Error('Cliente não encontrado');

  const nomeClienteLimpo = sanitizarNome(dados.nomeCliente);
  copiarDocumentosAntigosParaCliente(nomeClienteLimpo);

  return `📂 Documentos antigos copiados para ${nomeClienteLimpo}`;
}
