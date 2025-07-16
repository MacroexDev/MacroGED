import { criarEstruturaCliente } from '../estruturas/estruturaCliente.js';
import { criarEstruturaPadraoProcesso } from '../estruturas/estruturaProcesso.js';
import { buscarDadosDoCliente } from '../../services/processoService.js';
import { sanitizarNome } from '../../utils/sanitizar.js';

export async function novoCliente(idCliente) {
  const dados = await buscarDadosDoCliente(idCliente);
  if (!dados) throw new Error(`Cliente ${idCliente} não encontrado`);

  const { nomeCliente, processosRelacionados } = dados;
  const nomeClienteLimpo = sanitizarNome(nomeCliente);

  criarEstruturaCliente(nomeClienteLimpo);

  for (const processo of processosRelacionados) {
    criarEstruturaPadraoProcesso({
      nomeCliente: nomeClienteLimpo,
      nomeFornecedor: sanitizarNome(processo.nomeFornecedor),
      codProcesso: processo.codProcesso,
      abrModalidade: sanitizarNome(processo.abrModalidade),
      statusProcesso: processo.status
    });
  }

  return `Cliente ${nomeClienteLimpo} estruturado com ${processosRelacionados.length} processo(s).`;
}
