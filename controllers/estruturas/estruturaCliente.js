import { criarPasta } from '../fileManager.js';

export function criarEstruturaCliente(nomeCliente) {
  const base = `DOCUMENTOS MACROAPP/OPERACAO/CLIENTES/${nomeCliente}`;
  const subpastas = [
    'PROCESSOS EM ANDAMENTO',
    'PROCESSOS ENCERRADOS',
    'PROCESSOS SUSPENSOS',
    'ESTIMATIVAS GERAIS',
    'DOCUMENTOS GERAIS DO CLIENTE E NEGOCIAÇÃO'
  ];
  criarPasta(base);
  subpastas.forEach(sub => criarPasta(`${base}/${sub}`));
}
