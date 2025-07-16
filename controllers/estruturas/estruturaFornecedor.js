import { criarPasta } from '../fileManager.js';

/**
 * Cria a estrutura básica de pastas para um fornecedor.
 */
export function criarEstruturaFornecedor(nomeFornecedor) {
  const base = `DOCUMENTOS MACROAPP/OPERACAO/FORNECEDORES/${nomeFornecedor}`;
  const subpastas = [
    'DOCUMENTOS GERAIS DO FORNECEDOR'
  ];
  criarPasta(base);
  subpastas.forEach(sub => criarPasta(`${base}/${sub}`));
}
