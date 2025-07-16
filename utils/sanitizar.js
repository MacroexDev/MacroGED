// utils/sanitizar.js

/**
 * Remove acentos, símbolos e caracteres inválidos para nomes de pastas.
 */
export function sanitizarNome(nome) {
    return nome
      .normalize('NFD')                     // remove acentos
      .replace(/[\u0300-\u036f]/g, '')      // remove diacríticos
      .replace(/[^\w\s-]/g, '')             // remove símbolos e pontuação
      .replace(/\s+/g, ' ')                 // substitui múltiplos espaços por um só
      .trim();                              // remove espaços das extremidades
  }
  