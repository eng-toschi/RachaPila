import { describe, expect, it } from 'vitest';
import { nameFromEmail } from '@/db/repositories';

describe('nameFromEmail', () => {
  it('usa só o primeiro nome, capitalizado', () => {
    expect(nameFromEmail('fernando@exemplo.com')).toBe('Fernando');
    expect(nameFromEmail('FERNANDO@exemplo.com')).toBe('Fernando');
  });

  it('corta no primeiro separador: o sobrenome não distingue ninguém numa lista de cinco', () => {
    expect(nameFromEmail('fernando.toschi@exemplo.com')).toBe('Fernando');
    expect(nameFromEmail('ana-paula@exemplo.com')).toBe('Ana');
    expect(nameFromEmail('joao_silva@exemplo.com')).toBe('Joao');
    expect(nameFromEmail('lucia+viagens@exemplo.com')).toBe('Lucia');
  });

  it('desiste quando o palpite seria pior que campo vazio', () => {
    expect(nameFromEmail(undefined)).toBeUndefined();
    expect(nameFromEmail('')).toBeUndefined();
    expect(nameFromEmail('@exemplo.com')).toBeUndefined();
    // Só dígitos não é nome de gente; melhor a pessoa digitar.
    expect(nameFromEmail('12345@exemplo.com')).toBeUndefined();
    expect(nameFromEmail('.oculto@exemplo.com')).toBeUndefined();
  });
});
