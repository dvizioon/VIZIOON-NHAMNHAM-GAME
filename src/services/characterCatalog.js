/** Converte personagem da API para o formato usado pelo jogo (Phaser/sprites) */
import { normalizeCriancaRecord } from '../config/characterUiConfig.js';

function normalizeLocalAssetPath(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('assets/') ? path : `assets/${path}`;
}

export function mapApiCharacterToCrianca(character) {
  if (!character) return null;

  const personKey = character.personKey ?? character.person_key ?? character.slug;
  const cabeca = character.cabeca ?? normalizeLocalAssetPath(character.cabecaPath);

  return normalizeCriancaRecord({
    id: personKey,
    characterUuid: character.id,
    nome: character.nome,
    nomeCompleto: character.nomeCompleto ?? null,
    genero: character.genero ?? null,
    tipo: character.tipo ?? null,
    personalidade: character.personalidade ?? null,
    cabeca,
    ativo: character.ativo !== false,
  });
}

export function mapApiCharactersList(list = []) {
  return list.map(mapApiCharacterToCrianca).filter(Boolean);
}
