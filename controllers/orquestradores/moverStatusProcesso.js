import { buscarDadosDoProcesso } from '../../services/processoService.js';
import { moverPasta } from '../fileManager.js';
import { sanitizarNome } from '../../utils/sanitizar.js';

const statusMap = {
  1: 'PROCESSOS EM ANDAMENTO',
  2: 'PROCESSOS ENCERRADOS',
  3: 'PROCESSOS SUSPENSOS'
};

/**
 * Move a pasta do processo entre diretórios de status informando os dois códigos (origem e destino).
 */
export async function moverStatusProcesso(idProc, statusAtualCodigo, statusNovoCodigo) {
  const dados = await buscarDadosDoProcesso(idProc);
  if (!dados) throw new Error('Processo não encontrado');

  const statusAtualNome = statusMap[statusAtualCodigo];
  const statusNovoNome = statusMap[statusNovoCodigo];

  if (!statusAtualNome || !statusNovoNome) {
    throw new Error(`Código de status inválido. Recebidos: atual=${statusAtualCodigo}, novo=${statusNovoCodigo}`);
  }

  const { nomeCliente, nomeFornecedor, abrModalidade, codProcesso } = dados;
  const nomePasta = `${codProcesso}-${sanitizarNome(abrModalidade)}-${sanitizarNome(nomeFornecedor)}`;

  const origem = `DOCUMENTOS MACROAPP/OPERACAO/CLIENTES/${sanitizarNome(nomeCliente)}/${statusAtualNome}/${nomePasta}`;
  const destino = `DOCUMENTOS MACROAPP/OPERACAO/CLIENTES/${sanitizarNome(nomeCliente)}/${statusNovoNome}/${nomePasta}`;

  moverPasta(origem, destino);
  return `Movido processo ${codProcesso} de ${statusAtualNome} para ${statusNovoNome}`;
}
