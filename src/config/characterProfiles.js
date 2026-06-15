/** Tipo + frase de personalidade — modal de personagem */
export const CHARACTER_PROFILES = {
  anderson: {
    tipo: 'Focado',
    personalidade: 'Lagartinha determinada que adora um desafio novo. Quando aparece uma fruta no caminho, Anderson já pensa em como alcançá-la!',
  },
  anna: {
    tipo: 'Carinhosa',
    personalidade: 'Lagartinha doce e cheia de imaginação. Anna espalha carinho por onde passa e faz amizade com todo mundo da turminha.',
  },
  ellaynne: {
    tipo: 'Alegre',
    personalidade: 'Lagartinha sorridente que ilumina o dia de todos. Ellaynne ri alto, dança no chão e nunca deixa a turma ficar triste.',
  },
  heitor: {
    tipo: 'Aventureiro',
    personalidade: 'Lagartinha curiosa que adora explorar. Heitor investiga cada folha, cada galho e cada cantinho do jardim.',
  },
  joao_miguel: {
    tipo: 'Brincalhão',
    personalidade: 'Lagartinha cheia de energia e piadas. João Miguel transforma qualquer passeio numa festa com a turminha.',
  },
  josias: {
    tipo: 'Calmo',
    personalidade: 'Lagartinha tranquila que pensa antes de agir. Josias é o amigo sensato que ajuda todo mundo a fazer a coisa certa.',
  },
  kaue: {
    tipo: 'Veloz',
    personalidade: 'Lagartinha elétrica que não para quieto. Kaue corre, pula e encara cada obstáculo com um sorriso no rosto.',
  },
  kiara: {
    tipo: 'Criativa',
    personalidade: 'Lagartinha inventiva com mil ideias na cabeça. Kiara adora criar brincadeiras novas para os amigos.',
  },
  lara_eloa: {
    tipo: 'Gentil',
    personalidade: 'Lagartinha cuidadosa que protege os amigos. Lara Eloa tem um coração enorme e mãozinhas sempre prontas para ajudar.',
  },
  larah: {
    tipo: 'Leve',
    personalidade: 'Lagartinha graciosa como uma nuvem. Larah se move com leveza e traz paz para a turminha.',
  },
  maria_paula: {
    tipo: 'Esperta',
    personalidade: 'Lagartinha inteligente que adora aprender. Maria Paula descobre truques novos e compartilha com a galera.',
  },
  noah: {
    tipo: 'Curioso',
    personalidade: 'Lagartinha investigadora cheia de perguntas. Noah quer saber como tudo funciona — e acha respostas divertidas!',
  },
  ravi: {
    tipo: 'Valente',
    personalidade: 'Lagartinha valente que nunca desiste! Ravi encara cada desafio de peito aberto e inspira a turminha a continuar.',
  },
  rosa_maria: {
    tipo: 'Amorosa',
    personalidade: 'Lagartinha afetuosa com um coração gigante. Rosa Maria abraça a turminha com palavras doces e muito carinho.',
  },
  theo: {
    tipo: 'Destemido',
    personalidade: 'Lagartinha corajosa que puxa a turma pra frente. Theo lidera com confiança e nunca deixa ninguém para trás.',
  },
};

export function getCharacterProfile(crianca) {
  const saved = CHARACTER_PROFILES[crianca?.id];
  if (saved) return saved;

  const nome = crianca?.nome ?? 'Lagartinha';
  const tipo = crianca?.genero === 'menina' ? 'Especial' : 'Especial';
  return {
    tipo,
    personalidade: `${nome} é uma lagartinha da turminha cheia de personalidade. Pronta para comer frutas, crescer e viver grandes aventuras!`,
  };
}
