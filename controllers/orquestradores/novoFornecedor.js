import { criarEstruturaFornecedor } from '../estruturas/estruturaFornecedor.js';
import { buscarDadosDoFornecedor } from '../../services/processoService.js';
import { sanitizarNome } from '../../utils/sanitizar.js';

/**
 * Orquestra a criação da estrutura de um fornecedor.
 */
export async function novoFornecedor(idFornecedor) {
    const dados = await buscarDadosDoFornecedor(idFornecedor);
    if (!dados) throw new Error(`Fornecedor ${idFornecedor} não encontrado`);

    const { nomeFornecedor } = dados;
    const nomeFornecedorLimpo = sanitizarNome(nomeFornecedor);

    criarEstruturaFornecedor(nomeFornecedorLimpo);
    return `Fornecedor ${nomeFornecedorLimpo} estruturado.`;
}
