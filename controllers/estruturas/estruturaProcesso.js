import { criarPasta } from '../fileManager.js';

const statusMap = {
  1: 'PROCESSOS EM ANDAMENTO',
  2: 'PROCESSOS ENCERRADOS',
  3: 'PROCESSOS SUSPENSOS'
};

/**
 * Cria a estrutura de diretórios padrão para um processo, de acordo com seu status.
 */
export function criarEstruturaPadraoProcesso({ nomeCliente, nomeFornecedor, codProcesso, abrModalidade, statusProcesso = 1 }) {
  console.log(`Criando estrutura de processo para: ${nomeCliente}, ${nomeFornecedor}, ${codProcesso}, ${abrModalidade}, status=${statusProcesso}`);

  const statusNome = statusMap[statusProcesso] || statusMap[1]; // fallback para "EM ANDAMENTO"
  const pasta = `${codProcesso}-${abrModalidade}-${nomeFornecedor}`;
  const base = `DOCUMENTOS MACROAPP/OPERACAO/CLIENTES/${nomeCliente}/${statusNome}/${pasta}`;

  const subpastas = [
    'DIVERSOS',
    'FATURAMENTO E FINANCEIRO',
    'NUVEM',
    'EMAIL OBRIGATORIO',
    'COTAÇÕES'
  ];

  criarPasta(base);
  subpastas.forEach(sub => criarPasta(`${base}/${sub}`));
}
