import { buscarDadosParaSalvarArquivo } from '../../services/processoService.js';
import { salvarArquivo, criarPasta, atualizarCaminhoRede} from '../fileManager.js';
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';
import { config } from '../../config.js';

/**
 * Gera hash SHA-256 do conteúdo base64.
 */
function gerarHashBase64(base64) {
  return createHash('sha256')
    .update(Buffer.from(base64, 'base64'))
    .digest('hex');
}

/**
 * Gera nome final do arquivo, evitando duplicatas com mesmo conteúdo (hash).
 */
function obterNomeFinal(baseName, ext, pastaCompleta, hashNovo) {
  let index = 0;
  let nomeArquivo = `${baseName}${ext}`;
  let caminhoCompleto = path.join(pastaCompleta, nomeArquivo);

  while (fs.existsSync(caminhoCompleto)) {
    const bufferExistente = fs.readFileSync(caminhoCompleto);
    const hashExistente = createHash('sha256').update(bufferExistente).digest('hex');
    if (hashExistente === hashNovo) {
      return null; // já existe um arquivo com o mesmo conteúdo
    }
    index++;
    nomeArquivo = `${baseName}(${index})${ext}`;
    caminhoCompleto = path.join(pastaCompleta, nomeArquivo);
  }

  return nomeArquivo;
}

/**
 * Salva um arquivo físico na rede com base no ID_DOCUMENTO_ARQUIVOS.
 */
export async function salvarArquivoRede(idDocumentoArquivos) {
  const doc = await buscarDadosParaSalvarArquivo(idDocumentoArquivos);
  if (!doc) throw new Error('Documento não encontrado ou inativo');
  if (!doc.base64) throw new Error('Documento não contém conteúdo base64');

  const buffer = Buffer.from(doc.base64, 'base64');
  const pasta = doc.pastaDestino;
  const hash = gerarHashBase64(doc.base64);

  let cod = doc.codProcesso || 'PROC';
  if (doc.numeroInvoice) {
    cod = doc.numeroInvoice;
  }

  const nomeOriginal = doc.nomeArquivo || 'arquivo';
  const ext = `.${(doc.formatoArquivo || 'pdf').replace('.', '')}`;

  const baseName = cod === 'PROC' ? nomeOriginal : `${cod} - ${nomeOriginal}`;
  const pastaCompleta = path.resolve(config.basePath, pasta.replace(/\//g, path.sep));
  criarPasta(pasta); // Garante que a pasta exista

  const nomeFinal = obterNomeFinal(baseName, ext, pastaCompleta, hash);

  const caminhoRelativoFinal = path.join(pasta, nomeFinal || baseName + ext).replace(/\//g, '\\');

  if (!nomeFinal) {
    console.warn('⚠️ Arquivo com mesmo conteúdo já existe. Caminho será atualizado.');
  } else {
    salvarArquivo(pasta, nomeFinal, buffer, idDocumentoArquivos);
    console.log(`📄 Arquivo salvo: ${nomeFinal} em ${pasta}`);
  }

  // Atualiza o caminho no banco, mesmo se o arquivo já existia
  await atualizarCaminhoRede(
    { nomeArquivo: nomeOriginal, caminhoAntigo: null, id: idDocumentoArquivos },
    caminhoRelativoFinal
  );

  return `📄 Caminho atualizado: ${caminhoRelativoFinal}`;
}
