import { describe, expect, it } from 'vitest';
import {
  isValidPlayerUsername,
  sanitizePlayerUsername,
  PLAYER_USERNAME_MAX,
  PLAYER_USERNAME_MIN,
} from '../src/utils/username.js';

describe('sanitizePlayerUsername', () => {
  it('pega só o primeiro nome e remove acentos', () => {
    expect(sanitizePlayerUsername('  Fernanda Gama  ')).toBe('Fernanda');
    expect(sanitizePlayerUsername('João123')).toBe('Joao');
  });

  it('remove números e símbolos', () => {
    expect(sanitizePlayerUsername('abc@#$123')).toBe('abc');
  });

  it('limita ao máximo de caracteres', () => {
    const long = 'ABCDEFGHIJKLMNOP';
    expect(sanitizePlayerUsername(long).length).toBe(PLAYER_USERNAME_MAX);
  });

  it('retorna vazio para entrada inválida', () => {
    expect(sanitizePlayerUsername('')).toBe('');
    expect(sanitizePlayerUsername('123')).toBe('');
  });
});

describe('isValidPlayerUsername', () => {
  it('aceita nomes com tamanho mínimo', () => {
    expect(isValidPlayerUsername('Ana')).toBe(true);
    expect(isValidPlayerUsername('Jo')).toBe(true);
  });

  it('rejeita nomes curtos demais', () => {
    expect(isValidPlayerUsername('A')).toBe(false);
    expect(isValidPlayerUsername('')).toBe(false);
  });

  it('respeita o mínimo configurado', () => {
    expect(PLAYER_USERNAME_MIN).toBeGreaterThanOrEqual(2);
  });
});
