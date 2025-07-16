import { criarEstruturaPadraoProcesso } from '../estruturas/estruturaProcesso.js';
import { criarEstruturaCliente } from '../estruturas/estruturaCliente.js';
import { criarEstruturaFornecedor } from '../estruturas/estruturaFornecedor.js';
import { buscarDadosDoProcesso } from '../../services/processoService.js';
import { sanitizarNome } from '../../utils/sanitizar.js';

export async function novoProcesso(idProc) {
  const dados = await buscarDadosDoProcesso(idProc);
  if (!dados) throw new Error(`Processo ${idProc} não encontrado`);

  const { nomeCliente, codProcesso, nomeFornecedor, abrModalidade, status } = dados;

  const nomeClienteLimpo = sanitizarNome(nomeCliente);
  const nomeFornecedorLimpo = sanitizarNome(nomeFornecedor);

  criarEstruturaCliente(nomeClienteLimpo);
  criarEstruturaFornecedor(nomeFornecedorLimpo);

  criarEstruturaPadraoProcesso({
    nomeCliente: nomeClienteLimpo,
    nomeFornecedor: nomeFornecedorLimpo,
    codProcesso,
    abrModalidade: sanitizarNome(abrModalidade),
    statusProcesso: status
  });

  return `Processo ${codProcesso} estruturado para ${nomeClienteLimpo} com fornecedor ${nomeFornecedorLimpo}`;
}
