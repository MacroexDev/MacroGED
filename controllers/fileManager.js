import fs from 'fs';
import path from 'path';
import oracledb from 'oracledb';
import { config } from '../config.js';
import { salvarArquivoRede } from './orquestradores/salvarArquivoRede.js';
import { buscarCaminhoGedPorDocumento, buscarDadosParaMoverArquivo } from '../services/processoService.js';
import { sanitizarNome } from '../../utils/sanitizar.js';


function gerarCaminho(relPath) {
  if (!relPath) {
    console.error('❌ Caminho relativo não pode ser vazio');
    return null;
  }
  return config.basePath + '\\' + relPath.replace(/\//g, '\\');
}

export async function atualizarCaminhoRede({ id, nomeArquivo, base64, caminhoAntigo }, caminhoNovo) {
  console.log('🔄 Iniciando atualização de CAMINHO_REDE');
  console.log('📥 Dados recebidos:');
  console.log('➡️ id:', id);
  console.log('➡️ nomeArquivo:', nomeArquivo);
  console.log('➡️ base64 (tam):', base64 ? base64.length : 'null');
  console.log('➡️ caminhoAntigo:', caminhoAntigo);
  console.log('➡️ caminhoNovo:', caminhoNovo);

  const conn = await oracledb.getConnection(config.db);
  console.log('✅ Conexão Oracle aberta');

  try {
    if (id) {
      console.log('🔍 Atualizando por ID direto...');
      const result = await conn.execute(
        `UPDATE DOCUMENTO_ARQUIVOS SET CAMINHO_REDE = :caminho WHERE ID_DOCUMENTO_ARQUIVOS = :id`,
        { caminho: caminhoNovo, id },
        { autoCommit: true }
      );
      console.log(`✅ CAMINHO_REDE atualizado com ID ${id}. Linhas afetadas:`, result.rowsAffected);
    } else {
      console.log('🔍 Buscando ID por nomeArquivo ou caminhoAntigo...');
      const { rows } = await conn.execute(
        `SELECT ID_DOCUMENTO_ARQUIVOS FROM DOCUMENTO_ARQUIVOS
         WHERE (CAMINHO_REDE = :caminhoAntigo OR NOME_ARQUIVO = :nomeArquivo)
         AND ROWNUM = 1`,
        {
          caminhoAntigo: caminhoAntigo || '',
          nomeArquivo: nomeArquivo || ''
        }
      );

      console.log('🔎 Resultado da busca por ID:', rows);

      if (rows.length > 0) {
        const idAchado = rows[0].ID_DOCUMENTO_ARQUIVOS;
        console.log('✅ ID encontrado:', idAchado);

        const updateResult = await conn.execute(
          `UPDATE DOCUMENTO_ARQUIVOS SET CAMINHO_REDE = :caminho WHERE ID_DOCUMENTO_ARQUIVOS = :id`,
          { caminho: caminhoNovo, id: idAchado },
          { autoCommit: true }
        );

        console.log(`✅ CAMINHO_REDE atualizado com ID ${idAchado}. Linhas afetadas:`, updateResult.rowsAffected);
      } else {
        console.warn('⚠️ Nenhum ID encontrado para atualizar CAMINHO_REDE.');
      }
    }
  } catch (err) {
    console.error('❌ Erro ao atualizar CAMINHO_REDE:', err);
  } finally {
    await conn.close();
    console.log('🔒 Conexão Oracle fechada');
  }
}


export function criarPasta(relPath) {
  const fullPath = gerarCaminho(relPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log('📁 Pasta criada:', fullPath);
  } else {
    console.log('📂 Pasta já existe:', fullPath);
  }
}

export function criarArvore(relPath, subpastas) {
  criarPasta(relPath);
  subpastas.forEach(sub => criarPasta(path.join(relPath, sub)));
}

export async function moverPasta(origemRel, destinoRel) {
  const origem = gerarCaminho(origemRel);
  const destino = gerarCaminho(destinoRel);
  if (fs.existsSync(origem)) {
    fs.renameSync(origem, destino);
    console.log(`📦 Pasta movida de ${origem} para ${destino}`);

    const arquivos = fs.readdirSync(destino);
    for (const nome of arquivos) {
      const caminhoAntigo = path.join(origemRel, nome);
      const caminhoNovo = path.join(destinoRel, nome);
      await atualizarCaminhoRede({ caminhoAntigo, nomeArquivo: nome }, caminhoNovo);
    }
  } else {
    console.warn('⚠️ Pasta de origem não encontrada para mover:', origem);
  }
}

export function removerPasta(relPath) {
  const fullPath = gerarCaminho(relPath);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log('🗑️ Pasta removida:', fullPath);
  } else {
    console.warn('⚠️ Pasta não encontrada para remover:', fullPath);
  }
}

export async function copiarPasta(origemRel, destinoRel) {
  const origem = gerarCaminho(origemRel);
  const destino = gerarCaminho(destinoRel);
  if (fs.existsSync(origem)) {
    fs.cpSync(origem, destino, { recursive: true });
    console.log(`📄 Pasta copiada de ${origem} para ${destino}`);

    const arquivos = fs.readdirSync(destino);
    for (const nome of arquivos) {
      await atualizarCaminhoRede({ nomeArquivo: nome }, path.join(destinoRel, nome));
    }
  } else {
    console.warn('⚠️ Pasta de origem não encontrada para copiar:', origem);
  }
}

export async function salvarArquivo(relPath, nomeArquivo, buffer, idDocumentoArquivos) {
  const destino = gerarCaminho(relPath);
  criarPasta(relPath);
  const caminhoFinal = path.join(destino, nomeArquivo);
  console.log(`📥 Salvando arquivo em: ${caminhoFinal}`);
  fs.writeFileSync(caminhoFinal, buffer);
  console.log(`📄 Arquivo salvo em: ${caminhoFinal}`);

  const caminhoRelativoComNome = path.join(relPath, nomeArquivo).replace(/\//g, '\\');
  await atualizarCaminhoRede(
    { id: idDocumentoArquivos, nomeArquivo, base64: buffer.toString('base64') },
    caminhoRelativoComNome
  );
}

export async function renomearPastaEntidade(tipo, nomeAntigo, nomeNovo) {
  const base = tipo === 'cliente' ? 'CLIENTES' : 'FORNECEDORES';
  const caminhoAntigoRel = `DOCUMENTOS MACROAPP/OPERACAO/${base}/${nomeAntigo}`;
  const caminhoNovoRel = `DOCUMENTOS MACROAPP/OPERACAO/${base}/${nomeNovo}`;
  const caminhoAntigo = gerarCaminho(caminhoAntigoRel);
  const caminhoNovo = gerarCaminho(caminhoNovoRel);

  if (fs.existsSync(caminhoAntigo)) {
    fs.renameSync(caminhoAntigo, caminhoNovo);
    console.log(`🔁 Pasta renomeada de "${nomeAntigo}" para "${nomeNovo}"`);

    const arquivos = fs.readdirSync(caminhoNovo);
    for (const nome of arquivos) {
      await atualizarCaminhoRede({ caminhoAntigo: path.join(caminhoAntigoRel, nome), nomeArquivo: nome }, path.join(caminhoNovoRel, nome));
    }
  } else {
    console.log(`⚠️ Pasta original não encontrada: ${caminhoAntigo}`);
  }
}

export async function renomearOcorrenciasNomeEntidade(nomeAntigo, nomeNovo) {
  const raiz = gerarCaminho('DOCUMENTOS MACROAPP/OPERACAO');

  if (!fs.existsSync(raiz)) {
    console.warn(`[GED] Caminho base não encontrado: ${raiz}`);
    return;
  }

  async function renomearRecursivo(diretorio, relAtual) {
    const itens = fs.readdirSync(diretorio);
    for (const item of itens) {
      const caminhoItem = path.join(diretorio, item);
      const relItem = path.join(relAtual, item);
      const stats = fs.statSync(caminhoItem);

      if (stats.isDirectory()) {
        let caminhoAtual = caminhoItem;
        let relNovo = relItem;
        if (item.includes(nomeAntigo)) {
          const novoItem = item.replaceAll(nomeAntigo, nomeNovo);
          const novoCaminho = path.join(diretorio, novoItem);
          fs.renameSync(caminhoItem, novoCaminho);
          caminhoAtual = novoCaminho;
          relNovo = path.join(relAtual, novoItem);
          console.log(`🔁 Pasta renomeada: ${caminhoItem} → ${novoCaminho}`);
        }
        await renomearRecursivo(caminhoAtual, relNovo);
      }

      if (stats.isFile() && item.includes(nomeAntigo)) {
        const novoNome = item.replaceAll(nomeAntigo, nomeNovo);
        const novoCaminho = path.join(diretorio, novoNome);
        fs.renameSync(caminhoItem, novoCaminho);
        console.log(`📝 Arquivo renomeado: ${caminhoItem} → ${novoCaminho}`);
        await atualizarCaminhoRede({ nomeArquivo: item, caminhoAntigo: relItem }, path.join(relAtual, novoNome));
      }
    }
  }

  await renomearRecursivo(raiz, 'DOCUMENTOS MACROAPP/OPERACAO');
  console.log(`[GED] Renomeação profunda concluída em toda a estrutura: "${nomeAntigo}" → "${nomeNovo}"`);
}

export async function moverArquivoParaApagados(caminhoRelativoCompleto, idDocumentoArquivos) {
  let caminhoCompleto = null;

  if (caminhoRelativoCompleto) {
    caminhoCompleto = gerarCaminho(caminhoRelativoCompleto);
  }

  if (!fs.existsSync(caminhoCompleto)) {
    console.warn('⚠️ Arquivo não encontrado. Tentando salvar...');

    try {
      await salvarArquivoRede(idDocumentoArquivos);
    } catch (err) {
      console.error('❌ Erro ao salvar arquivo antes de mover para APAGADOS:', err);
      return;
    }

    caminhoRelativoCompleto = await buscarCaminhoGedPorDocumento(idDocumentoArquivos);
    if (caminhoRelativoCompleto) {
      caminhoCompleto = gerarCaminho(caminhoRelativoCompleto);
    }

    if (!fs.existsSync(caminhoCompleto)) {
      console.error('❌ Arquivo ainda não encontrado após tentativa de salvamento:', caminhoCompleto);
      return;
    }
  }

  const dados = await buscarDadosParaMoverArquivo(idDocumentoArquivos);
  const isInvoice = dados?.invoice_processo != null;

  const pastaPai = path.dirname(caminhoRelativoCompleto);
  const nomeArquivo = path.basename(caminhoRelativoCompleto);
  const destinoRelativo = path.join(pastaPai, isInvoice ? '../..' : '..', 'APAGADOS', nomeArquivo);
  const destinoCompleto = gerarCaminho(destinoRelativo);
  const destinoDir = path.dirname(destinoCompleto);

  if (!fs.existsSync(destinoDir)) {
    fs.mkdirSync(destinoDir, { recursive: true });
  }

  fs.renameSync(caminhoCompleto, destinoCompleto);
  console.log(`🗃️ Arquivo movido para APAGADOS: ${destinoCompleto}`);

  await atualizarCaminhoRede(
    { nomeArquivo, caminhoAntigo: caminhoRelativoCompleto, id: idDocumentoArquivos },
    destinoRelativo.replace(/\//g, '\\')
  );
}

export async function copiarDocumentosAntigosParaCliente(nomeCliente) {
  const caminhosLegados = process.env.CAMINHOS_ANTIGOS?.split(';') || [];

  for (const caminho of caminhosLegados) {
    const caminhoFormatado = caminho.replace(/\//g, '\\');
    if (!fs.existsSync(caminhoFormatado)) continue;

    const arquivos = fs.readdirSync(caminhoFormatado);
    for (const arquivo of arquivos) {
      if (arquivo.toLowerCase().includes(nomeCliente.toLowerCase())) {
        const destinoRel = `DOCUMENTOS MACROAPP/OPERACAO/CLIENTES/${nomeCliente}/DOCUMENTOS GERAIS DO CLIENTE E NEGOCIAÇÃO/Documentação antiga`;
        const destinoAbs = gerarCaminho(destinoRel);
        if (!fs.existsSync(destinoAbs)) {
          fs.mkdirSync(destinoAbs, { recursive: true });
        }

        const origem = path.join(caminhoFormatado, arquivo);
        const destino = path.join(destinoAbs, arquivo);

        fs.copyFileSync(origem, destino);
        console.log(`📤 Copiado de legado para cliente: ${arquivo}`);

        await atualizarCaminhoRede({ nomeArquivo: arquivo }, path.join(destinoRel, arquivo));
      }
    }
  }
}