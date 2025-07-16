import { buscarTasksPendentes, finalizarTask } from '../services/database.js';

import { novoCliente } from '../controllers/orquestradores/novoCliente.js';
import { novoFornecedor } from '../controllers/orquestradores/novoFornecedor.js';
import { novoProcesso } from '../controllers/orquestradores/novoProcesso.js';
import { moverStatusProcesso } from '../controllers/orquestradores/moverStatusProcesso.js';
import { salvarArquivoRede } from '../controllers/orquestradores/salvarArquivoRede.js';
import { renomearClienteOuFornecedor } from '../controllers/orquestradores/renomearClienteOuFornecedor.js';
import { moverParaApagados } from '../controllers/orquestradores/moverParaApagados.js';
import { copiarDocumentosAntigos } from '../controllers/orquestradores/copiarDocumentosAntigos.js';

/**
 * Lê todas as tasks pendentes na fila e executa o orquestrador correspondente.
 */
export default async function processarTasks() {
  console.log('[TASK] Iniciando processamento de tasks...');

  const tasks = await buscarTasksPendentes();
  console.log(`[TASK] ${tasks.length} tasks pendentes encontradas.`);

  for (const task of tasks) {
    console.log(`\n[TASK] Iniciando task: ID=${task.TASK_ID}, JOB=${task.JOB_NAME}, PROCESS_ID=${task.PROCESS_ID}, TIPO=${task.PARAMETRO_TIPO}, ANTIGO=${task.PARAMETRO_ANTIGO}, NOVO=${task.PARAMETRO_NOVO}`);

    try {
      let retorno = '';

      switch (task.JOB_NAME) {
        case 'NOVO_CLIENTE':
          retorno = await novoCliente(task.PROCESS_ID);
          break;

        case 'NOVO_FORNECEDOR':
          retorno = await novoFornecedor(task.PROCESS_ID);
          break;

        case 'NOVO_PROCESSO':
          retorno = await novoProcesso(task.PROCESS_ID);
          break;

        case 'MOVER_STATUS_PROCESSO':
          retorno = await moverStatusProcesso(task.PROCESS_ID, parseInt(task.PARAMETRO_ANTIGO), parseInt(task.PARAMETRO_NOVO));
          break;


        case 'SALVAR_ARQUIVO_REDE':
          retorno = await salvarArquivoRede(task.PROCESS_ID);
          break;

        case 'RENOMEAR_CLIENTE_OU_FORNECEDOR':
          retorno = await renomearClienteOuFornecedor(task.PARAMETRO_TIPO, task.PARAMETRO_ANTIGO, task.PARAMETRO_NOVO);
          break;

        case 'MOVER_PARA_APAGADOS':
          retorno = await moverParaApagados(task.PROCESS_ID); // ID_DOCUMENTO_ARQUIVOS
          break;

        case 'COPIAR_DOCUMENTOS_ANTIGOS':
          retorno = await copiarDocumentosAntigos(task.PROCESS_ID); // ID_CLIENTE
          break;

        default:
          console.warn(`[TASK] Job não implementado: ${task.JOB_NAME}`);
          throw new Error(`Job não implementado: ${task.JOB_NAME}`);
      }

      console.log(`[TASK] Task ${task.TASK_ID} finalizada com sucesso. Resultado:`, retorno);
      await finalizarTask(task.TASK_ID, 'FINALIZADO', retorno);
    } catch (err) {
      console.error(`[TASK] Erro ao processar task ${task.TASK_ID}:`, err);
      await finalizarTask(task.TASK_ID, 'ERRO', err.message);
    }
  }

  console.log('[TASK] Processamento de tasks concluído.');
}
