import oracledb from 'oracledb';
import { config } from '../config.js';

/**
 * Busca todas as tasks pendentes ativas, com seus respectivos tipos de job.
 */
export async function buscarTasksPendentes() {
  console.log('[DB] Iniciando busca de tasks pendentes...');
  let conn;

  try {
    console.log('[DB] Tentando abrir conexão com Oracle...');
    conn = await oracledb.getConnection(config.db);
    console.log('[DB] Conexão obtida com sucesso.');

    const sql = `
      SELECT 
        t.ID_TASK,
        t.PROCESS_ID,
        j.NOME AS JOB_NAME,
        t.PARAMETRO_TIPO,
        t.PARAMETRO_ANTIGO,
        t.PARAMETRO_NOVO
      FROM M2G_TASK t
      JOIN M2G_JOB j ON j.ID_JOB = t.ID_JOB
      WHERE t.STATUS = 'AGUARDANDO' AND t.ATIVO = '1'
    `;

    console.log('[DB] Executando SQL:\n', sql);
    const result = await conn.execute(sql);

    const tasks = result.rows.map(r => ({
      TASK_ID: r[0],
      PROCESS_ID: r[1],
      JOB_NAME: r[2],
      PARAMETRO_TIPO: r[3],
      PARAMETRO_ANTIGO: r[4],
      PARAMETRO_NOVO: r[5]
    }));

    console.log(`[DB] ${tasks.length} task(s) pendente(s) encontradas.`);
    return tasks;
  } catch (err) {
    console.error('[DB] ERRO ao buscar tasks pendentes:', err);
    return [];
  } finally {
    if (conn) {
      try {
        await conn.close();
        console.log('[DB] Conexão Oracle fechada.');
      } catch (e) {
        console.warn('[DB] Erro ao fechar conexão Oracle:', e);
      }
    }
  }
}

/**
 * Atualiza o status de uma task como FINALIZADO ou ERRO.
 */
export async function finalizarTask(taskId, status, retorno) {
  console.log(`[DB] Finalizando task ${taskId} com status ${status}...`);
  let conn;

  try {
    conn = await oracledb.getConnection(config.db);
    console.log('[DB] Conexão para update obtida.');

    const sql = `
      UPDATE M2G_TASK
      SET STATUS = :status,
          RESULTADO = :retorno,
          DT_ALTERACAO = SYSDATE
      WHERE ID_TASK = :taskId
    `;

    console.log('[DB] Executando UPDATE:\n', sql);
    console.log('[DB] Parâmetros:', { status, retorno, taskId });

    await conn.execute(sql, { status, retorno, taskId });
    await conn.commit();

    console.log(`[DB] Task ${taskId} finalizada com sucesso.`);
  } catch (err) {
    console.error('[DB] ERRO ao finalizar task:', err);
  } finally {
    if (conn) {
      try {
        await conn.close();
        console.log('[DB] Conexão Oracle fechada (update).');
      } catch (e) {
        console.warn('[DB] Erro ao fechar conexão Oracle (update):', e);
      }
    }
  }
}
