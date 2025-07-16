import { buscarCaminhoGedPorDocumento } from '../../services/processoService.js';
import { moverArquivoParaApagados } from '../fileManager.js';

/**
 * Orquestra a movimentação de um arquivo para a pasta APAGADOS,
 * buscando o caminho através do ID_DOCUMENTO_ARQUIVOS (PROCESS_ID).
 */
export async function moverParaApagados(idDocumentoArquivos) {
  const caminhoRelativo = await buscarCaminhoGedPorDocumento(idDocumentoArquivos);
  moverArquivoParaApagados(caminhoRelativo, idDocumentoArquivos);

  return `🗃️ Arquivo ${caminhoRelativo} movido para a pasta APAGADOS`;
}
