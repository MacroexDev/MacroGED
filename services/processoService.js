import oracledb from 'oracledb';
import { config } from '../config.js';
import { criarArvore, salvarArquivo } from '../controllers/fileManager.js';
import { criarEstruturaPadraoProcesso } from '../controllers/estruturas/estruturaProcesso.js';
import { criarEstruturaCliente } from '../controllers/estruturas/estruturaCliente.js';
import { criarEstruturaFornecedor } from '../controllers/estruturas/estruturaFornecedor.js';
import { sanitizarNome } from '../utils/sanitizar.js';

/**
 * Busca os dados do CLIENTE e os processos relacionados.
 */
export async function buscarDadosDoCliente(idCliente) {
  const conn = await oracledb.getConnection(config.db);

  const clienteResult = await conn.execute(
    `SELECT NOME_GED FROM CLIENTE WHERE ID_CLIENTE = :id`,
    [idCliente]
  );

  if (clienteResult.rows.length === 0) {
    await conn.close();
    return null;
  }

  const nomeCliente = sanitizarNome(clienteResult.rows[0][0]);

  const processosResult = await conn.execute(
    `SELECT ID_PROCESSO, COD_PROCESSO, ID_MODALIDADE, ID_EXPORTADOR, STATUS
     FROM PROCESSO
     WHERE ID_CLIENTE = :id`,
    [idCliente]
  );

  const processosRelacionados = [];

  for (const row of processosResult.rows) {
    const [idProc, codProcesso, idModalidade, idFornecedor, status] = row;

    const fornecedorResult = await conn.execute(
      `SELECT NOME_GED FROM FORNECEDOR WHERE ID_FORNECEDOR = :id`,
      [idFornecedor]
    );
    const nomeFornecedor = fornecedorResult.rows.length > 0
      ? sanitizarNome(fornecedorResult.rows[0][0])
      : 'FORNECEDOR DESCONHECIDO';

    const modalidadeResult = await conn.execute(
      `SELECT NOME FROM MODALIDADE WHERE ID_MODALIDADE = :id`,
      [idModalidade]
    );
    const abrModalidade = modalidadeResult.rows.length > 0
      ? sanitizarNome(modalidadeResult.rows[0][0])
      : 'MODALIDADE DESCONHECIDA';

    processosRelacionados.push({
      idProc,
      codProcesso,
      abrModalidade,
      nomeFornecedor,
      status
    });
  }

  await conn.close();
  return { nomeCliente, processosRelacionados };
}

/**
 * Busca os dados de um FORNECEDOR.
 */
export async function buscarDadosDoFornecedor(idFornecedor) {
  const conn = await oracledb.getConnection(config.db);

  const result = await conn.execute(
    `SELECT NOME_GED FROM FORNECEDOR WHERE ID_FORNECEDOR = :id`,
    [idFornecedor]
  );

  await conn.close();

  if (result.rows.length === 0) return null;

  return {
    nomeFornecedor: sanitizarNome(result.rows[0][0])
  };
}

/**
 * Busca os dados completos de um PROCESSO.
 */
export async function buscarDadosDoProcesso(idProc) {
  const conn = await oracledb.getConnection(config.db);

  const result = await conn.execute(
    `SELECT
        P.ID_PROCESSO,
        P.COD_PROCESSO,
        M.NOME AS MODALIDADE_NOME,
        C.NOME_GED AS NOME_CLIENTE,
        F.NOME_GED AS NOME_FORNECEDOR,
        P.STATUS
     FROM PROCESSO P
     JOIN CLIENTE C ON C.ID_CLIENTE = P.ID_CLIENTE
     JOIN FORNECEDOR F ON F.ID_FORNECEDOR = P.ID_EXPORTADOR
     JOIN MODALIDADE M ON M.ID_MODALIDADE = P.ID_MODALIDADE
     WHERE P.ID_PROCESSO = :id`,
    [idProc]
  );

  await conn.close();

  if (result.rows.length === 0) return null;

  const [idProcesso, codProcesso, modalidadeNome, nomeCliente, nomeFornecedor, status] = result.rows[0];

  return {
    idProc: idProcesso,
    codProcesso,
    abrModalidade: sanitizarNome(modalidadeNome),
    nomeCliente: sanitizarNome(nomeCliente),
    nomeFornecedor: sanitizarNome(nomeFornecedor),
    status
  };
}

/**
 * Busca o caminho relativo da rede salvo no DOCUMENTO_ARQUIVOS.
 */
export async function buscarCaminhoGedPorDocumento(idDocumentoArquivos) {
  const conn = await oracledb.getConnection(config.db);

  const result = await conn.execute(
    `SELECT CAMINHO_REDE 
     FROM DOCUMENTO_ARQUIVOS 
     WHERE ID_DOCUMENTO_ARQUIVOS = :id`,
    [idDocumentoArquivos]
  );

  await conn.close();

  if (result.rows.length === 0) {
    throw new Error(`Nenhum caminho encontrado para o documento ${idDocumentoArquivos}`);
  }

  return result.rows[0][0]; // CAMINHO_GED
}

export async function buscarDadosParaSalvarArquivo(idDocumentoArquivos) {
  const conn = await oracledb.getConnection(config.db);

  const { rows } = await conn.execute(`
    SELECT
      A.BASE_64,
      A.FORMATO_ARQUIVO,
      A.ID_DOCUMENTO_PROCESSO,
      A.ID_DOCUMENTO_CLIENTE,
      A.ID_DOCUMENTO_CONTAINER,
      A.ID_DOCUMENTO_FORNECEDOR,
      A.ID_DOCUMENTO_FINANCEIRO_PROCESSO,
      A.ID_DOCUMENTO_RESPOSTA_COTACAO,
      A.ID_DOCUMENTO_SOLICITACAO_PAGAMENTO,
      A.ID_DOCUMENTO_SOLICITACAO_PAGAMENTO_TITULO,
      DP.ORIGINAL
    FROM DOCUMENTO_ARQUIVOS A
    LEFT JOIN DOCUMENTO_PROCESSO DP ON DP.ID_DOCUMENTO_PROCESSO = A.ID_DOCUMENTO_PROCESSO
    WHERE A.ID_DOCUMENTO_ARQUIVOS = :id
  `, [idDocumentoArquivos]);

  if (rows.length === 0) {
    console.log('Nenhum documento encontrado para o ID:', idDocumentoArquivos);
    await conn.close();
    return null;
  }

  const row = rows[0];
  let base64 = '';
  const base64Lob = row[0];
  const formatoArquivo = row[1];
  const idProc = row[2];
  const idCliente = row[3];
  const idContainer = row[4];
  const idFornecedor = row[5];
  const idFinanceiro = row[6];
  const idRespostaCotacao = row[7];
  const idSolicitacaoPagamento = row[8];
  const idSolicitacaoPagamentoTitulo = row[9];
  const original = row[10] === '1';

  console.log('Informações encontradas:');
  console.log('Processo:', idProc);
  console.log('Cliente:', idCliente);
  console.log('Container:', idContainer);
  console.log('Fornecedor:', idFornecedor);
  console.log('Financeiro:', idFinanceiro);
  console.log('Resposta Cotação:', idRespostaCotacao);
  console.log('Solicitação Pagamento:', idSolicitacaoPagamento);
  console.log('Solicitação Pagamento Título:', idSolicitacaoPagamentoTitulo);
  console.log('Original:', original);

  if (base64Lob && typeof base64Lob.setEncoding === 'function') {
    base64Lob.setEncoding('utf8');
    for await (const chunk of base64Lob) {
      base64 += chunk;
    }
    await base64Lob.close?.();
  }

  let nomeArquivo = 'ARQUIVO';
  let nomeCliente = 'CLIENTE';
  let nomeFornecedor = 'FORNECEDOR';
  let codProcesso = 'PROC';
  let nomeModalidade = 'MOD';
  let pastaGed = 'OUTROS';
  let invoice_processo = null;
  let nomeExportador = '';
  let numeroInvoice = null;

  const aplicarSanitizacao = () => {
    nomeCliente = sanitizarNome(nomeCliente);
    nomeFornecedor = sanitizarNome(nomeFornecedor);
    codProcesso = sanitizarNome(codProcesso);
    nomeModalidade = sanitizarNome(nomeModalidade);
    nomeExportador = sanitizarNome(nomeExportador);
    nomeArquivo = sanitizarNome(nomeArquivo);
  };

  // PROCESSO
  if (idProc) {
    const { rows: procData } = await conn.execute(`
      SELECT DP.ID_INVOICE_PROCESSO, C.NOME_GED, F.NOME_GED, P.COD_PROCESSO, M.NOME, D.NOME_PADRAO_PASTA, D.PASTA_GED
      FROM DOCUMENTO_PROCESSO DP
      JOIN DOCUMENTO D ON D.ID_DOCUMENTO = DP.ID_DOCUMENTO
      JOIN PROCESSO P ON P.ID_PROCESSO = DP.ID_PROCESSO
      JOIN CLIENTE C ON C.ID_CLIENTE = P.ID_CLIENTE
      JOIN FORNECEDOR F ON F.ID_FORNECEDOR = P.ID_EXPORTADOR
      JOIN MODALIDADE M ON M.ID_MODALIDADE = P.ID_MODALIDADE
      WHERE DP.ID_DOCUMENTO_PROCESSO = :id
    `, [idProc]);

    if (procData.length > 0) {
      [invoice_processo, nomeCliente, nomeFornecedor, codProcesso, nomeModalidade, nomeArquivo, pastaGed] = procData[0];
      aplicarSanitizacao();
    }
  }

  // CLIENTE
  else if (idCliente) {
    const { rows: cliData } = await conn.execute(`
      SELECT C.NOME_GED, D.NOME_PADRAO_PASTA, D.PASTA_GED
      FROM DOCUMENTO_CLIENTE DC
      JOIN DOCUMENTO D ON D.ID_DOCUMENTO = DC.ID_DOCUMENTO
      JOIN CLIENTE C ON C.ID_CLIENTE = DC.ID_CLIENTE
      WHERE DC.ID_DOCUMENTO_CLIENTE = :id
    `, [idCliente]);

    if (cliData.length > 0) {
      [nomeCliente, nomeArquivo, pastaGed] = cliData[0];
      aplicarSanitizacao();
    }
  }

  // CONTAINER
  else if (idContainer) {
    const { rows: contData } = await conn.execute(`
      SELECT C.NOME_GED, F.NOME_GED, P.COD_PROCESSO, M.NOME, D.NOME_PADRAO_PASTA, D.PASTA_GED
      FROM DOCUMENTO_CONTAINER DC
      JOIN DOCUMENTO D ON D.ID_DOCUMENTO = DC.ID_DOCUMENTO
      JOIN CONTAINER CT ON CT.ID_CONTAINER = DC.ID_CONTAINER
      JOIN PROCESSO P ON P.ID_PROCESSO = CT.ID_PROCESSO
      JOIN CLIENTE C ON C.ID_CLIENTE = P.ID_CLIENTE
      JOIN FORNECEDOR F ON F.ID_FORNECEDOR = P.ID_EXPORTADOR
      JOIN MODALIDADE M ON M.ID_MODALIDADE = P.ID_MODALIDADE
      WHERE DC.ID_DOCUMENTO_CONTAINER = :id
    `, [idContainer]);

    if (contData.length > 0) {
      [nomeCliente, nomeFornecedor, codProcesso, nomeModalidade, nomeArquivo, pastaGed] = contData[0];
      aplicarSanitizacao();
    }
  }

  // FINANCEIRO
  else if (idFinanceiro) {
    const { rows: finData } = await conn.execute(`
      SELECT C.NOME_GED, F.NOME_GED, P.COD_PROCESSO, M.NOME, D.NOME_PADRAO_PASTA, D.PASTA_GED
      FROM DOCUMENTO_FINANCEIRO_PROCESSO DF
      JOIN DOCUMENTO D ON D.ID_DOCUMENTO = DF.ID_DOCUMENTO
      JOIN PROCESSO P ON P.ID_PROCESSO = DF.ID_PROCESSO
      JOIN CLIENTE C ON C.ID_CLIENTE = P.ID_CLIENTE
      JOIN FORNECEDOR F ON F.ID_FORNECEDOR = P.ID_EXPORTADOR
      JOIN MODALIDADE M ON M.ID_MODALIDADE = P.ID_MODALIDADE
      WHERE DF.ID_DOCUMENTO_FINANCEIRO_PROCESSO = :id
    `, [idFinanceiro]);

    if (finData.length > 0) {
      [nomeCliente, nomeFornecedor, codProcesso, nomeModalidade, nomeArquivo, pastaGed] = finData[0];
      aplicarSanitizacao();
    }
  }

  // RESPOSTA COTAÇÃO
  else if (idRespostaCotacao) {
    const { rows: cotData } = await conn.execute(`
      SELECT C.NOME_GED, F.NOME_GED, P.COD_PROCESSO, M.NOME, D.NOME_PADRAO_PASTA, D.PASTA_GED
      FROM DOCUMENTO_RESPOSTA_COTACAO RC
      JOIN DOCUMENTO D ON D.ID_DOCUMENTO = RC.ID_DOCUMENTO
      JOIN LOGISTICA_COTACAO_FRETE CF ON CF.ID_COTACAO = RC.ID_COTACAO
      JOIN PROCESSO P ON P.ID_PROCESSO = CF.ID_PROCESSO
      JOIN CLIENTE C ON C.ID_CLIENTE = P.ID_CLIENTE
      JOIN FORNECEDOR F ON F.ID_FORNECEDOR = P.ID_EXPORTADOR
      JOIN MODALIDADE M ON M.ID_MODALIDADE = P.ID_MODALIDADE
      WHERE RC.ID_DOCUMENTO_RESPOSTA_COTACAO = :id
    `, [idRespostaCotacao]);

    if (cotData.length > 0) {
      [nomeCliente, nomeFornecedor, codProcesso, nomeModalidade, nomeArquivo, pastaGed] = cotData[0];
      aplicarSanitizacao();
    }
  }

  // SOLICITAÇÃO PAGAMENTO
  else if (idSolicitacaoPagamento) {
    const { rows: spData } = await conn.execute(`
      SELECT D.NOME_PADRAO_PASTA, D.PASTA_GED
      FROM DOCUMENTO_SOLICITACAO_PAGAMENTO DSP
      JOIN DOCUMENTO D ON D.ID_DOCUMENTO = DSP.ID_DOCUMENTO
      WHERE DSP.ID_DOCUMENTO_SOLICITACAO_PAGAMENTO = :id
    `, [idSolicitacaoPagamento]);

    if (spData.length > 0) {
      [nomeArquivo, pastaGed] = spData[0];
      aplicarSanitizacao();
    }
  }

  // SOLICITAÇÃO PAGAMENTO TÍTULO
  else if (idSolicitacaoPagamentoTitulo) {
    const { rows: sptData } = await conn.execute(`
      SELECT D.NOME_PADRAO_PASTA, D.PASTA_GED
      FROM DOCUMENTO_SOLICITACAO_PAGAMENTO_TITULO DSPT
      JOIN DOCUMENTO D ON D.ID_DOCUMENTO = DSPT.ID_DOCUMENTO
      WHERE DSPT.ID_DOCUMENTO_SOLICITACAO_PAGAMENTO_TITULO = :id
    `, [idSolicitacaoPagamentoTitulo]);

    if (sptData.length > 0) {
      [nomeArquivo, pastaGed] = sptData[0];
      aplicarSanitizacao();
    }
  }

  // INVOICE
  if (invoice_processo) {
    const { rows: invoiceData } = await conn.execute(`
      SELECT F.NOME_GED, I.NUM_INVOICE
      FROM INVOICE_PROCESSO I
      LEFT JOIN FORNECEDOR F ON F.ID_FORNECEDOR = I.ID_EXPORTADOR
      WHERE I.ID_INVOICE_PROCESSO = :id
    `, [invoice_processo]);

    if (invoiceData.length > 0) {
      [nomeExportador, numeroInvoice] = invoiceData[0];
      nomeExportador = sanitizarNome(nomeExportador);
    }
  }



  let pasta = '';

  if (idProc) {
    const { rows: procData } = await conn.execute(`
      SELECT DP.ID_INVOICE_PROCESSO, C.NOME_GED, F.NOME_GED, P.COD_PROCESSO, M.NOME, D.NOME_PADRAO_PASTA, D.PASTA_GED, P.STATUS
      FROM DOCUMENTO_PROCESSO DP
      JOIN DOCUMENTO D ON D.ID_DOCUMENTO = DP.ID_DOCUMENTO
      JOIN PROCESSO P ON P.ID_PROCESSO = DP.ID_PROCESSO
      JOIN CLIENTE C ON C.ID_CLIENTE = P.ID_CLIENTE
      JOIN FORNECEDOR F ON F.ID_FORNECEDOR = P.ID_EXPORTADOR
      JOIN MODALIDADE M ON M.ID_MODALIDADE = P.ID_MODALIDADE
      WHERE DP.ID_DOCUMENTO_PROCESSO = :id
    `, [idProc]);

    if (procData.length > 0) {
      const [
        idInvoiceProc, nomeCli, nomeForn, codProc, nomeMod, nomeArq, pastaGedDb, statusProc
      ] = procData[0];

      invoice_processo = idInvoiceProc;
      nomeCliente = nomeCli;
      nomeFornecedor = nomeForn;
      codProcesso = codProc;
      nomeModalidade = nomeMod;
      nomeArquivo = nomeArq;
      pastaGed = pastaGedDb;

      const pastaStatus = statusProc === 2
        ? 'PROCESSOS ENCERRADOS'
        : statusProc === 3
          ? 'PROCESSOS SUSPENSOS'
          : 'PROCESSOS EM ANDAMENTO';

      console.log('Dados carregados do Processo:', {
        invoice_processo,
        nomeCliente,
        nomeFornecedor,
        codProcesso,
        nomeModalidade,
        nomeArquivo,
        pastaGed,
        statusProc,
        pastaStatus
      });

      if (invoice_processo) {
        pasta = `DOCUMENTOS MACROAPP/OPERACAO/CLIENTES/${nomeCliente}/${pastaStatus}/${codProcesso}-${nomeModalidade}-${nomeFornecedor}/${pastaGed ? pastaGed : (original ? 'NUVEM' : 'DIVERSOS')}/${nomeExportador}`;
      } else {
        pasta = `DOCUMENTOS MACROAPP/OPERACAO/CLIENTES/${nomeCliente}/${pastaStatus}/${codProcesso}-${nomeModalidade}-${nomeFornecedor}/${pastaGed ? pastaGed : (original ? 'NUVEM' : 'DIVERSOS')}`;
      }

      criarEstruturaCliente(nomeCliente);
      criarEstruturaPadraoProcesso({
        nomeCliente,
        nomeFornecedor,
        codProcesso,
        abrModalidade: nomeModalidade,
        statusProcesso: statusProc
      });
    }
  }
  else if (idCliente) {
    pasta = `DOCUMENTOS MACROAPP/OPERACAO/CLIENTES/${nomeCliente}/DOCUMENTOS GERAIS DO CLIENTE E NEGOCIAÇÃO`;

    criarEstruturaCliente(nomeCliente);
  } else if (idFornecedor) {
    pasta = `DOCUMENTOS MACROAPP/OPERACAO/FORNECEDORES/${nomeFornecedor}/DOCUMENTOS GERAIS DO FORNECEDOR`;

    criarEstruturaFornecedor(nomeFornecedor);
  } else if (idContainer) {
    const { rows: contData } = await conn.execute(`
      SELECT 
        C.NOME_GED, F.NOME_GED, P.COD_PROCESSO, M.NOME,
        D.NOME_PADRAO_PASTA, D.PASTA_GED, P.STATUS
      FROM DOCUMENTO_CONTAINER DC
      JOIN DOCUMENTO D ON D.ID_DOCUMENTO = DC.ID_DOCUMENTO
      JOIN CONTAINER CT ON CT.ID_CONTAINER = DC.ID_CONTAINER
      JOIN PROCESSO P ON P.ID_PROCESSO = CT.ID_PROCESSO
      JOIN CLIENTE C ON C.ID_CLIENTE = P.ID_CLIENTE
      JOIN FORNECEDOR F ON F.ID_FORNECEDOR = P.ID_EXPORTADOR
      JOIN MODALIDADE M ON M.ID_MODALIDADE = P.ID_MODALIDADE
      WHERE DC.ID_DOCUMENTO_CONTAINER = :id
    `, [idContainer]);

    if (contData.length > 0) {
      const [
        nomeCli, nomeForn, codProc, nomeMod, nomeArq, pastaGedDb, statusProc
      ] = contData[0];

      nomeCliente = nomeCli;
      nomeFornecedor = nomeForn;
      codProcesso = codProc;
      nomeModalidade = nomeMod;
      nomeArquivo = nomeArq;
      pastaGed = pastaGedDb;

      const pastaStatus = statusProc === 2
        ? 'PROCESSOS ENCERRADOS'
        : statusProc === 3
          ? 'PROCESSOS SUSPENSOS'
          : 'PROCESSOS EM ANDAMENTO';

      console.log('Dados carregados do Container:', {
        nomeCliente,
        nomeFornecedor,
        codProcesso,
        nomeModalidade,
        nomeArquivo,
        pastaGed,
        statusProc,
        pastaStatus
      });

      pasta = `DOCUMENTOS MACROAPP/OPERACAO/CLIENTES/${nomeCliente}/${pastaStatus}/${codProcesso}-${nomeModalidade}-${nomeFornecedor}/${pastaGed ? pastaGed : (original ? 'NUVEM' : 'DIVERSOS')}`;

      criarEstruturaCliente(nomeCliente);
      criarEstruturaPadraoProcesso({
        nomeCliente,
        nomeFornecedor,
        codProcesso,
        abrModalidade: nomeModalidade,
        statusProcesso: statusProc
      });
    }
  }

  await conn.close();
  console.log('Pasta destino:', pasta);

  return {
    base64,
    nomeArquivo,
    formatoArquivo,
    codProcesso,
    pastaDestino: pasta,
    numeroInvoice
  };
}


export async function buscarDadosParaMoverArquivo(idDocumentoArquivos) {
  const conn = await oracledb.getConnection(config.db);

  const result = await conn.execute(`
    SELECT DP.ID_INVOICE_PROCESSO
    FROM DOCUMENTO_ARQUIVOS A
    JOIN DOCUMENTO_PROCESSO DP ON DP.ID_DOCUMENTO_PROCESSO = A.ID_DOCUMENTO_PROCESSO
    WHERE A.ID_DOCUMENTO_ARQUIVOS = :id
  `, [idDocumentoArquivos]);

  await conn.close();

  return {
    invoice_processo: result.rows.length > 0 ? result.rows[0][0] : null
  };
}
