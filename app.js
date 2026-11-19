/* ============================================================
   Central de Livrinhos: Fase 2 (RPG Cozy de Fazendinha)
   100% local, sem IA, sem servidor, nenhum texto sai do computador.
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "central_livrinhos_v1";
  const LIMITE_COLAGEM = 3000;
  const LIMITE_SALTO_PERGUNTA = 500;
  const JANELA_SALTO_MS = 30000;

  const CORES_ESTANTE = [
    { nome: "Verde Musgo", hex: "#5C8D58" },
    { nome: "Dourado Mel", hex: "#D4A243" },
    { nome: "Terracota", hex: "#C96D4B" },
    { nome: "Ameixa", hex: "#8B5D7A" },
    { nome: "Azul Lago", hex: "#5B8BA8" },
    { nome: "Pinho", hex: "#3E6B52" },
    { nome: "Âmbar", hex: "#C98A3E" },
    { nome: "Rosa Antigo", hex: "#D97F98" }
  ];

  // Regra do humor: piada mira sempre a situação, o livro, os personagens,
  // os gatos ou a Dona Procrastinação, nunca critica nem cobra a autora.
  const SAUDACOES_RPG = [
    "Os gatos já escolheram a cadeira deles.",
    "A Dona Procrastinação tentou trancar a taverna, mas você entrou mesmo assim.",
    "Seus personagens já estão discutindo no corredor esperando o arquivo abrir.",
    "Café quentinho, pergaminho aberto e o livro que lute hoje."
  ];

  const FRASES_PADRAO = [
    "Meta mínima batida. O livro reconhece seu esforço, mesmo que de má vontade.",
    "A procrastinação mandou lembranças, mas hoje ela saiu derrotada.",
    "Pausa de 5 min. Os personagens pediram água e o gato já deitou em cima do teclado.",
    "Mais palavras no arquivo. Seus personagens agradecem (ou reclamam do drama novo).",
    "O capítulo tentou fazer charme, mas não teve chance contra você hoje.",
    "Página em branco não dá pra revisar. Cada linha que entrou aí já vale ouro.",
    "Mais um tijolinho nessa fazenda literária. Os gatos aprovaram com um ronrono."
  ];

  const FALAS_MASCOTE = {
    normal: [
      "Os gatos já escolheram a cadeira deles.",
      "O cursor tá piscando de nervoso porque sabe que hoje você veio inspirada.",
      "Se a cena empacar, bota dois personagens brigando na chuva que sempre rende.",
      "Estou de guarda aqui no canto. Nenhuma autocrítica passa por esta mesa hoje."
    ],
    foco: [
      "Shhh. Tranquei a Dona Procrastinação do lado de fora da janela.",
      "Digita primeiro, lapida depois. Deixa a versão revisora resolver os detalhes.",
      "Olha esse ritmo! Os personagens mal estão conseguindo acompanhar seu teclado."
    ],
    pausa: [
      "Pausa de 5 min. Os personagens pediram água e o gato já deitou em cima do teclado.",
      "Hora de soltar os ombros e beber água. Eu vigio o manuscrito pra ninguém mexer.",
      "Descanso estratégico de guilda. Até maga nível 20 precisa recarregar a mana."
    ],
    festa: [
      "A procrastinação mandou lembranças! Que surra bonita você deu nela hoje!",
      "Caiu XP fresquinho na bolsa! O livro deu até um suspiro de felicidade.",
      "Conquista desbloqueada! Seus personagens estão soltando fogos no capítulo."
    ],
    questDragao: [
      "VOCÊ FECHOU A QUEST TODA!! Os gatos subiram na mesa batendo palma com as quatro patinhas!",
      "Missão liquidada! O dragão da página em branco virou tapete na entrada da taverna!"
    ]
  };

  // Elenco original RPG sem nomes próprios (chamados pelo arquétipo; a autora pode dar nome se quiser)
  const ELENCO_NPCS = [
    {
      id: "moreno-sarcastico",
      arquetipo: "O Moreno Sarcástico",
      genero: "mocinho",
      desbloqueadoInicio: true,
      descricao: "Seu anfitrião na fazenda: cabelo escuro bagunçado, humor seco e café na mão.",
      estilo: {
        cabelo: "baguncado",
        corCabelo: "#241917",
        corPele: "#E8BC96",
        corOlho: "#2F6D52",
        corRoupa: "#353D47",
        corDetalhe: "#6A9E74",
        prop: "cafe"
      },
      falas: {
        normal: [
          "Cheguei cedo, trouxe café e já briguei com a Dona Procrastinação na porteira.",
          "Seu capítulo tá fazendo doce ali no arquivo. Escreve três linhas só pra provocar ele.",
          "Se dois personagens ficarem sem assunto, tranca os dois no mesmo chalé na tempestade."
        ],
        foco: [
          "Modo silêncio ativado. Nem o capeta e nem a dúvida literária entram nessa sala agora.",
          "Vai no seu ritmo. A versão de amanhã que revise vírgula; hoje a gente põe drama no papel.",
          "Olha você digitando como quem já venceu esse capítulo."
        ],
        pausa: [
          "Pausa de 5 min. Os personagens pediram água e o gato já deitou em cima do teclado.",
          "Levanta e toma água, escritora. Eu seguro a porteira enquanto você estica as costas.",
          "Descanso merecido. Até mocinho sarcástico tira o casaco entre um capítulo e outro."
        ],
        festa: [
          "Meta batida. Não que eu estivesse impressionado. (Eu estava.)",
          "Mais XP na mochila. A Dona Procrastinação acabou de pedir as contas.",
          "Carta lacrada na mão e sorriso no rosto. Manda ver no próximo capítulo!"
        ],
        questDragao: [
          "Quest fechada de ponta a ponta. Olha só: você praticamente matou um dragão com um teclado na mão.",
          "Todos os tomatinhos vermelhos e o dragão em fuga. Não que eu duvidasse... tá, fiquei impressionado sim."
        ]
      }
    },
    {
      id: "gatinha-fiscal",
      arquetipo: "A Gatinha da Fazenda",
      genero: "mascote",
      desbloqueadoInicio: true,
      descricao: "A gatinha laranja oficial da mesa. Fiscaliza sonecas e amassa pãozinho no rascunho.",
      estilo: null,
      falas: FALAS_MASCOTE
    },
    {
      id: "loiro-golden",
      arquetipo: "O Loiro Golden Retriever",
      genero: "mocinho",
      desbloqueadoInicio: false,
      descricao: "Sorriso fácil, cachos dourados e torcida organizada só sua.",
      estilo: {
        cabelo: "curto",
        corCabelo: "#E4B24B",
        corPele: "#F2C9A5",
        corOlho: "#5A8BB0",
        corRoupa: "#4E7D54",
        corDetalhe: "#F4D06F",
        prop: "girassol"
      },
      falas: {
        normal: [
          "Eu já gostei dessa cena antes mesmo de você começar! Posso segurar o café?",
          "Trouxe um bolinho imaginário da taverna pra comemorar cada parágrafo seu.",
          "Se o capítulo ficar tenso, promete que depois tem abraço quentinho?"
        ],
        foco: [
          "Tô na primeira fila torcendo em silêncio (prometo não abanar o rabo muito alto).",
          "Cada palavra sua aqui é praticamente fogos de artifício na fazenda!"
        ],
        pausa: [
          "Pausa de 5 min! Bebe água que eu já preparei almofada fofinha pro descanso.",
          "Os personagens também precisam respirar depois de tanto suspiro no corredor."
        ],
        festa: [
          "VOCÊ ESCREVEU TUDO ISSO?? Esse é oficialmente o meu dia favorito!!",
          "Vem comemorar! Até os passarinhos da fazenda estão batendo palma!"
        ],
        questDragao: [
          "VOCÊ MATOU UM DRAGÃO LITERÁRIO INTEIRO!! Tô jogando confete pra cima há dez minutos!!",
          "QUEST CONCLUÍDA!! Se tivesse campeonato de autora incrível, a taça já tinha seu nome!"
        ]
      }
    },
    {
      id: "ruiva-caotica",
      arquetipo: "A Ruiva Caótica",
      genero: "mocinha",
      desbloqueadoInicio: false,
      descricao: "Sardas, risada alta e zero paciência pra protagonista passando frio sem motivo.",
      estilo: {
        cabelo: "longo",
        corCabelo: "#C64E2E",
        corPele: "#F7CFB2",
        corOlho: "#4C8C58",
        corRoupa: "#6C457A",
        corDetalhe: "#E8A65D",
        prop: "pincel"
      },
      falas: {
        normal: [
          "Se a cena ficar morna, deixa que eu derrubo uma bandeja de vinho no salão!",
          "Trouxe tinta, drama e três teorias sobre o final desse livro.",
          "A Dona Procrastinação tentou me subornar com biscoito. Comi o biscoito e fechei a porta na cara dela."
        ],
        foco: [
          "Silêncio caótico ativado! Bota fogo bonito nesse diálogo!",
          "Vai soltando as palavras sem medo; depois a gente varre a bagunça juntas."
        ],
        pausa: [
          "Pausa de 5 min. Os personagens foram lavar o rosto e o gato assumiu o teclado.",
          "Hora de beber água antes que eu invente mais um plot twist sem você pedir."
        ],
        festa: [
          "ISSO! Arrasou bonito! Joga confete nessa mesa que hoje a guilda é nossa!",
          "Que delícia ver você vencer a página em branco desse jeito!"
        ],
        questDragao: [
          "AÊÊÊ!! Quest esmagada!! Alguém anota no pergaminho que você acabou de solar um dragão!",
          "Todos os tomatinhos acesos e zero piedade pro bloqueio! Hoje a taverna vira festa!"
        ]
      }
    },
    {
      id: "barde-dramatique",
      arquetipo: "O Bardo Não Binário Dramático",
      genero: "naobinario",
      desbloqueadoInicio: false,
      descricao: "Capuz de veludo, alaúde na mochila e narração teatral de cada vírgula.",
      estilo: {
        cabelo: "bardo",
        corCabelo: "#73589A",
        corPele: "#DFB08A",
        corOlho: "#D99F38",
        corRoupa: "#3E6B52",
        corDetalhe: "#D97F98",
        prop: "alaude"
      },
      falas: {
        normal: [
          "Hoje comporemos uma balada épica sobre o dia em que o Capítulo 4 finalmente cedeu!",
          "Posso tocar um acorde dramático sempre que houver olhar intenso no corredor?",
          "A inspiração às vezes cochila num banco da praça, mas já veio correndo quando você abriu a mesa."
        ],
        foco: [
          "Silêncio no palco... a pena da autora está escrevendo história!",
          "Cada sílaba conta nesta epopeia aconchegante. Sigo na coxia afinando o alaúde."
        ],
        pausa: [
          "Intervalo do primeiro ato! Água fresca, ombros leves e cinco minutos fora do palco.",
          "Pausa dramática de 5 min. Até barde de taverna guarda o instrumento pra respirar."
        ],
        festa: [
          "BRAVO! BISE! Um triunfo digno de versos dourados na taberna inteira!",
          "Soem os sinos da guilda! Mais uma vitória gravada no pergaminho!"
        ],
        questDragao: [
          "TOQUEM AS TROMBETAS!! HOJE NASCERÁ A CANÇÃO DA AUTORA QUE ABATEU UM DRAGÃO EM PLENA QUEST!",
          "Triunfo absoluto! Toda a taverna de pé ovacionando cada tomatinho aceso!"
        ]
      }
    },
    {
      id: "ceo-enigmatico",
      arquetipo: "O CEO Enigmático",
      genero: "mocinho",
      desbloqueadoInicio: false,
      descricao: "Terno impecável, relógio caro e um bloco inteiro dedicado a pagar seu café.",
      estilo: {
        cabelo: "arrumado",
        corCabelo: "#2F2724",
        corPele: "#E6BA93",
        corOlho: "#52687A",
        corRoupa: "#2A343E",
        corDetalhe: "#D9A441",
        prop: "pena"
      },
      falas: {
        normal: [
          "Cancelei três reuniões pra acompanhar esse capítulo. Pode começar.",
          "Investimento garantido do dia: cada palavra que você soma nessa mesa.",
          "Seu livro acha que é difícil? Nunca negociou comigo antes."
        ],
        foco: [
          "Agenda trancada. Nenhuma distração tem autorização pra cruzar essa porta.",
          "Excelente ritmo. Mantenha o foco e deixe o acabamento para a revisão."
        ],
        pausa: [
          "Cancelei três reuniões pra assistir esse pomodoro. Valeu cada minuto.",
          "Pausa de 5 min estipulada em contrato. Vá tomar água, por favor."
        ],
        festa: [
          "Resultado acima da meta esperada. Parabéns, sócia majoritária deste livro.",
          "Cartinha lacrada assinada e aprovada com louvor."
        ],
        questDragao: [
          "Quest concluída com excelência absoluta. Você literalmente enfrentou um dragão e voltou com dividendos.",
          "Reservei a melhor mesa e mandei soltar confete na cobertura inteira. Feito histórico."
        ]
      }
    },
    {
      id: "vila-elegante",
      arquetipo: "A Vilã Elegante",
      genero: "mocinha",
      desbloqueadoInicio: false,
      descricao: "Capa vinho, taça na mão e respeito absoluto por quem escreve boas rivalidades.",
      estilo: {
        cabelo: "longo",
        corCabelo: "#1E1924",
        corPele: "#F1CDB8",
        corOlho: "#9F3350",
        corRoupa: "#692539",
        corDetalhe: "#D9A441",
        prop: "taca"
      },
      falas: {
        normal: [
          "Querida, se o mocinho não colaborar hoje, a gente dá a melhor fala pra rival.",
          "Brindo à sua ousadia de abrir esse arquivo mesmo nos dias mais cheios.",
          "Elegância é escrever dez linhas e fingir que nunca houve bloqueio nenhum."
        ],
        foco: [
          "Silêncio real. Deixe a tinta escorrer como quem assina um tratado secreto.",
          "Ninguém interrompe uma autora em pleno golpe de mestre."
        ],
        pausa: [
          "Pausa de 5 min. Até rainhas de um reino sombrio param para tomar chá e alongar.",
          "Os gatos tomaram o trono da cadeira; aproveite os cinco minutos fora da tela."
        ],
        festa: [
          "Magnífico. A Dona Procrastinação foi banida da corte sem direito a recurso.",
          "Uma conquista à altura da sua pena. Saúde!"
        ],
        questDragao: [
          "Brava! Matou o dragão sem sequer amassar a capa. Poucas dominam uma quest assim.",
          "Todos os tomatinhos maduros no trono! A corte inteira está aplaudindo de pé."
        ]
      }
    },
    {
      id: "alquimista-floresta",
      arquetipo: "Alquimista da Floresta",
      genero: "naobinario",
      desbloqueadoInicio: false,
      descricao: "Avental cheio de ervas secas, poções borbulhantes e calma de cabana no bosque.",
      estilo: {
        cabelo: "medio",
        corCabelo: "#4D7B63",
        corPele: "#C9956D",
        corOlho: "#C9A14A",
        corRoupa: "#5E432C",
        corDetalhe: "#8FC788",
        prop: "pocao"
      },
      falas: {
        normal: [
          "Colhi camomila fresca pra sua mesa hoje. Cada frase é uma gotinha dourada no frasco.",
          "Não precisa fazer a poção inteira num minuto: deixa ferver devagarinho.",
          "Os musgos da estufa estão vibrando: sinal de cena boa vindo aí."
        ],
        foco: [
          "Misturando foco líquido em fogo brando... pode escrever sem pressa e sem culpa.",
          "Estou anotando as medidas aqui no canto enquanto você colhe palavras."
        ],
        pausa: [
          "Cinco minutinhos pra poção descansar! Bebe água e olha um pouco pra longe da tela.",
          "Pausa verde no jardim: os personagens sentaram na varanda pra tomar ar."
        ],
        festa: [
          "A poção ficou dourada! Que alquimia linda você fez hoje!",
          "Frasco cheio, XP tinindo e um sorriso que ilumina a estufa toda!"
        ],
        questDragao: [
          "Poção lendária concluída! Até as árvores da estufa estão soltando faísca dourada com esse dragão vencido!",
          "Que magia linda! Quest inteirinha fechada: merece celebração com brilho e chá dourado!"
        ]
      }
    },
    {
      id: "principe-fadas",
      arquetipo: "O Príncipe das Fadas Dramático",
      genero: "mocinho",
      desbloqueadoInicio: false,
      descricao: "Cabelo prateado, capa estelar e drama poético em absolutamente tudo.",
      estilo: {
        cabelo: "elfo",
        corCabelo: "#D8E0E8",
        corPele: "#F2D5C2",
        corOlho: "#6898B8",
        corRoupa: "#3C576F",
        corDetalhe: "#E8C56E",
        prop: "brilho"
      },
      falas: {
        normal: [
          "Atravessei três portais feéricos só pra ver qual capítulo nasce das suas mãos hoje.",
          "Prometa que haverá pelo menos um juramento impossível sob o luar nesta cena.",
          "Se a dúvida bater à janela, ordeno aos vagalumes que a escoltem para o bosque."
        ],
        foco: [
          "O tempo mortal para enquanto você escreve. As estrelas escutam.",
          "Prossiga, escriba soberana. Nenhum duende mexerá neste parágrafo."
        ],
        pausa: [
          "Pausa de 5 min decretada pela Corte da Aurora. Água fresca e respiro fundo.",
          "Até seres imortais descansam após um capítulo intenso."
        ],
        festa: [
          "Sublime! Toda a corte feérica brindou à sua conquista esta noite!",
          "Uma joia rara adicionada ao seu tesouro literário!"
        ],
        questDragao: [
          "POR TODAS AS ESTRELAS!! Você derrotou o dragão da quest e toda a Corte Feérica aplaude de pé!",
          "Um feito digno de coroa dourada! Os vagalumes estão fazendo chuva de glitter por você!"
        ]
      }
    },
    {
      id: "amiga-ranzinza",
      arquetipo: "A Melhor Amiga Ranzinza",
      genero: "mocinha",
      desbloqueadoInicio: false,
      descricao: "Óculos escorregando, humor ácido e lealdade inabalável contra qualquer bloqueio.",
      estilo: {
        cabelo: "curto",
        corCabelo: "#4D3225",
        corPele: "#B97D56",
        corOlho: "#3A2416",
        corRoupa: "#8F5038",
        corDetalhe: "#F2C968",
        prop: "livro"
      },
      falas: {
        normal: [
          "Olha, seu capítulo pode até fingir que tá complicado, mas a gente sabe que você resolve.",
          "Trouxe chá quente e zero paciência pra perfeccionismo no primeiro rascunho.",
          "Se o protagonista falar besteira, deixa que eu mesma corto a fala dele na revisão."
        ],
        foco: [
          "Fecha o resto das abas na cabeça e manda bala nessas palavras.",
          "Tô lendo um livro aqui do lado. Finge que nem tô olhando e vai escrevendo."
        ],
        pausa: [
          "Pausa de 5 min! Vai esticar esse pescoço agora, ordem da melhor amiga.",
          "Os personagens podem esperar cinco minutos no corredor tomando água."
        ],
        festa: [
          "Eu não disse?! Não tem capítulo teimoso que aguente você por muito tempo.",
          "Merece demais! Agora já pode colocar um mimo lá na sua Lista de Desejos."
        ],
        questDragao: [
          "Eu avisei ou não avisei?! Você acabou de matar um dragão e ainda fechou a quest inteira!",
          "Palmas reais! Vai comemorar sem culpa nenhuma porque essa quest foi épica!"
        ]
      }
    },
    {
      id: "feiticeire-torre",
      arquetipo: "Feiticeire da Torre",
      genero: "naobinario",
      desbloqueadoInicio: false,
      descricao: "Orbe flutuante, humor afiado e feitiço anti-culpa sempre ativo.",
      estilo: {
        cabelo: "baguncado",
        corCabelo: "#2D3648",
        corPele: "#EAC5A8",
        corOlho: "#9A62B8",
        corRoupa: "#493763",
        corDetalhe: "#6AB59E",
        prop: "orbe"
      },
      falas: {
        normal: [
          "Conjurei um círculo protetor ao redor da sua mesa. Culpa literária bate na barreira e volta.",
          "Se a cena parecer boba no rascunho, lembra que até magia ancestral começa num rabisco.",
          "A Dona Procrastinação caiu numa armadilha de sapos ali fora. Temos o turno livre."
        ],
        foco: [
          "Mana canalizada pro teclado! Deixa os dedos irem na frente da censura interna.",
          "Orbe no máximo, foco cristalino, rascunho crescendo."
        ],
        pausa: [
          "Pausa de 5 min para resfriar o caldeirão. Bebe água e olha pela janela!",
          "Desarmando os feitiços por cinco minutinhos pro seu cérebro respirar."
        ],
        festa: [
          "Feitiço perfeito! As runas do seu pergaminho estão brilhando até daqui!",
          "Que espetáculo de XP! A torre inteira celebrou essa medalha."
        ],
        questDragao: [
          "FEITIÇO SUPREMO! Quest concluída e dragão evaporado em nuvem de glitter!",
          "A torre inteira tremeu com essa salva de palmas! Que vitória deliciosa!"
        ]
      }
    },
    {
      id: "amigo-infancia",
      arquetipo: "O Melhor Amigo de Infância",
      genero: "mocinho",
      desbloqueadoInicio: false,
      descricao: "Suéter macio, riso tranquilo e memória de quantas histórias você já tirou do papel.",
      estilo: {
        cabelo: "baguncado",
        corCabelo: "#6B452A",
        corPele: "#DFB28E",
        corOlho: "#5D422E",
        corRoupa: "#587255",
        corDetalhe: "#D6B084",
        prop: "cafe"
      },
      falas: {
        normal: [
          "Lembra quando essa história era só duas linhas soltas? Olha o tamanho dela agora.",
          "Passei na padaria e deixei um pãozinho de queijo imaginário do lado do mouse.",
          "Qualquer ritmo hoje já conta. Tô aqui do seu lado desde a página zero."
        ],
        foco: [
          "Vai no seu tempo, amiga. Tô aqui quietinho segurando a caneca pra você.",
          "Cada linha que aparece aí na tela já me dá orgulho dessa história."
        ],
        pausa: [
          "Pausa de 5 min! Bebe um gole d'água e descansa os olhos, combinado?",
          "Cinco minutinhos fora do arquivo; prometo guardar sua página direitinho."
        ],
        festa: [
          "Olha só você conquistando mais um pedaço do livro! Feliz demais por aqui!",
          "Sabia que você ia conseguir! Bora comemorar bonito."
        ],
        questDragao: [
          "VOCÊ CONSEGUIU! Quest todinha concluída: parece até que matou um dragão e trouxe o tesouro!",
          "Tô aplaudindo daqui faz hora! Olha o brilho dessa vitória!"
        ]
      }
    },
    {
      id: "cavaleira-protetora",
      arquetipo: "A Cavaleira Protetora",
      genero: "mocinha",
      desbloqueadoInicio: false,
      descricao: "Trança firme, escudo na porta e tolerância zero com quem duvida da sua escrita.",
      estilo: {
        cabelo: "tranca",
        corCabelo: "#3B281E",
        corPele: "#9E6A47",
        corOlho: "#688D56",
        corRoupa: "#63727F",
        corDetalhe: "#D9A441",
        prop: "escudo"
      },
      falas: {
        normal: [
          "Escudo erguido na porteira da fazenda: hoje você escreve em paz absoluta.",
          "Cada parágrafo é terreno conquistado. Avança quando estiver pronta!",
          "Nenhum monstro de página em branco aguenta dez minutos de guarda nossa."
        ],
        foco: [
          "Linha de frente segura! Foca só na próxima frase da sua história.",
          "Firme e serena. A cidadela do seu rascunho tá crescendo a olhos vistos."
        ],
        pausa: [
          "Baixando o escudo por 5 min: hidratação e descanso obrigatório da tropa!",
          "Pausa de guarnição. Estica os braços que o turno volta já já."
        ],
        festa: [
          "Vitória em campo aberto! Ergam os estandartes dessa guilda!",
          "Mais uma medalha forjada com suor e carinho. Orgulho total!"
        ],
        questDragao: [
          "DRAGÃO ABATIDO EM CAMPO ABERTO!! Levantem os escudos e façam barulho pra essa quest fechada!",
          "Vitória lendária! Todos os tomatinhos vermelhos e honra máxima na guilda!"
        ]
      }
    },
    {
      id: "vilao-mocinho",
      arquetipo: "O Vilão que Talvez Seja Mocinho",
      genero: "mocinho",
      desbloqueadoInicio: false,
      descricao: "Sobretudo escuro, meio sorriso perigoso e fraqueza assumida pelo seu livro.",
      estilo: {
        cabelo: "medio",
        corCabelo: "#1D1B22",
        corPele: "#E6C1A6",
        corOlho: "#A64B4B",
        corRoupa: "#312432",
        corDetalhe: "#C86446",
        prop: "livro"
      },
      falas: {
        normal: [
          "Não conta pra ninguém, mas eu já sabotei três distrações suas no caminho até aqui.",
          "Se precisar de um diálogo com tensão de faca no pescoço e cuidado escondido, tô pronto.",
          "Só não me faça perder a reputação dizendo que tô torcendo por você. (Tô sim.)"
        ],
        foco: [
          "Quietinho agora. Deixa o capítulo descobrir do que você é capaz.",
          "Qualquer barulho lá fora eu resolvo. Você só escreve."
        ],
        pausa: [
          "Cinco minutos de trégua. Toma água antes que eu tenha que insistir.",
          "Pausa de 5 min. Os gatos exigiram carinho e ninguém ousa contrariar."
        ],
        festa: [
          "Impressionante... até eu tive que aplaudir de pé dessa vez.",
          "Mais uma vitória no placar. Nunca duvidei de você (só não espalha)."
        ],
        questDragao: [
          "Certo... até o dragão pediu arrego. Confesso: estou batendo palmas de pé pra essa quest.",
          "Você acabou de solar um dragão com puro talento. Vai lá pegar seu confete, só não diz que fui eu que joguei."
        ]
      }
    },
    {
      id: "vizinho-302",
      arquetipo: "O Vizinho Rabugento do 302",
      genero: "mocinho",
      desbloqueadoInicio: false,
      descricao: "Reclama do barulho, mas devolve sua encomenda com um bilhete. E um bolo.",
      estilo: {
        cabelo: "baguncado",
        corCabelo: "#3B2820",
        corPele: "#E8C09D",
        corOlho: "#4A6B53",
        corRoupa: "#4B5D6B",
        corDetalhe: "#D8B88A",
        prop: "bolo"
      },
      falas: {
        normal: [
          "Seu pacote chegou na minha porta de novo. Aproveitei e deixei um bolo de laranja, só porque sobrou.",
          "Dá pra ouvir seu teclado do corredor inteiro. Pelo menos o capítulo parece estar ficando bom.",
          "Não vim puxar assunto, só vim avisar que o café da padaria da esquina saiu fresco agora."
        ],
        foco: [
          "Se você vai digitar pelos próximos 25 minutos, eu fico quieto aqui do lado. Só não para no meio da cena.",
          "Foco ligado. Eu aviso o síndico pra ninguém tocar a campainha até o relógio apitar."
        ],
        pausa: [
          "Cinco minutos de silêncio no 302. Toma um gole d'água e come uma fatia do bolo antes que esfrie.",
          "Pausa. Levanta dessa cadeira um pouco, porque até eu sei que coluna travada não termina romance."
        ],
        festa: [
          "Meta batida. Fiz outro café porque imaginei que você ia conseguir. Não acostuma.",
          "Ouvi você comemorando daqui. Parabéns pela meta, de verdade."
        ],
        metaMinima: [
          "Dia puxado e você ainda bateu a meta mínima. Deixei um bilhete na porta dizendo que já valeu o dia.",
          "Meta mínima garantida. Nem toda terça precisa ser épica; hoje você fez o que precisava."
        ],
        tomatinho: [
          "Mais um tomatinho aceso. O barulho do seu teclado tá valendo a pena.",
          "Um pomodoro a menos entre você e o fim dessa cena. Continua."
        ],
        questDragao: [
          "Quest inteira concluída. Se alguém reclamar da comemoração no condomínio, eu digo que a festa é minha.",
          "Todos os tomatinhos fechados! Trouxe o bolo inteiro dessa vez porque você praticamente derrubou um dragão."
        ],
        desbloqueio: [
          "Bati na porta só pra entregar essa cartinha. Já que estou aqui, puxo uma cadeira e fico de olho no capítulo."
        ]
      }
    },
    {
      id: "rival-escritorio",
      arquetipo: "A Rival do Escritório",
      genero: "mocinha",
      desbloqueadoInicio: false,
      descricao: "Planilha impecável, café preto e um placar mental de quem ganhou a última reunião.",
      estilo: {
        cabelo: "arrumado",
        corCabelo: "#1F1A1C",
        corPele: "#F1C9A8",
        corOlho: "#3A5A78",
        corRoupa: "#2C3E55",
        corDetalhe: "#E8D8B8",
        prop: "planilha"
      },
      falas: {
        normal: [
          "Atualizei a planilha: você está a três parágrafos de deixar minha meta no chinelo. Quero só ver.",
          "Trouxe dois cafés pretos. Um é meu, o outro é pra garantir que nossa disputa continue justa.",
          "Ninguém escreve diálogo afiado como você, mas se perguntarem na reunião eu nego até o fim."
        ],
        foco: [
          "Relógio rodando. Vinte e cinco minutos sem olhar notificação, valendo um ponto no nosso placar.",
          "Modo foco ativado. Já fechei minha porta pra ninguém interromper sua produtividade."
        ],
        pausa: [
          "Intervalo estratégico de 5 minutos. Hidratação também faz parte da alta performance.",
          "Pausa na agenda. Respira, alonga o pulso e não ouse ler e-mail agora."
        ],
        festa: [
          "Meta do dia batida com folga! Anotei um ponto dourado no seu nome na minha planilha secreta.",
          "Resultado impecável. Confesso que estou orgulhosa (mas mantenha isso fora da ata)."
        ],
        metaMinima: [
          "Meta mínima entregue num dia difícil. Em gestão de crise, consistência vale o dobro de pontos.",
          "Bateu a mínima e manteve o projeto vivo. Vitória técnica legítima no meu placar."
        ],
        tomatinho: [
          "Tomatinho vermelho registrado na coluna de entregas. Excelente ritmo.",
          "Mais um bloco concluído no prazo. Você está levando essa cena a sério mesmo."
        ],
        questDragao: [
          "Quest fechada com 100% de aproveitamento! Declarei feriado no nosso andar pra comemorar seu dragão derrotado.",
          "Relatório final: o dragão foi humilhado e você entregou a quest inteira. Brinde de café expresso duplo!"
        ],
        desbloqueio: [
          "Recebi a convocação na cartinha lacrada. Trouxe minha prancheta, dois cafés e total confiança no seu livro."
        ]
      }
    },
    {
      id: "barista-pedido",
      arquetipo: "O Barista que Já Sabe o Seu Pedido",
      genero: "mocinho",
      desbloqueadoInicio: false,
      descricao: "Escreve seu nome errado no copo de propósito. Desenha um coração na espuma.",
      estilo: {
        cabelo: "curto",
        corCabelo: "#6A3E25",
        corPele: "#E3B18A",
        corOlho: "#5C4028",
        corRoupa: "#2F6B4E",
        corDetalhe: "#F3E3C8",
        prop: "copoCoracao"
      },
      falas: {
        normal: [
          "Já deixei sua mesa do canto reservada e desenhei um coração duplo na espuma do leite.",
          "Escrevi 'Maior Autora do Bairro' no seu copo hoje. Não foi erro de ortografia, foi spoiler.",
          "O cheiro de grão moído na hora e capítulo novo combinam demais, pode admitir."
        ],
        foco: [
          "Pomodoro na máquina! Enquanto o café passa, você manda ver nesse capítulo.",
          "Foco quentinho saindo no balcão. Eu seguro a fila do caixa pra ninguém te distrair."
        ],
        pausa: [
          "Pausa pro pão de queijo quentinho! Cinco minutos pra soprar a xícara e descansar os olhos.",
          "Descanso de 5 min. Troquei sua água por uma fresquinha com hortelã."
        ],
        festa: [
          "Meta do dia batida!! Essa rodada de cappuccino com canela é por conta da casa!",
          "Olha esse placar subindo! Vou desenhar uma coroa na espuma do seu próximo pedido."
        ],
        metaMinima: [
          "Meta mínima batida num dia corrido! Merece cookie extra quentinho no pires, sem discussão.",
          "Mesmo no dia puxado você escreveu. Pra mim, isso vale o maior copo do cardápio."
        ],
        tomatinho: [
          "Plim! Mais um tomatinho maduro saindo junto com a fornada da tarde.",
          "Tomatinho aceso! Cada ciclo seu deixa a cafeteria inteira na torcida."
        ],
        questDragao: [
          "QUEST CONCLUÍDA! Fechei a cafeteria mais cedo, botei música boa e fiz calda de chocolate extra pro seu troféu de dragão!",
          "Você derrotou o dragão da cena! Pendurei seu copo com coração na prateleira de honra do balcão!"
        ],
        desbloqueio: [
          "Sua cartinha chegou junto com a entrega de café! Já separei seu pedido favorito pra acompanhar a escrita."
        ]
      }
    },
    {
      id: "madrinha-organizadora",
      arquetipo: "A Madrinha Organizadora",
      genero: "mocinha",
      desbloqueadoInicio: false,
      descricao: "Prancheta, fone de ouvido e um plano B pro plano B do casamento dos outros.",
      estilo: {
        cabelo: "tranca",
        corCabelo: "#543222",
        corPele: "#D89E78",
        corOlho: "#4B3628",
        corRoupa: "#8C587A",
        corDetalhe: "#F6E2D8",
        prop: "prancheta"
      },
      falas: {
        normal: [
          "Prancheta na mão, alfinete no bolso e cronograma pronto: hoje esse capítulo entra nos eixos.",
          "Se a cena der errado, tenho o plano B, o plano C e uma caixa de docinhos escondida na bolsa.",
          "Já botei a Dona Procrastinação na mesa mais longe do buffet. Pode escrever em paz."
        ],
        foco: [
          "Atenção na escuta: iniciando 25 minutos de foco total. Ninguém entra no salão agora!",
          "Valendo! Deixa os convidados comigo e foca só no que seus personagens têm pra dizer."
        ],
        pausa: [
          "Cinco minutos de camarim! Retoca a água, solta os ombros e come um bem-casado.",
          "Pausa cronometrada. Eu vigio o relógio pra você descansar de verdade sem olhar a hora."
        ],
        festa: [
          "Meta batida no horário perfeito! Já autorizei o DJ a soltar sua música favorita!",
          "Checklist do dia concluído com brilho! Nem cerimônia ao pôr do sol dá tanta satisfação."
        ],
        metaMinima: [
          "Meta mínima cumprida! Quando chove no jardim, a gente abre a tenda e a festa fica linda do mesmo jeito.",
          "Dia difícil resolvido com elegância: meta mínima no papel e zero estresse no cronograma."
        ],
        tomatinho: [
          "Check na prancheta! Mais um tomatinho vermelho entregue sem atraso.",
          "Tomatinho aceso! O cortejo do capítulo está andando redondo."
        ],
        questDragao: [
          "Quest concluída e dragão domado! Pode jogar o buquê pro alto que essa cena foi digna de final de filme!",
          "Todos os itens da quest cumpridos! Soltei chuva de pétalas e confete porque você arrasou demais!"
        ],
        desbloqueio: [
          "Cartinha recebida no fone! Cheguei com prancheta, docinho de festa e plano completo pra sua sessão render."
        ]
      }
    },
    {
      id: "ex-voltou",
      arquetipo: "O Ex que Voltou pra Cidade",
      genero: "mocinho",
      desbloqueadoInicio: false,
      descricao: "Jaqueta de couro, carro velho e um \"a gente precisa conversar\" que nunca sai.",
      estilo: {
        cabelo: "medio",
        corCabelo: "#252023",
        corPele: "#E6BA95",
        corOlho: "#5A7247",
        corRoupa: "#2D2624",
        corDetalhe: "#E6DED5",
        prop: "chaveCarro"
      },
      falas: {
        normal: [
          "Passei na frente da sua janela e vi a luz acesa. Você ainda faz aquela mesma cara concentrada quando escreve.",
          "Eu tinha um discurso inteiro ensaiado, mas prefiro ficar quieto vendo você dar vida pra esse livro.",
          "Guardei seu doce favorito da estrada no banco do carona. Pra quando você terminar essa página."
        ],
        foco: [
          "Vinte e cinco minutos. Prometo não falar nada que atrapalhe seu raciocínio até o relógio tocar.",
          "Escreve aí. Eu fico encostado na janela cuidando pra nada interromper seu capítulo."
        ],
        pausa: [
          "Pausa de 5 min. Vem tomar um ar na varanda comigo antes do próximo bloco.",
          "Descansa as mãos um instante. O texto não vai fugir da cidade, eu garanto."
        ],
        festa: [
          "Meta batida. Eu sabia desde aquela época que você ia escrever coisas incríveis assim.",
          "Olha você brilhando de novo. Acho que voltei pra cidade na hora certa só pra aplaudir isso."
        ],
        metaMinima: [
          "Meta mínima num dia pesado. Você nunca desistiu fácil de nada, é uma das minhas coisas favoritas em você.",
          "Dia difícil vencido. Mesmo devagar, você sempre chega onde quer."
        ],
        tomatinho: [
          "Mais um tomatinho aceso. Você no embalo sempre foi bonito de ver.",
          "Um passo de cada vez e a história inteira vai tomando forma."
        ],
        questDragao: [
          "Quest concluída e um dragão inteiro no chão. A gente precisa conversar... sobre como você escreve bem demais.",
          "Todos os tomatinhos vermelhos! Liguei o rádio do carro no último volume pra comemorar essa vitória sua."
        ],
        desbloqueio: [
          "Estacionei lá fora assim que abri sua cartinha. Se ainda tiver lugar nessa mesa, eu fico até o último capítulo."
        ]
      }
    },
    {
      id: "colega-fofoqueira",
      arquetipo: "A Colega de Apartamento Fofoqueira",
      genero: "mocinha",
      desbloqueadoInicio: false,
      descricao: "Pipoca no colo e opinião formada sobre o seu crush desde o capítulo 1.",
      estilo: {
        cabelo: "longo",
        corCabelo: "#B87333",
        corPele: "#F4C8A4",
        corOlho: "#6B442A",
        corRoupa: "#D96B52",
        corDetalhe: "#FCE8C8",
        prop: "pipoca"
      },
      falas: {
        normal: [
          "Fiz um balde de pipoca amanteigada! Me conta TUDO o que vai acontecer nessa cena agora!",
          "Eu avisei desde o capítulo 1 que esses dois iam acabar dividindo o mesmo guarda-chuva!",
          "Não para de digitar! Eu preciso saber o que ela vai responder nessa discussão!"
        ],
        foco: [
          "Silêncio no sofá pelos próximos 25 minutos! Só vou mastigar a pipoca bem baixinho enquanto você escreve.",
          "Começou o pomodoro! Manda ver no drama que eu tô pronta pro próximo plot twist!"
        ],
        pausa: [
          "PAUSA! Agora sim: toma água e me dá um spoiler pequenininho do próximo parágrafo!",
          "Cinco minutinhos pra esticar as pernas no tapete da sala e pegar mais pipoca."
        ],
        festa: [
          "META BATIDA!! Eu sabia!! Já mandei áudio no grupo do prédio dizendo que minha colega é genial!",
          "Que capítulo foi esse?! Bateu a meta do dia e me deixou de queixo caído na sala!"
        ],
        metaMinima: [
          "Meta mínima garantida! Em dia cansado, cada linha de fofoca literária vale ouro!",
          "Você escreveu mesmo num dia corrido! Já deixei coberta fofinha e chá pronto no sofá."
        ],
        tomatinho: [
          "Tomatinho aceso! Essa cena tá esquentando mais que a pipoqueira!",
          "Mais um tomatinho vermelho! O ritmo desse capítulo tá viciante!"
        ],
        questDragao: [
          "VOCÊ FECHOU A QUEST INTEIRA!! Joguei pipoca pro alto, bati palma na varanda e o dragão saiu correndo!",
          "Quest concluída com sucesso absoluto! Esse episódio merece maratona, tapete vermelho e festa na sala!"
        ],
        desbloqueio: [
          "Abri a cartinha antes do carteiro descer o elevador! Trouxe o balde de pipoca e já sou fã número um do livro!"
        ]
      }
    },
    {
      id: "florista-romantico",
      arquetipo: "O Florista Não Binário Romântico Incurável",
      genero: "naobinario",
      desbloqueadoInicio: false,
      descricao: "Sabe o significado de cada flor e já montou o buquê do seu final feliz.",
      estilo: {
        cabelo: "medio",
        corCabelo: "#5A4638",
        corPele: "#EBC39E",
        corOlho: "#4E7D54",
        corRoupa: "#5C8D58",
        corDetalhe: "#E899B5",
        prop: "buque"
      },
      falas: {
        normal: [
          "Colhi lavanda pra acalmar a revisão e camélia rosada porque hoje tem cena de suspiro no ar.",
          "Na linguagem das flores, cada linha que você escreve significa coragem e romance bonito.",
          "Já deixei o vaso da sua mesa florido: história cuidada com carinho floresce no próprio tempo."
        ],
        foco: [
          "Vinte e cinco minutos de rega criativa. Deixa suas palavras brotarem sem pressa e sem poda agora.",
          "Pomodoro florindo! Eu cuido da estufa enquanto você cultiva esse capítulo."
        ],
        pausa: [
          "Pausa de 5 min pra respirar perfume de jasmim e beber água fresca. Até girassol descansa à sombra.",
          "Intervalo suave. Estica os braços como folha tomando sol da manhã."
        ],
        festa: [
          "Meta do dia em plena florada! Montei um arranjo de peônias e margaridas só pra celebrar você!",
          "Que colheita linda de palavras! Seu livro está desabrochando página por página."
        ],
        metaMinima: [
          "Meta mínima batida! Semente regada em dia nublado é a que cria a raiz mais forte do jardim.",
          "Mesmo num dia difícil você cuidou da sua história. Trouxe um raminho de alecrim pra te dar alegria."
        ],
        tomatinho: [
          "Mais um tomatinho maduro no canteiro da sua quest! Que orgulho dessa colheita.",
          "Tomatinho vermelho aceso! Seu jardim literário está cheio de vida hoje."
        ],
        questDragao: [
          "Quest concluída! O dragão se rendeu com uma coroa de flores na cabeça e a estufa inteira está em festa!",
          "Todos os tomatinhos maduros! Soltei chuva de pétalas pela fazenda inteira pra aplaudir seu final feliz!"
        ],
        desbloqueio: [
          "Sua cartinha veio perfumada de flor de laranjeira! Trouxe o buquê mais bonito da loja pra enfeitar sua mesa."
        ]
      }
    }
  ];

  const PERSONAGENS_UNLOCK_POOL = ELENCO_NPCS.filter((n) => !n.desbloqueadoInicio);

  const TAMANHOS_QUEST = {
    P: { pomodoros: 1, xp: 10 },
    M: { pomodoros: 2, xp: 25 },
    G: { pomodoros: 3, xp: 50 }
  };

  const MARCOS_PADRAO = [
    "Fim do 1º ato",
    "Metade",
    "Primeiro beijo",
    "FIM",
    "Entreguei!"
  ];

  const MEDALHAS_DEFINICOES = [
    {
      id: "primeira-semente",
      icone: "🌱",
      nome: "Primeira Semente",
      desc: "Plantou as primeiras palavras na Mesa.",
      dica: "Dica: some qualquer palavra na Mesa de Escrita.",
      regra: (ctx) => ctx.totalPalavrasGeral > 0
    },
    {
      id: "dia-dificil",
      icone: "🛡️",
      nome: "Dia Difícil Vencido",
      desc: "Bateu a meta mínima num dia puxado.",
      dica: "Dica: alcance sua meta mínima de palavras no dia.",
      regra: (ctx) => ctx.bateuMinimaAlgumaVez
    },
    {
      id: "meta-dia",
      icone: "🎯",
      nome: "Meta do Dia Cravada",
      desc: "Fechou a meta diária completa de escrita.",
      dica: "Dica: feche 100% da sua meta diária de palavras.",
      regra: (ctx) => ctx.bateuMetaDiaAlgumaVez
    },
    {
      id: "primeiro-tomate",
      icone: "🍅",
      nome: "Tomate Maduro",
      desc: "Completou seu primeiro pomodoro na fazenda.",
      dica: "Dica: conclua um pomodoro de foco completo.",
      regra: (ctx) => ctx.totalPomodorosGeral >= 1
    },
    {
      id: "cacadora-quests",
      icone: "⚔️",
      nome: "Caçadora de Quests",
      desc: "Concluiu sua primeira missão ou quest.",
      dica: "Dica: conclua qualquer missão ou quest.",
      regra: (ctx) => ctx.totalMissoesGeral >= 1
    },
    {
      id: "bisturi-ouro",
      icone: "🔍",
      nome: "Bisturi de Ouro",
      desc: "Acumulou 15+ minutos de revisão no texto.",
      dica: "Dica: registre 15 minutos no modo Revisar.",
      regra: (ctx) => ctx.totalRevisaoGeral >= 15
    },
    {
      id: "cronista-bordo",
      icone: "📖",
      nome: "Cronista de Bordo",
      desc: "Registrou sua primeira entrada no Diário de Bordo.",
      dica: "Dica: salve uma entrada no Diário de Bordo.",
      regra: (ctx) => ctx.totalDiario >= 1
    },
    {
      id: "milhar-lendario",
      icone: "🔥",
      nome: "Milhar Lendário",
      desc: "Escreveu 1.000+ palavras num único dia.",
      dica: "Dica: some 1.000 palavras em um único dia.",
      regra: (ctx) => ctx.maiorDiaPalavras >= 1000
    },
    {
      id: "cesto-tomates",
      icone: "🧺",
      nome: "Cesto de Tomates",
      desc: "Acumulou 5 pomodoros de foco concluídos.",
      dica: "Dica: conclua 5 pomodoros de foco no total.",
      regra: (ctx) => ctx.totalPomodorosGeral >= 5
    },
    {
      id: "colheita-vermelha",
      icone: "🍅",
      nome: "Colheita Vermelha",
      desc: "Acumulou 15 pomodoros de foco na fazenda.",
      dica: "Dica: conclua 15 pomodoros de foco no total.",
      regra: (ctx) => ctx.totalPomodorosGeral >= 15
    },
    {
      id: "aventureira-firme",
      icone: "🗺️",
      nome: "Aventureira Firme",
      desc: "Concluiu 3 quests ou missões na fazenda.",
      dica: "Dica: conclua 3 quests ou missões no total.",
      regra: (ctx) => ctx.totalMissoesGeral >= 3
    },
    {
      id: "lenda-mural",
      icone: "👑",
      nome: "Lenda do Mural",
      desc: "Concluiu 7 quests ou missões na fazenda.",
      dica: "Dica: conclua 7 quests ou missões no total.",
      regra: (ctx) => ctx.totalMissoesGeral >= 7
    },
    {
      id: "cirurgia-fina",
      icone: "✂️",
      nome: "Cirurgia Fina",
      desc: "Acumulou 60+ minutos de revisão no texto.",
      dica: "Dica: some 60 minutos totais de revisão.",
      regra: (ctx) => ctx.totalRevisaoGeral >= 60
    },
    {
      id: "lente-afiada",
      icone: "🔎",
      nome: "Lente Afiada",
      desc: "Acumulou 150+ minutos de revisão no texto.",
      dica: "Dica: some 150 minutos totais de revisão.",
      regra: (ctx) => ctx.totalRevisaoGeral >= 150
    },
    {
      id: "confidente-papel",
      icone: "💌",
      nome: "Confidente do Papel",
      desc: "Guardou 3 registros no Diário de Bordo.",
      dica: "Dica: escreva 3 entradas no Diário de Bordo.",
      regra: (ctx) => ctx.totalDiario >= 3
    },
    {
      id: "memoria-viva",
      icone: "📚",
      nome: "Memória Viva",
      desc: "Guardou 7 registros no Diário de Bordo.",
      dica: "Dica: escreva 7 entradas no Diário de Bordo.",
      regra: (ctx) => ctx.totalDiario >= 7
    },
    {
      id: "agenda-em-dia",
      icone: "📌",
      nome: "Agenda em Dia",
      desc: "Cadastrou seu primeiro prazo na aba Prazos.",
      dica: "Dica: anote um prazo na aba Prazos.",
      regra: (ctx) => ctx.totalPrazos >= 1
    },
    {
      id: "capitulo-parrudo",
      icone: "📜",
      nome: "Capítulo Parrudo",
      desc: "Acumulou 5.000+ palavras escritas na Central.",
      dica: "Dica: some 5.000 palavras escritas no total.",
      regra: (ctx) => ctx.totalPalavrasGeral >= 5000
    },
    {
      id: "manuscrito-firme",
      icone: "🏰",
      nome: "Manuscrito Firme",
      desc: "Acumulou 15.000+ palavras escritas na Central.",
      dica: "Dica: some 15.000 palavras escritas no total.",
      regra: (ctx) => ctx.totalPalavrasGeral >= 15000
    }
  ];

  // ---------- Utilitários ----------
  function hojeISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function dataPassadaISO(diasAtras) {
    const d = new Date();
    d.setDate(d.getDate() - diasAtras);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function minutoAtualChave() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hojeISO()} ${hh}:${mm}`;
  }

  function formatarNumero(n) {
    return Number(n || 0).toLocaleString("pt-BR");
  }

  function formatarDataBR(iso) {
    if (!iso || !iso.includes("-")) return iso || "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function contarPalavrasTexto(texto) {
    const limpo = (texto || "").trim();
    if (!limpo) return 0;
    return limpo.split(/\s+/).filter(Boolean).length;
  }

  function gerarId(prefixo) {
    return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function calcularNivelRPG(xp) {
    const val = Number(xp) || 0;
    if (val < 100) return { nivel: 1, titulo: "Aprendiz de Escriba" };
    if (val < 250) return { nivel: 2, titulo: "Domadora de Rascunho" };
    if (val < 500) return { nivel: 3, titulo: "Barda da Madrugada" };
    if (val < 900) return { nivel: 4, titulo: "Arquimaga do Cap. 12" };
    const extra = 5 + Math.floor((val - 900) / 400);
    return { nivel: extra, titulo: "Lenda Editorial" };
  }

  // ---------- Arte Pixel Original: Tomatinho Verde -> Vermelho ----------
  function gerarTomatinhoSVG(maduro) {
    const px = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
    const corpoPrincipal = maduro ? "#E64539" : "#76B865";
    const corpoSombra = maduro ? "#B5261C" : "#4E8A40";
    const brilho = maduro ? "#FFB8AD" : "#C9F0B8";
    const contorno = maduro ? "#6B1A14" : "#2D5224";
    const cabinho = maduro ? "#3E7A38" : "#2D5724";

    return `
      <svg viewBox="0 0 16 16" width="100%" height="100%" shape-rendering="crispEdges" aria-hidden="true">
        <!-- Cabinho e folhinha -->
        ${px(7, 1, 2, 2, cabinho)}
        ${px(5, 3, 6, 1, cabinho)}
        ${px(6, 2, 1, 1, "#5FA854")}
        ${px(9, 2, 1, 1, "#5FA854")}
        <!-- Contorno superior -->
        ${px(5, 4, 6, 1, contorno)}
        ${px(3, 5, 2, 1, contorno)}
        ${px(11, 5, 2, 1, contorno)}
        <!-- Contorno lateral & base -->
        ${px(2, 6, 1, 5, contorno)}
        ${px(13, 6, 1, 5, contorno)}
        ${px(3, 11, 2, 1, contorno)}
        ${px(11, 11, 2, 1, contorno)}
        ${px(5, 12, 6, 1, contorno)}
        <!-- Corpo -->
        ${px(5, 5, 6, 7, corpoPrincipal)}
        ${px(3, 6, 10, 5, corpoPrincipal)}
        <!-- Sombra na base e lateral direita -->
        ${px(10, 6, 3, 5, corpoSombra)}
        ${px(5, 11, 6, 1, corpoSombra)}
        <!-- Brilho pixelado -->
        ${px(4, 6, 2, 2, brilho)}
        ${px(4, 8, 1, 1, brilho)}
      </svg>
    `;
  }

  // ---------- Criação de dados padrão & Migração ----------
  function criarPassosParaQuest(pomodorosTotal, feitos = 0) {
    const passos = [];
    for (let i = 0; i < pomodorosTotal; i++) {
      passos.push({
        titulo: `Pomodoro ${i + 1}`,
        feito: i < feitos
      });
    }
    return passos;
  }

  function criarMarcosIniciais() {
    return MARCOS_PADRAO.map((titulo) => ({
      id: gerarId("marco"),
      titulo,
      conquistado: false,
      data: null
    }));
  }

  function criarQuestsIniciais() {
    return [
      {
        id: "quest-1",
        titulo: "Escrever cena nova sem voltar pra editar",
        tamanho: "M",
        pomodorosTotal: 2,
        pomodorosFeitos: 0,
        xp: 25,
        versaoMenor: "Abrir o arquivo e escrever só 3 falas do diálogo",
        passos: criarPassosParaQuest(2, 0),
        concluida: false,
        encerradaSemCulpa: false
      },
      {
        id: "quest-2",
        titulo: "Destravar parágrafo teimoso",
        tamanho: "P",
        pomodorosTotal: 1,
        pomodorosFeitos: 0,
        xp: 10,
        versaoMenor: "Rascunhar em tópicos feios o que precisa acontecer",
        passos: criarPassosParaQuest(1, 0),
        concluida: false,
        encerradaSemCulpa: false
      },
      {
        id: "quest-3",
        titulo: "Maratona de capítulo",
        tamanho: "G",
        pomodorosTotal: 3,
        pomodorosFeitos: 0,
        xp: 50,
        versaoMenor: "Fechar pelo menos a abertura do capítulo",
        passos: criarPassosParaQuest(3, 0),
        concluida: false,
        encerradaSemCulpa: false
      }
    ];
  }

  function criarRegistroVazio() {
    return {
      palavrasEscritas: 0,
      saldoDia: 0,
      ultimaSomaHoje: 0,
      minutosRevisados: 0,
      pomodorosFeitos: 0,
      missoesFeitas: 0,
      xpDia: 0,
      metaMinimaBatida: false,
      metaDiariaBatida: false,
      metaMinimaRevisaoBatida: false,
      metaDiariaRevisaoBatida: false,
      ultimoMinutoRevisaoContado: null
    };
  }

  const ABAS_CENTRAL = [
    "mesa",
    "quests",
    "diario",
    "prazos",
    "estante",
    "trofeus",
    "personagens",
    "ajustes"
  ];

  const EDITORES_VALIDOS = ["word", "pages", "gdocs", "outro"];
  const SONS_AMBIENTE_VALIDOS = ["chuva", "lareira", "marrom", "branco"];
  const ROTULOS_EDITORES = {
    word: "Word",
    pages: "Pages",
    gdocs: "Google Docs",
    outro: "Outro"
  };

  function normalizarEditoresEscrita(lista) {
    if (!Array.isArray(lista)) return [];
    return EDITORES_VALIDOS.filter((id) => lista.includes(id));
  }

  function formatarEditoresEscrita(lista) {
    const norm = normalizarEditoresEscrita(lista);
    if (norm.length === 0) return "Não informado";
    return norm.map((id) => ROTULOS_EDITORES[id] || id).join(", ");
  }

  function limparTravessoesTexto(texto) {
    return String(texto || "")
      .replace(/\s*[\u2013\u2014]+\s*/g, ", ")
      .replace(/,\s*,+/g, ",")
      .trim();
  }

  function criarEstadoInicial() {
    const hoje = hojeISO();
    return {
      versao: 1,
      versaoVisual: 6,
      config: {
        metaDiariaPalavras: 1000,
        metaMinimaPalavras: 250,
        metaDiariaMinutosRevisao: 45,
        metaMinimaMinutosRevisao: 15,
        modoHoje: "escrita",
        abaAtiva: "mesa",
        livroAtivoId: "livro-1",
        questEmFocoId: "quest-1",
        somAtivo: true,
        volumeSom: 80,
        somAmbienteTipo: "chuva",
        volumeAmbiente: 45,
        recordesMinijogos: {
          cobrinha: 0,
          blocos: 0,
          fuga: 0
        },
        nomeMascote: "",
        npcAtivoId: "moreno-sarcastico",
        apelidosNpc: {},
        nomeAutora: "",
        preferenciaRomance: "todos",
        editoresEscrita: [],
        onboardingConcluido: false,
        questZeroConcluida: false,
        questZeroPulada: false,
        questZeroPasso: 0,
        pomoFocoMin: 25,
        pomoPausaMin: 5,
        frasesCarinhosas: [...FRASES_PADRAO]
      },
      xpTotal: 0,
      registrosDiarios: {
        [hoje]: criarRegistroVazio()
      },
      livros: [
        {
          id: "livro-1",
          nome: "Meu Romance Novo",
          cor: "#5C8D58",
          status: "Rascunho ✍️",
          descricao: "Clique em editar para anotar o clima da história (o arquivo prometeu não morder).",
          palavrasTotais: 0,
          palavrasInicioDia: 0,
          dataReferenciaInicioDia: hoje,
          arquivoContador: "",
          arquivosMarcados: [],
          palavrasChave: [],
          contagemPorDoc: {},
          marcos: criarMarcosIniciais()
        }
      ],
      quests: criarQuestsIniciais(),
      diario: [],
      medalhasGanhas: {},
      personagensDesbloqueados: [],
      desejos: [
        {
          id: "desejo-1",
          texto: "Um doce gostoso quando fechar o 1º ato",
          resgatado: false
        }
      ],
      prazos: []
    };
  }

  function carregarEstado() {
    try {
      const bruto = localStorage.getItem(STORAGE_KEY);
      if (!bruto) return criarEstadoInicial();
      const parsed = JSON.parse(bruto);
      return normalizarEstado(parsed);
    } catch (_) {
      return criarEstadoInicial();
    }
  }

  function getOrdemPersonagens(preferencia) {
    const mocinhos = PERSONAGENS_UNLOCK_POOL.filter((n) => n.genero === "mocinho");
    const mocinhas = PERSONAGENS_UNLOCK_POOL.filter((n) => n.genero === "mocinha");
    const nbs = PERSONAGENS_UNLOCK_POOL.filter((n) => n.genero === "naobinario");

    if (preferencia === "mocinhos") return [...mocinhos, ...mocinhas, ...nbs];
    if (preferencia === "mocinhas") return [...mocinhas, ...mocinhos, ...nbs];
    if (preferencia === "naobinarios") return [...nbs, ...mocinhas, ...mocinhos];

    const intercalado = [];
    const maxLen = Math.max(mocinhos.length, mocinhas.length, nbs.length);
    for (let i = 0; i < maxLen; i++) {
      if (mocinhos[i]) intercalado.push(mocinhos[i]);
      if (mocinhas[i]) intercalado.push(mocinhas[i]);
      if (nbs[i]) intercalado.push(nbs[i]);
    }
    return intercalado;
  }

  function normalizarEstado(obj) {
    const base = criarEstadoInicial();
    if (!obj || typeof obj !== "object") return base;

    const versaoAnterior = Number(obj.versaoVisual) || 1;
    const tinhaProgresso =
      (Number(obj.xpTotal) || 0) > 0 ||
      (Array.isArray(obj.livros) && obj.livros.some((l) => (Number(l.palavrasTotais) || 0) > 0)) ||
      (obj.medalhasGanhas && Object.keys(obj.medalhasGanhas).length > 0);

    const listaAntiga = Array.isArray(obj.personagensDesbloqueados) ? obj.personagensDesbloqueados : [];

    const merged = {
      versao: 1,
      versaoVisual: 6,
      config: { ...base.config, ...(obj.config || {}) },
      xpTotal: Number(obj.xpTotal) || 0,
      registrosDiarios: obj.registrosDiarios && typeof obj.registrosDiarios === "object" ? obj.registrosDiarios : {},
      livros: Array.isArray(obj.livros) && obj.livros.length > 0 ? obj.livros : base.livros,
      quests: Array.isArray(obj.quests) && obj.quests.length > 0 ? obj.quests : criarQuestsIniciais(),
      diario: Array.isArray(obj.diario) ? obj.diario : [],
      medalhasGanhas: obj.medalhasGanhas && typeof obj.medalhasGanhas === "object" ? obj.medalhasGanhas : {},
      personagensDesbloqueados: [...listaAntiga],
      desejos: Array.isArray(obj.desejos) ? obj.desejos : base.desejos,
      prazos: Array.isArray(obj.prazos) ? obj.prazos : []
    };

    if (!merged.config.apelidosNpc || typeof merged.config.apelidosNpc !== "object") {
      merged.config.apelidosNpc = {};
    }

    if (versaoAnterior < 3) {
      merged.config.frasesCarinhosas = [...FRASES_PADRAO];
      if (merged.livros[0] && merged.livros[0].cor === "#FF8FB8") {
        merged.livros[0].cor = "#5C8D58";
      }
    } else if (!Array.isArray(merged.config.frasesCarinhosas) || merged.config.frasesCarinhosas.length === 0) {
      merged.config.frasesCarinhosas = [...FRASES_PADRAO];
    }

    if (versaoAnterior < 4) {
      merged.config.frasesCarinhosas = merged.config.frasesCarinhosas.map((f) =>
        String(f).toLowerCase().includes("instagram")
          ? "Pausa de 5 min. Os personagens pediram água e o gato já deitou em cima do teclado."
          : f
      );
      if (tinhaProgresso && (!obj.config || typeof obj.config.onboardingConcluido !== "boolean")) {
        merged.config.onboardingConcluido = true;
      }
    }

    // Versão 5: personagens só por arquétipo (sem nome próprio padrão)
    if (versaoAnterior < 5) {
      merged.config.nomeMascote = "";
      merged.config.apelidosNpc = {};
      if (!ELENCO_NPCS.some((n) => n.id === merged.config.npcAtivoId)) {
        merged.config.npcAtivoId = "moreno-sarcastico";
      }
      merged.personagensDesbloqueados = [];
    }

    // Versão 6: dopamina em dobro (som ligado por padrão + volume ajustável)
    if (versaoAnterior < 6) {
      merged.config.somAtivo = true;
      if (typeof merged.config.volumeSom !== "number") {
        merged.config.volumeSom = 80;
      }
    }
    if (typeof merged.config.somAtivo !== "boolean") {
      merged.config.somAtivo = true;
    }
    const volNum = Number(merged.config.volumeSom);
    merged.config.volumeSom = Number.isFinite(volNum)
      ? Math.max(0, Math.min(100, Math.round(volNum)))
      : 80;

    if (!ABAS_CENTRAL.includes(merged.config.abaAtiva)) {
      merged.config.abaAtiva = "mesa";
    }
    merged.config.editoresEscrita = normalizarEditoresEscrita(merged.config.editoresEscrita);

    if (!SONS_AMBIENTE_VALIDOS.includes(merged.config.somAmbienteTipo)) {
      merged.config.somAmbienteTipo = "chuva";
    }
    const volAmbNum = Number(merged.config.volumeAmbiente);
    merged.config.volumeAmbiente = Number.isFinite(volAmbNum)
      ? Math.max(0, Math.min(100, Math.round(volAmbNum)))
      : 45;

    const recBruto =
      merged.config.recordesMinijogos && typeof merged.config.recordesMinijogos === "object"
        ? merged.config.recordesMinijogos
        : {};
    merged.config.recordesMinijogos = {
      cobrinha: Math.max(0, Math.floor(Number(recBruto.cobrinha) || 0)),
      blocos: Math.max(0, Math.floor(Number(recBruto.blocos) || 0)),
      fuga: Math.max(0, Math.floor(Number(recBruto.fuga) || 0))
    };

    merged.config.frasesCarinhosas = merged.config.frasesCarinhosas
      .map(limparTravessoesTexto)
      .filter(Boolean);
    if (merged.config.frasesCarinhosas.length === 0) {
      merged.config.frasesCarinhosas = [...FRASES_PADRAO];
    }

    if (!ELENCO_NPCS.some((n) => n.id === merged.config.npcAtivoId)) {
      merged.config.npcAtivoId = "moreno-sarcastico";
    }

    merged.personagensDesbloqueados = merged.personagensDesbloqueados.filter((id) =>
      PERSONAGENS_UNLOCK_POOL.some((n) => n.id === id)
    );

    // Garante personagens compatíveis caso save restaurado já tenha medalhas ganhas
    const qtdMedalhas = Object.keys(merged.medalhasGanhas).length;
    const ordem = getOrdemPersonagens(merged.config.preferenciaRomance);
    while (merged.personagensDesbloqueados.length < Math.min(qtdMedalhas, PERSONAGENS_UNLOCK_POOL.length)) {
      const proximo = ordem.find((n) => !merged.personagensDesbloqueados.includes(n.id));
      if (!proximo) break;
      merged.personagensDesbloqueados.push(proximo.id);
    }

    merged.livros.forEach((livro) => {
      if (!Array.isArray(livro.marcos) || livro.marcos.length === 0) {
        livro.marcos = criarMarcosIniciais();
      }
      if (!Array.isArray(livro.arquivosMarcados)) {
        livro.arquivosMarcados = [];
        if (typeof livro.arquivoContador === "string" && livro.arquivoContador.trim() && !livro.arquivoContador.startsWith("@app:")) {
          livro.arquivosMarcados.push(livro.arquivoContador.trim());
        }
      } else {
        livro.arquivosMarcados = livro.arquivosMarcados.map((x) => String(x || "").trim()).filter(Boolean);
      }
      if (!Array.isArray(livro.palavrasChave)) {
        livro.palavrasChave = [];
      } else {
        livro.palavrasChave = livro.palavrasChave.map((x) => String(x || "").trim()).filter(Boolean);
      }
      if (!livro.contagemPorDoc || typeof livro.contagemPorDoc !== "object") {
        livro.contagemPorDoc = {};
      }
    });

    merged.quests.forEach((q) => {
      const total = Math.max(1, Number(q.pomodorosTotal) || 1);
      const feitos = Math.max(0, Math.min(total, Number(q.pomodorosFeitos) || 0));
      q.pomodorosTotal = total;
      q.pomodorosFeitos = feitos;
      if (!Array.isArray(q.passos) || q.passos.length !== total) {
        q.passos = criarPassosParaQuest(total, feitos);
      }
      if (typeof q.versaoMenor !== "string") {
        q.versaoMenor = "";
      }
    });

    if (!merged.livros.some((l) => l.id === merged.config.livroAtivoId)) {
      merged.config.livroAtivoId = merged.livros[0].id;
    }

    if (!merged.quests.some((q) => q.id === merged.config.questEmFocoId)) {
      merged.config.questEmFocoId = merged.quests[0].id;
    }

    return merged;
  }

  let state = carregarEstado();

  function salvarEstado() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // Silencioso caso storage esteja bloqueado
    }
  }

  function garantirDiaAtualizado() {
    const hoje = hojeISO();
    let mudou = false;

    if (!state.registrosDiarios[hoje]) {
      state.registrosDiarios[hoje] = criarRegistroVazio();
      mudou = true;
    } else {
      if (typeof state.registrosDiarios[hoje].missoesFeitas !== "number") {
        state.registrosDiarios[hoje].missoesFeitas = 0;
        mudou = true;
      }
      if (typeof state.registrosDiarios[hoje].ultimaSomaHoje !== "number") {
        state.registrosDiarios[hoje].ultimaSomaHoje = 0;
        mudou = true;
      }
    }

    state.livros.forEach((livro) => {
      if (livro.dataReferenciaInicioDia !== hoje) {
        livro.palavrasInicioDia = Number(livro.palavrasTotais) || 0;
        livro.dataReferenciaInicioDia = hoje;
        mudou = true;
      }
    });

    if (mudou) salvarEstado();
    return state.registrosDiarios[hoje];
  }

  function getLivroAtivo() {
    return state.livros.find((l) => l.id === state.config.livroAtivoId) || state.livros[0];
  }

  function getQuestEmFoco() {
    return state.quests.find((q) => q.id === state.config.questEmFocoId) || state.quests[0];
  }

  function recalcularSaldoDia(reg) {
    reg.saldoDia = state.livros.reduce((acc, l) => {
      const total = Number(l.palavrasTotais) || 0;
      const inicio = Number(l.palavrasInicioDia) || 0;
      return acc + (total - inicio);
    }, 0);
  }

  // ---------- Som Sintetizado Local (Web Audio API: zero arquivos externos) ----------
  let audioCtxCompartilhado = null;

  function obterAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxCompartilhado) {
      audioCtxCompartilhado = new AudioCtx();
    }
    if (audioCtxCompartilhado.state === "suspended" && typeof audioCtxCompartilhado.resume === "function") {
      audioCtxCompartilhado.resume().catch(() => {});
    }
    return audioCtxCompartilhado;
  }

  function tocarNotaSintetizada(ctx, destino, freq, inicio, duracao, onda = "triangle", ganho = 0.25) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = onda;
    osc.frequency.setValueAtTime(freq, inicio);
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, ganho), inicio + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
    osc.connect(g);
    g.connect(destino);
    osc.start(inicio);
    osc.stop(inicio + duracao + 0.02);
  }

  function tocarSalvaDePalmas(ctx, destino, duracaoTotal = 1.6) {
    try {
      const sampleRate = ctx.sampleRate || 44100;
      const tamBuf = Math.floor(sampleRate * 0.12);
      const buffer = ctx.createBuffer(1, tamBuf, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < tamBuf; i++) {
        const env = Math.pow(1 - i / tamBuf, 2.2);
        data[i] = (Math.random() * 2 - 1) * env;
      }

      const qtdPalmas = Math.max(14, Math.round(duracaoTotal * 17));
      const baseTempo = ctx.currentTime + 0.06;
      for (let i = 0; i < qtdPalmas; i++) {
        const progresso = i / qtdPalmas;
        const atraso = progresso * duracaoTotal + (Math.random() - 0.5) * 0.05;
        const t0 = Math.max(ctx.currentTime + 0.02, baseTempo + atraso);

        const src = ctx.createBufferSource();
        src.buffer = buffer;

        const filtro = ctx.createBiquadFilter();
        filtro.type = "bandpass";
        filtro.frequency.value = 950 + Math.random() * 1050;
        filtro.Q.value = 1.4;

        const g = ctx.createGain();
        const pico = (0.14 + Math.random() * 0.1) * (1 - progresso * 0.35);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(pico, t0 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);

        src.connect(filtro);
        filtro.connect(g);
        g.connect(destino);
        src.start(t0);
        src.stop(t0 + 0.11);
      }
    } catch (_) {
      // Ignora se criação de ruído não estiver disponível
    }
  }

  function tocarSomFofo(tipo = "palavras") {
    if (!state.config.somAtivo) return;
    const volumePct = Number.isFinite(Number(state.config.volumeSom))
      ? Math.max(0, Math.min(100, Number(state.config.volumeSom)))
      : 80;
    if (volumePct <= 0) return;

    try {
      const ctx = obterAudioContext();
      if (!ctx) return;

      const master = ctx.createGain();
      master.gain.value = (volumePct / 100) * 0.38;
      master.connect(ctx.destination);

      const agora = ctx.currentTime + 0.01;

      if (tipo === "tomatinho") {
        tocarNotaSintetizada(ctx, master, 587.33, agora, 0.16, "triangle", 0.35);
        tocarNotaSintetizada(ctx, master, 739.99, agora + 0.06, 0.18, "triangle", 0.35);
        tocarNotaSintetizada(ctx, master, 880.0, agora + 0.12, 0.22, "triangle", 0.38);
        tocarNotaSintetizada(ctx, master, 1174.66, agora + 0.18, 0.32, "sine", 0.32);
        return;
      }

      if (tipo === "pomodoro") {
        const melodia = [523.25, 659.25, 783.99, 987.77, 1046.5];
        melodia.forEach((f, idx) => {
          tocarNotaSintetizada(ctx, master, f, agora + idx * 0.09, 0.34, "triangle", 0.32);
          tocarNotaSintetizada(ctx, master, f * 2, agora + idx * 0.09, 0.24, "sine", 0.12);
        });
        return;
      }

      if (tipo === "pausaFim") {
        [587.33, 783.99, 1046.5].forEach((f, idx) => {
          tocarNotaSintetizada(ctx, master, f, agora + idx * 0.09, 0.26, "sine", 0.28);
        });
        return;
      }

      if (tipo === "personagem") {
        const harpa = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1318.51, 1567.98];
        harpa.forEach((f, idx) => {
          tocarNotaSintetizada(ctx, master, f, agora + idx * 0.065, 0.38, "sine", 0.28);
        });
        tocarNotaSintetizada(ctx, master, 261.63, agora, 0.75, "triangle", 0.18);
        return;
      }

      if (tipo === "meta" || tipo === "festa") {
        const notas = [523.25, 659.25, 783.99, 1046.5, 1318.51];
        notas.forEach((f, idx) => {
          tocarNotaSintetizada(ctx, master, f, agora + idx * 0.08, 0.34, "triangle", 0.34);
        });
        tocarNotaSintetizada(ctx, master, 261.63, agora, 0.45, "sine", 0.22);
        tocarNotaSintetizada(ctx, master, 392.0, agora + 0.18, 0.45, "sine", 0.22);
        tocarNotaSintetizada(ctx, master, 523.25, agora + 0.34, 0.55, "sine", 0.24);
        return;
      }

      if (tipo === "medalha" || tipo === "palmas") {
        const notas = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
        notas.forEach((f, idx) => {
          tocarNotaSintetizada(ctx, master, f, agora + idx * 0.085, 0.36, "triangle", 0.35);
          tocarNotaSintetizada(ctx, master, f * 0.5, agora + idx * 0.085, 0.32, "sine", 0.16);
        });
        tocarSalvaDePalmas(ctx, master, 1.25);
        return;
      }

      if (tipo === "dragao") {
        const fanfarra = [
          { f: 392.0, t: 0.0, d: 0.12 },
          { f: 392.0, t: 0.13, d: 0.12 },
          { f: 392.0, t: 0.26, d: 0.12 },
          { f: 523.25, t: 0.40, d: 0.28 },
          { f: 659.25, t: 0.62, d: 0.22 },
          { f: 783.99, t: 0.80, d: 0.20 },
          { f: 659.25, t: 0.98, d: 0.16 },
          { f: 783.99, t: 1.12, d: 0.18 },
          { f: 1046.5, t: 1.28, d: 0.72 }
        ];
        fanfarra.forEach((n) => {
          tocarNotaSintetizada(ctx, master, n.f, agora + n.t, n.d, "triangle", 0.38);
          tocarNotaSintetizada(ctx, master, n.f * 1.5, agora + n.t, n.d * 0.9, "sine", 0.15);
        });
        // Baixo de suporte épico + brilhos de harpa no acorde final
        tocarNotaSintetizada(ctx, master, 130.81, agora + 0.40, 0.55, "triangle", 0.24);
        tocarNotaSintetizada(ctx, master, 196.0, agora + 0.80, 0.42, "triangle", 0.24);
        tocarNotaSintetizada(ctx, master, 261.63, agora + 1.28, 0.78, "triangle", 0.28);
        [1318.51, 1567.98, 2093.0].forEach((f, idx) => {
          tocarNotaSintetizada(ctx, master, f, agora + 1.32 + idx * 0.07, 0.45, "sine", 0.22);
        });
        tocarSalvaDePalmas(ctx, master, 1.85);
        return;
      }

      // Padrão ("palavras" / "suave"): brilho rápido e alegre
      const brilho = [659.25, 783.99, 987.77, 1318.51];
      brilho.forEach((f, idx) => {
        tocarNotaSintetizada(ctx, master, f, agora + idx * 0.055, 0.22, "triangle", 0.3);
        tocarNotaSintetizada(ctx, master, f * 2, agora + idx * 0.055, 0.16, "sine", 0.1);
      });
    } catch (_) {
      // Ignora caso áudio esteja indisponível
    }
  }

  // ---------- Player de Som Ambiente (Web Audio API: loop nativo em memória, CPU mínima) ----------
  const buffersAmbienteCache = {};
  let ambienteTocando = false;
  let ambienteSourceNode = null;
  let ambienteFilterNode = null;
  let ambienteGainNode = null;

  function suavizarEmendaLoop(data, fadeLen) {
    const len = data.length;
    if (fadeLen <= 0 || fadeLen * 2 >= len) return;
    const copiaInicio = data.slice(0, fadeLen);
    for (let i = 0; i < fadeLen; i++) {
      const pesoInicio = i / fadeLen;
      const pesoFim = 1 - pesoInicio;
      const tailIdx = len - fadeLen + i;
      data[i] = copiaInicio[i] * pesoInicio + data[tailIdx] * pesoFim;
    }
  }

  function obterBufferSomAmbiente(ctx, tipo) {
    const tipoSafe = SONS_AMBIENTE_VALIDOS.includes(tipo) ? tipo : "chuva";
    if (buffersAmbienteCache[tipoSafe]) return buffersAmbienteCache[tipoSafe];

    const sampleRate = ctx.sampleRate || 44100;
    const duracaoSeg = tipoSafe === "lareira" ? 10 : 8;
    const length = Math.floor(sampleRate * duracaoSeg);
    const fadeLen = Math.floor(sampleRate * 0.45);
    const buffer = ctx.createBuffer(1, length + fadeLen, sampleRate);
    const out = buffer.getChannelData(0);

    if (tipoSafe === "branco") {
      for (let i = 0; i < out.length; i++) {
        out[i] = (Math.random() * 2 - 1) * 0.16;
      }
    } else if (tipoSafe === "marrom") {
      let ultimo = 0;
      for (let i = 0; i < out.length; i++) {
        const branco = Math.random() * 2 - 1;
        ultimo = (ultimo + 0.025 * branco) / 1.025;
        out[i] = Math.max(-0.9, Math.min(0.9, ultimo * 1.6));
      }
    } else if (tipoSafe === "chuva") {
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < out.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + w * 0.029;
        b1 = 0.985 * b1 + w * 0.032;
        b2 = 0.95 * b2 + w * 0.048;
        const swell = 0.86 + 0.14 * Math.sin((2 * Math.PI * 0.28 * i) / sampleRate);
        out[i] = Math.max(-0.9, Math.min(0.9, (b0 + b1 + b2 + w * 0.035) * 0.65 * swell));
      }
    } else {
      // Lareira: brasa grave contínua + estalinhos espaçados pré-gerados no buffer
      let ultimo = 0;
      for (let i = 0; i < out.length; i++) {
        const w = Math.random() * 2 - 1;
        ultimo = (ultimo + 0.028 * w) / 1.028;
        out[i] = ultimo * 1.15;
      }
      const totalEstalos = 30;
      const inicioSeguro = fadeLen + Math.floor(sampleRate * 0.15);
      const fimSeguro = length - Math.floor(sampleRate * 0.25);
      for (let p = 0; p < totalEstalos; p++) {
        const pos = inicioSeguro + Math.floor(Math.random() * Math.max(100, fimSeguro - inicioSeguro));
        const durEstalo = Math.floor(sampleRate * (0.005 + Math.random() * 0.015));
        const ampEstalo = 0.28 + Math.random() * 0.42;
        const decay = 4 + Math.random() * 4;
        for (let k = 0; k < durEstalo && pos + k < length; k++) {
          const env = Math.exp((-decay * k) / durEstalo);
          out[pos + k] += (Math.random() * 2 - 1) * ampEstalo * env;
        }
      }
    }

    // Cria buffer exato sem cliques na emenda de loop
    suavizarEmendaLoop(out, fadeLen);
    const loopBuffer = ctx.createBuffer(1, length, sampleRate);
    loopBuffer.getChannelData(0).set(out.subarray(0, length));
    buffersAmbienteCache[tipoSafe] = loopBuffer;
    return loopBuffer;
  }

  function calcularGanhoAmbiente(volumePct, tipo) {
    const v = Math.max(0, Math.min(100, Number(volumePct) || 0)) / 100;
    const escala = tipo === "branco" ? 0.42 : tipo === "marrom" ? 0.68 : tipo === "lareira" ? 0.65 : 0.58;
    return v * escala;
  }

  function desconectarNosAmbiente() {
    if (ambienteSourceNode) {
      try {
        ambienteSourceNode.stop();
      } catch (_) {}
      try {
        ambienteSourceNode.disconnect();
      } catch (_) {}
      ambienteSourceNode = null;
    }
    if (ambienteFilterNode) {
      try {
        ambienteFilterNode.disconnect();
      } catch (_) {}
      ambienteFilterNode = null;
    }
    if (ambienteGainNode) {
      try {
        ambienteGainNode.disconnect();
      } catch (_) {}
      ambienteGainNode = null;
    }
  }

  function renderControlesSomAmbiente() {
    const tipo = SONS_AMBIENTE_VALIDOS.includes(state.config.somAmbienteTipo)
      ? state.config.somAmbienteTipo
      : "chuva";
    const vol = Math.max(0, Math.min(100, Number(state.config.volumeAmbiente) ?? 45));

    const selectEl = document.getElementById("select-som-ambiente");
    if (selectEl) selectEl.value = tipo;

    const sliderEl = document.getElementById("input-volume-ambiente");
    if (sliderEl) sliderEl.value = String(vol);

    const labelEl = document.getElementById("label-volume-ambiente");
    if (labelEl) labelEl.textContent = `${vol}%`;

    const btnMesa = document.getElementById("btn-ambiente-toggle");
    if (btnMesa) {
      btnMesa.setAttribute("aria-pressed", String(ambienteTocando));
      btnMesa.classList.toggle("is-playing", ambienteTocando);
      btnMesa.textContent = ambienteTocando ? "⏹ Parar" : "▶ Tocar";
    }

    const btnMini = document.getElementById("mini-ambiente-toggle");
    if (btnMini) {
      btnMini.setAttribute("aria-pressed", String(ambienteTocando));
      btnMini.classList.toggle("is-playing", ambienteTocando);
      btnMini.textContent = ambienteTocando ? "⏹" : "🎧";
      btnMini.title = ambienteTocando ? "Parar som ambiente" : "Tocar som ambiente";
    }
  }

  function pararSomAmbiente() {
    desconectarNosAmbiente();
    ambienteTocando = false;
    renderControlesSomAmbiente();
  }

  function iniciarSomAmbiente() {
    desconectarNosAmbiente();
    const tipo = SONS_AMBIENTE_VALIDOS.includes(state.config.somAmbienteTipo)
      ? state.config.somAmbienteTipo
      : "chuva";
    try {
      const ctx = obterAudioContext();
      if (!ctx) {
        ambienteTocando = false;
        renderControlesSomAmbiente();
        return;
      }

      const source = ctx.createBufferSource();
      source.buffer = obterBufferSomAmbiente(ctx, tipo);
      source.loop = true;

      const filtro = ctx.createBiquadFilter();
      filtro.type = "lowpass";
      filtro.frequency.value =
        tipo === "marrom" ? 580 : tipo === "chuva" ? 1650 : tipo === "lareira" ? 2400 : 4800;

      const gain = ctx.createGain();
      const alvoGanho = calcularGanhoAmbiente(state.config.volumeAmbiente, tipo);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(Math.max(0.0001, alvoGanho), ctx.currentTime + 0.08);

      source.connect(filtro);
      filtro.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      ambienteSourceNode = source;
      ambienteFilterNode = filtro;
      ambienteGainNode = gain;
      ambienteTocando = true;
    } catch (_) {
      desconectarNosAmbiente();
      ambienteTocando = false;
    }
    renderControlesSomAmbiente();
  }

  function alternarSomAmbiente() {
    if (ambienteTocando) {
      pararSomAmbiente();
    } else {
      iniciarSomAmbiente();
    }
  }

  function trocarTipoSomAmbiente(novoTipo) {
    if (!SONS_AMBIENTE_VALIDOS.includes(novoTipo)) return;
    state.config.somAmbienteTipo = novoTipo;
    salvarEstado();
    if (ambienteTocando) {
      iniciarSomAmbiente();
    } else {
      renderControlesSomAmbiente();
    }
  }

  function atualizarVolumeSomAmbiente(novoVolInput) {
    const vol = Math.max(0, Math.min(100, Math.round(Number(novoVolInput) || 0)));
    state.config.volumeAmbiente = vol;
    salvarEstado();
    if (ambienteTocando && ambienteGainNode) {
      const ctx = obterAudioContext();
      const tipo = state.config.somAmbienteTipo || "chuva";
      const gainVal = calcularGanhoAmbiente(vol, tipo);
      if (ctx) {
        ambienteGainNode.gain.setTargetAtTime(gainVal, ctx.currentTime, 0.03);
      } else {
        ambienteGainNode.gain.value = gainVal;
      }
    }
    renderControlesSomAmbiente();
  }

  // ---------- Confete & Glitter em Canvas ----------
  const confettiCanvas = document.getElementById("confetti-canvas");
  const confettiCtx = confettiCanvas.getContext("2d");
  let particulasConfete = [];
  let animConfeteId = null;

  function redimensionarCanvasConfete() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", redimensionarCanvasConfete);
  redimensionarCanvasConfete();

  function soltarConfete(quantidade = 95, opcoes = {}) {
    const coresConfete = ["#F2C968", "#6EA969", "#D97F98", "#C86446", "#87B8D4", "#FFF4D4"];
    const coresGlitter = ["#FFF9D6", "#F2C968", "#FFD4E5", "#C7F4C2", "#FFFFFF"];
    const qtdGlitter =
      typeof opcoes.glitter === "number" ? opcoes.glitter : Math.round(quantidade * 0.48);

    for (let i = 0; i < quantidade; i++) {
      particulasConfete.push({
        tipo: "fita",
        x: Math.random() * confettiCanvas.width,
        y: -20 - Math.random() * 140,
        vx: (Math.random() - 0.5) * 4.8,
        vy: 2.5 + Math.random() * 4.4,
        size: 7 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.22,
        cor: coresConfete[Math.floor(Math.random() * coresConfete.length)]
      });
    }

    for (let j = 0; j < qtdGlitter; j++) {
      particulasConfete.push({
        tipo: "glitter",
        x: Math.random() * confettiCanvas.width,
        y: opcoes.espalhado ? Math.random() * (confettiCanvas.height * 0.72) : -10 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 2.4,
        vy: 1.4 + Math.random() * 2.9,
        size: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.14,
        fase: Math.random() * Math.PI * 2,
        cor: coresGlitter[Math.floor(Math.random() * coresGlitter.length)]
      });
    }

    if (particulasConfete.length > 560) {
      particulasConfete = particulasConfete.slice(particulasConfete.length - 560);
    }

    if (!animConfeteId) animarConfete();
  }

  function soltarBrilhoPequeno(qtdGlitter = 24) {
    soltarConfete(0, { glitter: qtdGlitter, espalhado: true });
  }

  function animarSubidaDiscretaNumero() {
    ["num-palavras-hoje", "num-minutos-revisao", "mini-palavras-hoje"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove("is-bump");
      void el.offsetWidth;
      el.classList.add("is-bump");
    });
  }

  function soltarChuvaDragao() {
    soltarConfete(150, { glitter: 95, espalhado: true });
    setTimeout(() => soltarConfete(120, { glitter: 85 }), 360);
    setTimeout(() => soltarConfete(110, { glitter: 80 }), 740);
  }

  function animarConfete() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    particulasConfete = particulasConfete.filter((p) => p.y < confettiCanvas.height + 30);
    const agoraMs = performance.now() * 0.008;

    particulasConfete.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rot);

      if (p.tipo === "glitter") {
        const brilho = 0.45 + 0.55 * Math.abs(Math.sin(agoraMs + p.fase));
        confettiCtx.globalAlpha = brilho;
        confettiCtx.fillStyle = p.cor;
        const r = p.size;
        confettiCtx.fillRect(-r, -1.2, r * 2, 2.4);
        confettiCtx.fillRect(-1.2, -r, 2.4, r * 2);
      } else {
        confettiCtx.fillStyle = p.cor;
        confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75);
      }

      confettiCtx.restore();
    });

    if (particulasConfete.length > 0) {
      animConfeteId = requestAnimationFrame(animarConfete);
    } else {
      animConfeteId = null;
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // ---------- Pop-up de Comemoração + Cartinha PNG ----------
  const modalConquista = document.getElementById("modal-conquista");
  const autoCloseFill = document.getElementById("auto-close-fill");
  let ultimaConquista = null;
  let autoCloseInterval = null;
  let autoClosePausado = false;
  let autoCloseRestanteMs = 7000;
  let totalCelebracoesAbertas = 0;

  function sortearFrase() {
    const lista = state.config.frasesCarinhosas;
    return lista[Math.floor(Math.random() * lista.length)] || FRASES_PADRAO[0];
  }

  let ultimoPersonagemDesbloqueadoId = null;

  function sortearFalaNpc(npc, chave, fallbackChave = "normal") {
    const falasNpc = (npc && npc.falas) || FALAS_MASCOTE;
    const lista =
      Array.isArray(falasNpc[chave]) && falasNpc[chave].length > 0
        ? falasNpc[chave]
        : Array.isArray(falasNpc[fallbackChave]) && falasNpc[fallbackChave].length > 0
          ? falasNpc[fallbackChave]
          : FALAS_MASCOTE[fallbackChave] || FALAS_MASCOTE.normal;
    return lista[Math.floor(Math.random() * lista.length)];
  }

  function mostrarCartinhaConquista(cartinha, medalhaNome, novoPersonagem) {
    const waxBanner = document.getElementById("wax-seal-banner");
    waxBanner.hidden = !cartinha;
    if (cartinha && medalhaNome) {
      waxBanner.innerHTML = `<span class="wax-seal-icon">💌</span><span>Cartinha Lacrada • ${medalhaNome}</span>`;
    } else {
      waxBanner.innerHTML = `<span class="wax-seal-icon">💌</span><span>Cartinha Lacrada da Guilda</span>`;
    }

    const boxPers = document.getElementById("conquista-novo-personagem");
    if (novoPersonagem) {
      ultimoPersonagemDesbloqueadoId = novoPersonagem.id;
      document.getElementById("novo-personagem-svg").innerHTML = gerarSvgNpc(novoPersonagem.id, "festa");
      document.getElementById("novo-personagem-nome").textContent = getNpcRotulo(novoPersonagem);
      const temDesb =
        novoPersonagem.falas &&
        Array.isArray(novoPersonagem.falas.desbloqueio) &&
        novoPersonagem.falas.desbloqueio.length > 0;
      document.getElementById("novo-personagem-arq").textContent = temDesb
        ? `${novoPersonagem.descricao} "${sortearFalaNpc(novoPersonagem, "desbloqueio", "festa")}"`
        : novoPersonagem.descricao;
      boxPers.hidden = false;
    } else {
      ultimoPersonagemDesbloqueadoId = null;
      boxPers.hidden = true;
    }
  }

  function atualizarCaixaNpcConquista(falaPersonalizada, usarFalaDragao = false, tipoFalaNpc = null) {
    const npc = getNpcById(state.config.npcAtivoId);
    const box = document.getElementById("conquista-npc-box");
    document.getElementById("conquista-npc-svg").innerHTML = gerarSvgNpc(npc.id, "festa");
    document.getElementById("conquista-npc-nome").textContent = getNpcRotulo(npc);
    const chave = usarFalaDragao ? "questDragao" : tipoFalaNpc === "metaMinima" ? "metaMinima" : "festa";
    const falaFinal = falaPersonalizada || sortearFalaNpc(npc, chave, usarFalaDragao ? "questDragao" : "festa");
    document.getElementById("conquista-npc-fala").textContent = falaFinal;
    box.hidden = false;
    return falaFinal;
  }

  function comemorar({
    emoji,
    titulo,
    xp,
    grande = false,
    palmas = false,
    festaDragao = false,
    tipoSom = null,
    fraseForcada = null,
    cartinha = false,
    medalhaNome = null,
    novoPersonagem = null,
    tipoFalaNpc = null
  }) {
    totalCelebracoesAbertas += 1;
    const reg = garantirDiaAtualizado();
    state.xpTotal += xp;
    reg.xpDia += xp;
    salvarEstado();

    const frase = fraseForcada || sortearFrase();
    ultimaConquista = {
      emoji,
      titulo,
      xp,
      frase,
      livro: getLivroAtivo().nome,
      data: formatarDataBR(hojeISO())
    };

    clearTimeout(dragonMesaTimer);
    const dragonBanner = document.getElementById("dragon-slayer-banner");
    if (dragonBanner) dragonBanner.hidden = !festaDragao;
    const conquistaWin = modalConquista.querySelector(".conquista-window");
    if (conquistaWin) conquistaWin.classList.toggle("is-dragon-festa", Boolean(festaDragao));
    mascoteBox.classList.toggle("is-dragon-festa", Boolean(festaDragao));

    document.getElementById("conquista-emoji").textContent = emoji;
    document.getElementById("conquista-palmas").hidden = !palmas && !festaDragao;
    document.getElementById("conquista-titulo").textContent = titulo;
    document.getElementById("conquista-xp").textContent = `+${xp} XP`;
    document.getElementById("conquista-frase").textContent = frase;

    mostrarCartinhaConquista(cartinha, medalhaNome, novoPersonagem);
    const falaMesa = atualizarCaixaNpcConquista(null, festaDragao, tipoFalaNpc);

    modalConquista.hidden = false;
    if (festaDragao) {
      soltarChuvaDragao();
    } else {
      soltarConfete(palmas ? 180 : grande ? 130 : 80, {
        glitter: palmas ? 100 : grande ? 70 : 45,
        espalhado: true
      });
    }

    const somEscolhido = tipoSom || (festaDragao ? "dragao" : palmas ? "medalha" : grande ? "meta" : "pomodoro");
    tocarSomFofo(somEscolhido);
    if (novoPersonagem) {
      setTimeout(() => tocarSomFofo("personagem"), festaDragao ? 1200 : 700);
    }
    setMascoteEstado("festa", festaDragao ? falaMesa : undefined);

    iniciarAutoFechamentoConquista();
    atualizarTopbar();
    renderPlacarGuilda();
  }

  document.getElementById("btn-chamar-novo-personagem").addEventListener("click", () => {
    if (!ultimoPersonagemDesbloqueadoId) return;
    state.config.npcAtivoId = ultimoPersonagemDesbloqueadoId;
    salvarEstado();
    fecharModalConquista();
    atualizarTopbar();
    renderPersonagens();
    renderSelectorNpc();
    soltarConfete(45, { glitter: 40, espalhado: true });
    tocarSomFofo("personagem");
    clearTimeout(dragonMesaTimer);
    mascoteBox.classList.remove("is-dragon-festa");
    const npcNovo = getNpcById(state.config.npcAtivoId);
    setMascoteEstado("festa", sortearFalaNpc(npcNovo, "desbloqueio", "festa"));
  });

  function iniciarAutoFechamentoConquista() {
    clearInterval(autoCloseInterval);
    autoCloseRestanteMs = 7000;
    autoClosePausado = false;
    autoCloseFill.style.width = "100%";

    autoCloseInterval = setInterval(() => {
      if (autoClosePausado) return;
      autoCloseRestanteMs -= 100;
      autoCloseFill.style.width = `${Math.max(0, (autoCloseRestanteMs / 7000) * 100)}%`;
      if (autoCloseRestanteMs <= 0) {
        fecharModalConquista();
      }
    }, 100);
  }

  let dragonMesaTimer = null;

  function fecharModalConquista() {
    clearInterval(autoCloseInterval);
    modalConquista.hidden = true;
    const conquistaWin = modalConquista.querySelector(".conquista-window");
    if (conquistaWin) conquistaWin.classList.remove("is-dragon-festa");
    if (mascoteBox.classList.contains("is-dragon-festa")) {
      clearTimeout(dragonMesaTimer);
      dragonMesaTimer = setTimeout(() => {
        mascoteBox.classList.remove("is-dragon-festa");
        atualizarEstadoMascotePeloPomodoro();
      }, 6000);
    } else {
      atualizarEstadoMascotePeloPomodoro();
    }
  }

  modalConquista.addEventListener("mouseenter", () => {
    autoClosePausado = true;
  });
  modalConquista.addEventListener("mouseleave", () => {
    autoClosePausado = false;
  });
  document.getElementById("btn-fechar-conquista").addEventListener("click", fecharModalConquista);
  document.getElementById("btn-fechar-conquista-x").addEventListener("click", fecharModalConquista);

  document.getElementById("btn-salvar-cartinha").addEventListener("click", () => {
    if (!ultimaConquista) return;
    autoClosePausado = true;
    baixarCartinhaPNG(ultimaConquista);
  });

  function baixarCartinhaPNG(info) {
    const c = document.createElement("canvas");
    c.width = 900;
    c.height = 560;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#2B3D30";
    ctx.fillRect(0, 0, 900, 560);

    ctx.fillStyle = "#F6ECD6";
    ctx.strokeStyle = "#5C3820";
    ctx.lineWidth = 10;
    roundRect(ctx, 44, 44, 812, 472, 16, true, true);

    ctx.fillStyle = "#5B3820";
    roundRect(ctx, 44, 44, 812, 68, 12, true, false);
    ctx.fillStyle = "#D9A441";
    ctx.fillRect(44, 108, 812, 5);

    ctx.fillStyle = "#FFF4D4";
    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.fillText("⚔ CENTRAL DE LIVRINHOS: CONQUISTA DE GUILDA", 72, 86);

    ctx.textAlign = "center";
    ctx.font = "66px sans-serif";
    ctx.fillText(info.emoji, 450, 198);

    ctx.fillStyle = "#365F34";
    ctx.font = "bold 30px 'Courier New', monospace";
    ctx.fillText(info.titulo, 450, 252);

    ctx.fillStyle = "#6B4512";
    ctx.font = "bold 22px 'Courier New', monospace";
    ctx.fillText(`+${info.xp} XP  •  ${info.livro}`, 450, 294);

    ctx.fillStyle = "#FBF3DF";
    ctx.strokeStyle = "#966642";
    ctx.lineWidth = 3;
    roundRect(ctx, 100, 325, 700, 118, 10, true, true);

    ctx.fillStyle = "#3A2416";
    ctx.font = "21px 'Trebuchet MS', sans-serif";
    desenharTextoQuebrado(ctx, info.frase, 450, 372, 640, 30);

    ctx.fillStyle = "#6C4C37";
    ctx.font = "bold 17px 'Courier New', monospace";
    ctx.fillText(`Registrado no pergaminho em ${info.data}`, 450, 488);

    const link = document.createElement("a");
    link.download = `conquista-central-de-livrinhos-${hojeISO()}.png`;
    link.href = c.toDataURL("image/png");
    link.click();
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function desenharTextoQuebrado(ctx, texto, x, y, maxWidth, lineHeight) {
    const palavras = texto.split(" ");
    let linha = "";
    let cy = y;
    for (let i = 0; i < palavras.length; i++) {
      const teste = linha + palavras[i] + " ";
      if (ctx.measureText(teste).width > maxWidth && i > 0) {
        ctx.fillText(linha.trim(), x, cy);
        linha = palavras[i] + " ";
        cy += lineHeight;
      } else {
        linha = teste;
      }
    }
    ctx.fillText(linha.trim(), x, cy);
  }

  // ---------- Elenco de NPCs em Pixel Art Original (grade 18x18) ----------
  const mascoteBox = document.getElementById("mascote-box");
  const mascoteSvg = document.getElementById("mascote-svg");
  const mascoteFala = document.getElementById("mascote-fala");
  let mascoteEstado = "normal";

  function getNpcById(npcId) {
    return ELENCO_NPCS.find((n) => n.id === npcId) || ELENCO_NPCS[0];
  }

  function getNpcCustomName(npc) {
    if (!npc) return "";
    const apelido = state.config.apelidosNpc && state.config.apelidosNpc[npc.id];
    if (apelido) return String(apelido).trim();
    if (npc.id === "gatinha-fiscal" && state.config.nomeMascote) {
      return String(state.config.nomeMascote).trim();
    }
    return "";
  }

  function getNpcRotulo(npc) {
    if (!npc) return "O Moreno Sarcástico";
    const nome = getNpcCustomName(npc);
    return nome ? `${nome} • ${npc.arquetipo}` : npc.arquetipo;
  }

  function isNpcDesbloqueado(npcId) {
    const npc = getNpcById(npcId);
    if (npc.desbloqueadoInicio) return true;
    return state.personagensDesbloqueados.includes(npcId);
  }

  function gerarSvgGatinha(estado) {
    const px = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;

    const OLHOS =
      estado === "pausa"
        ? px(5, 7, 2, 1, "#3A2416") + px(11, 7, 2, 1, "#3A2416")
        : estado === "festa"
        ? px(5, 6, 2, 1, "#3A2416") + px(11, 6, 2, 1, "#3A2416")
        : px(5, 6, 2, 2, "#3A2416") + px(11, 6, 2, 2, "#3A2416") + px(5, 6, 1, 1, "#FFF8E7") + px(11, 6, 1, 1, "#FFF8E7");

    const PROP =
      estado === "foco"
        ? px(13, 12, 4, 4, "#FFF8E7") +
          px(13, 12, 4, 1, "#8A5C3A") +
          px(14, 14, 2, 1, "#6C4C37") +
          px(15, 10, 1, 3, "#5C8D58")
        : estado === "pausa"
        ? px(13, 13, 4, 3, "#5B8BA8") +
          px(16, 14, 2, 1, "#5B8BA8") +
          px(14, 10, 1, 2, "#D6C5A3") +
          px(16, 11, 1, 1, "#D6C5A3")
        : estado === "festa"
        ? px(1, 2, 1, 1, "#F2C968") +
          px(2, 1, 1, 3, "#F2C968") +
          px(1, 2, 3, 1, "#F2C968") +
          px(15, 2, 1, 3, "#F2C968") +
          px(14, 3, 3, 1, "#F2C968")
        : px(15, 14, 2, 2, "#5C8D58") + px(14, 15, 1, 1, "#8FC788");

    return `
      <svg viewBox="0 0 18 18" width="100%" height="100%" shape-rendering="crispEdges" aria-hidden="true">
        ${px(3, 2, 2, 2, "#5C3820")}
        ${px(13, 2, 2, 2, "#5C3820")}
        ${px(4, 3, 1, 1, "#D97F98")}
        ${px(13, 3, 1, 1, "#D97F98")}
        ${px(3, 4, 12, 6, "#E8A65D")}
        ${px(4, 3, 2, 2, "#E8A65D")}
        ${px(12, 3, 2, 2, "#E8A65D")}
        ${px(4, 7, 10, 3, "#FCE8C8")}
        ${px(8, 4, 2, 2, "#B96C2E")}
        ${px(3, 6, 1, 1, "#B96C2E")}
        ${px(14, 6, 1, 1, "#B96C2E")}
        ${px(4, 8, 1, 1, "#E59BB0")}
        ${px(13, 8, 1, 1, "#E59BB0")}
        ${px(8, 8, 2, 1, "#C86446")}
        ${OLHOS}
        ${px(5, 10, 8, 1, "#D97F98")}
        ${px(8, 11, 2, 1, "#F2C968")}
        ${px(5, 11, 8, 5, "#FCE8C8")}
        ${px(5, 11, 2, 3, "#E8A65D")}
        ${px(11, 11, 2, 3, "#E8A65D")}
        ${px(6, 15, 2, 2, "#FFF8E7")}
        ${px(10, 15, 2, 2, "#FFF8E7")}
        ${px(2, 12, 3, 2, "#E8A65D")}
        ${px(1, 10, 2, 2, "#B96C2E")}
        ${PROP}
      </svg>
    `;
  }

  function gerarSvgNpc(npcId, estado = "normal") {
    if (npcId === "gatinha-fiscal") return gerarSvgGatinha(estado);

    const npc = getNpcById(npcId);
    const est = npc.estilo || ELENCO_NPCS[0].estilo;
    const px = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;

    let cabeloBg = px(4, 2, 10, 3, est.corCabelo) + px(3, 4, 2, 6, est.corCabelo) + px(13, 4, 2, 6, est.corCabelo);
    let cabeloFrente = px(5, 3, 3, 2, est.corCabelo) + px(10, 3, 3, 1, est.corCabelo);

    if (est.cabelo === "baguncado") {
      cabeloBg += px(3, 2, 2, 2, est.corCabelo) + px(7, 1, 4, 2, est.corCabelo) + px(13, 2, 2, 2, est.corCabelo);
      cabeloFrente += px(8, 4, 2, 2, est.corCabelo) + px(4, 5, 1, 2, est.corCabelo);
    } else if (est.cabelo === "longo") {
      cabeloBg += px(3, 5, 2, 9, est.corCabelo) + px(13, 5, 2, 9, est.corCabelo);
      cabeloFrente = px(5, 3, 8, 2, est.corCabelo) + px(4, 4, 2, 3, est.corCabelo);
    } else if (est.cabelo === "medio") {
      cabeloBg += px(3, 4, 2, 8, est.corCabelo) + px(13, 4, 2, 8, est.corCabelo);
    } else if (est.cabelo === "bardo") {
      cabeloBg = px(3, 2, 12, 3, est.corRoupa) + px(2, 3, 3, 1, est.corDetalhe) + px(4, 4, 10, 2, est.corCabelo) + px(3, 5, 2, 6, est.corCabelo) + px(13, 5, 2, 6, est.corCabelo);
      cabeloFrente = px(6, 4, 6, 1, est.corCabelo);
    } else if (est.cabelo === "elfo") {
      cabeloBg += px(3, 5, 2, 9, est.corCabelo) + px(13, 5, 2, 9, est.corCabelo) + px(2, 6, 2, 1, est.corPele) + px(14, 6, 2, 1, est.corPele);
      cabeloFrente += px(6, 2, 6, 1, est.corDetalhe);
    } else if (est.cabelo === "tranca") {
      cabeloBg += px(2, 6, 2, 8, est.corCabelo) + px(14, 6, 2, 8, est.corCabelo) + px(2, 13, 2, 1, est.corDetalhe);
    } else if (est.cabelo === "arrumado") {
      cabeloBg = px(5, 2, 8, 3, est.corCabelo) + px(4, 4, 1, 4, est.corCabelo) + px(13, 4, 1, 4, est.corCabelo);
      cabeloFrente = px(6, 3, 6, 1, est.corCabelo);
    }

    const olhos =
      estado === "pausa"
        ? px(6, 7, 2, 1, "#2B1B12") + px(10, 7, 2, 1, "#2B1B12")
        : estado === "festa"
        ? px(6, 6, 2, 1, "#2B1B12") + px(10, 6, 2, 1, "#2B1B12") + px(6, 7, 1, 1, est.corOlho) + px(11, 7, 1, 1, est.corOlho)
        : px(6, 6, 2, 2, est.corOlho) + px(10, 6, 2, 2, est.corOlho) + px(6, 6, 1, 1, "#FFFDF5") + px(10, 6, 1, 1, "#FFFDF5");

    const boca =
      estado === "festa"
        ? px(8, 9, 2, 1, "#B8534E")
        : px(8, 9, 2, 1, "#9E5E4F");

    let propSvg = "";
    if (estado === "festa") {
      propSvg =
        px(1, 2, 1, 3, "#F2C968") +
        px(0, 3, 3, 1, "#F2C968") +
        px(15, 2, 1, 3, "#D97F98") +
        px(14, 3, 3, 1, "#D97F98");
    } else if (est.prop === "cafe") {
      propSvg = px(13, 12, 3, 3, "#FFF6E5") + px(16, 13, 1, 1, "#FFF6E5") + px(14, 10, 1, 1, "#C9B79C");
    } else if (est.prop === "girassol") {
      propSvg = px(14, 11, 2, 2, "#F2C968") + px(14, 13, 1, 3, "#4D8049");
    } else if (est.prop === "pincel") {
      propSvg = px(14, 10, 1, 5, "#8A5C3A") + px(14, 9, 2, 2, "#D97F98");
    } else if (est.prop === "alaude") {
      propSvg = px(13, 11, 3, 4, "#B87A44") + px(14, 9, 1, 2, "#6C4C37");
    } else if (est.prop === "pena") {
      propSvg = px(14, 10, 2, 3, "#F6ECD6") + px(13, 13, 2, 2, "#D9A441");
    } else if (est.prop === "taca") {
      propSvg = px(14, 11, 2, 2, "#9F3350") + px(14, 13, 1, 3, "#D9A441");
    } else if (est.prop === "pocao") {
      propSvg = px(13, 12, 3, 3, "#6AB59E") + px(14, 10, 1, 2, "#D6C5A3");
    } else if (est.prop === "brilho") {
      propSvg = px(14, 10, 2, 2, "#F4D06F") + px(13, 11, 4, 1, "#FFF8E7");
    } else if (est.prop === "orbe") {
      propSvg = px(13, 10, 3, 3, "#9A62B8") + px(14, 11, 1, 1, "#FFFDF5");
    } else if (est.prop === "escudo") {
      propSvg = px(13, 11, 4, 4, "#8A9AA6") + px(14, 12, 2, 2, "#D9A441");
    } else if (est.prop === "bolo") {
      propSvg = px(13, 13, 4, 2, "#E8A65D") + px(13, 12, 4, 1, "#FFF8E7") + px(14, 11, 2, 1, "#E64539");
    } else if (est.prop === "planilha") {
      propSvg =
        px(13, 10, 4, 5, "#FFFDF5") +
        px(13, 10, 4, 1, "#4CAF50") +
        px(14, 12, 2, 1, "#3A5A78") +
        px(14, 14, 2, 1, "#3A5A78");
    } else if (est.prop === "copoCoracao") {
      propSvg = px(13, 11, 3, 4, "#FFF6E5") + px(13, 10, 3, 1, "#8A5C3A") + px(14, 12, 1, 1, "#D95B78");
    } else if (est.prop === "prancheta") {
      propSvg = px(13, 10, 4, 5, "#B87A44") + px(14, 11, 2, 3, "#FFFDF5") + px(14, 9, 2, 1, "#8A9AA6");
    } else if (est.prop === "chaveCarro") {
      propSvg = px(14, 11, 2, 2, "#353D47") + px(14, 13, 1, 2, "#D9A441") + px(15, 14, 1, 1, "#D9A441");
    } else if (est.prop === "pipoca") {
      propSvg = px(13, 12, 3, 3, "#E64539") + px(14, 12, 1, 3, "#FFFDF5") + px(13, 10, 3, 2, "#F4D06F");
    } else if (est.prop === "buque") {
      propSvg = px(13, 10, 2, 2, "#D97F98") + px(15, 10, 2, 2, "#F4D06F") + px(14, 12, 2, 3, "#4D8049");
    } else {
      propSvg = px(13, 12, 4, 3, "#FFF8E7") + px(13, 12, 4, 1, "#8A5C3A");
    }

    const sardas = npc.id === "ruiva-caotica" ? px(5, 8, 1, 1, "#C86446") + px(12, 8, 1, 1, "#C86446") : "";
    const oculos =
      npc.id === "amiga-ranzinza" || npc.id === "rival-escritorio"
        ? px(5, 6, 3, 2, "none") + px(5, 6, 3, 1, "#3A2416") + px(10, 6, 3, 1, "#3A2416") + px(8, 6, 2, 1, "#3A2416")
        : "";

    return `
      <svg viewBox="0 0 18 18" width="100%" height="100%" shape-rendering="crispEdges" aria-hidden="true">
        ${cabeloBg}
        ${px(5, 4, 8, 6, est.corPele)}
        ${cabeloFrente}
        ${olhos}
        ${oculos}
        ${px(5, 8, 1, 1, "#E59BB0")}
        ${px(12, 8, 1, 1, "#E59BB0")}
        ${sardas}
        ${boca}
        ${px(7, 10, 4, 1, est.corPele)}
        ${px(4, 11, 10, 6, est.corRoupa)}
        ${px(6, 11, 6, 2, est.corDetalhe)}
        ${px(7, 12, 4, 4, est.corDetalhe)}
        ${px(3, 12, 2, 4, est.corRoupa)}
        ${px(13, 12, 2, 4, est.corRoupa)}
        ${propSvg}
      </svg>
    `;
  }

  function desenharMascoteSVG(estado) {
    const npc = getNpcById(state.config.npcAtivoId);
    mascoteSvg.innerHTML = gerarSvgNpc(npc.id, estado);
  }

  function setMascoteEstado(estado, falaCustom) {
    mascoteEstado = estado;
    const npc = getNpcById(state.config.npcAtivoId);
    mascoteBox.classList.toggle("is-festa", estado === "festa");
    desenharMascoteSVG(estado);
    const falasNpc = npc.falas || FALAS_MASCOTE;
    const lista = falasNpc[estado] || falasNpc.normal || FALAS_MASCOTE.normal;
    mascoteFala.textContent = falaCustom || lista[Math.floor(Math.random() * lista.length)];
    renderControlesSomAmbiente();
    renderJanelinhaCompacta();
  }

  mascoteBox.addEventListener("click", () => {
    setMascoteEstado(mascoteEstado);
  });
  mascoteBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setMascoteEstado(mascoteEstado);
    }
  });

  // ---------- Medalhas Automáticas ----------
  function coletarContextoMedalhas() {
    const dias = Object.values(state.registrosDiarios || {});
    let totalPalavrasGeral = 0;
    let totalPomodorosGeral = 0;
    let totalRevisaoGeral = 0;
    let totalMissoesGeral = 0;
    let maiorDiaPalavras = 0;
    let bateuMinimaAlgumaVez = false;
    let bateuMetaDiaAlgumaVez = false;

    dias.forEach((d) => {
      const p = Number(d.palavrasEscritas) || 0;
      totalPalavrasGeral += p;
      totalPomodorosGeral += Number(d.pomodorosFeitos) || 0;
      totalRevisaoGeral += Number(d.minutosRevisados) || 0;
      totalMissoesGeral += Number(d.missoesFeitas) || 0;
      if (p > maiorDiaPalavras) maiorDiaPalavras = p;
      if (d.metaMinimaBatida) bateuMinimaAlgumaVez = true;
      if (d.metaDiariaBatida) bateuMetaDiaAlgumaVez = true;
    });

    totalMissoesGeral = Math.max(
      totalMissoesGeral,
      state.quests.filter((q) => q.concluida).length
    );

    const totalPalavrasLivros = (state.livros || []).reduce(
      (acc, l) => acc + (Number(l.palavrasTotais) || 0),
      0
    );

    return {
      totalPalavrasGeral: Math.max(totalPalavrasGeral, totalPalavrasLivros),
      totalPomodorosGeral,
      totalRevisaoGeral,
      totalMissoesGeral,
      maiorDiaPalavras,
      bateuMinimaAlgumaVez,
      bateuMetaDiaAlgumaVez,
      totalDiario: state.diario.length,
      totalPrazos: (state.prazos || []).length
    };
  }

  function verificarMedalhasAutomaticas() {
    const ctx = coletarContextoMedalhas();
    const novasMedalhas = [];

    MEDALHAS_DEFINICOES.forEach((med) => {
      if (!state.medalhasGanhas[med.id] && med.regra(ctx)) {
        state.medalhasGanhas[med.id] = hojeISO();
        novasMedalhas.push(med);
      }
    });

    if (novasMedalhas.length === 0) return;

    // Libera 1 novo personagem da fila escolhida pra cada medalha recém-ganha
    const ordem = getOrdemPersonagens(state.config.preferenciaRomance);
    let novoPersonagem = null;
    const totalMedalhas = Object.keys(state.medalhasGanhas).length;

    while (state.personagensDesbloqueados.length < Math.min(totalMedalhas, PERSONAGENS_UNLOCK_POOL.length)) {
      const candidato = ordem.find((n) => !state.personagensDesbloqueados.includes(n.id));
      if (!candidato) break;
      state.personagensDesbloqueados.push(candidato.id);
      if (!novoPersonagem) novoPersonagem = candidato;
    }

    const primeiraMedalha = novasMedalhas[0];
    salvarEstado();
    renderMedalhas();
    renderPersonagens();
    renderSelectorNpc();

    if (modalConquista.hidden) {
      comemorar({
        emoji: primeiraMedalha.icone,
        titulo: `Medalha nova: ${primeiraMedalha.nome}!`,
        xp: 20 * novasMedalhas.length,
        grande: true,
        palmas: true,
        cartinha: true,
        tipoSom: "medalha",
        medalhaNome: primeiraMedalha.nome,
        novoPersonagem
      });
    } else {
      if (novoPersonagem) {
        setTimeout(() => tocarSomFofo("personagem"), 350);
      }
      const xpMedalhas = 20 * novasMedalhas.length;
      mostrarCartinhaConquista(true, primeiraMedalha.nome, novoPersonagem);
      state.xpTotal += xpMedalhas;
      const reg = garantirDiaAtualizado();
      reg.xpDia += xpMedalhas;
      if (ultimaConquista) {
        ultimaConquista.xp += xpMedalhas;
        document.getElementById("conquista-xp").textContent = `+${ultimaConquista.xp} XP`;
      }
      salvarEstado();
      atualizarTopbar();
      renderPlacarGuilda();
    }
  }

  // ---------- Lógica de Contagem na Mesa ----------
  const mesaFeedback = document.getElementById("mesa-feedback");

  function mostrarFeedbackMesa(mensagem, tipo = "info") {
    mesaFeedback.textContent = mensagem;
    mesaFeedback.className = `mesa-feedback ${tipo === "good" ? "is-good" : tipo === "warn" ? "is-warn" : ""}`;
    mesaFeedback.hidden = false;
  }

  function registrarMinutoRevisaoSeNovo(reg) {
    const chave = minutoAtualChave();
    if (reg.ultimoMinutoRevisaoContado !== chave) {
      reg.ultimoMinutoRevisaoContado = chave;
      reg.minutosRevisados += 1;
      verificarMetasRevisao(reg);
    }
  }

  function verificarMetasEscrita(reg) {
    const metaDia = Math.max(1, Number(state.config.metaDiariaPalavras) || 1000);
    const metaMinima = Math.max(1, Number(state.config.metaMinimaPalavras) || 200);

    const bateuMinimaAgora = !reg.metaMinimaBatida && reg.palavrasEscritas >= metaMinima;
    const bateuDiariaAgora = !reg.metaDiariaBatida && reg.palavrasEscritas >= metaDia;

    if (bateuMinimaAgora) reg.metaMinimaBatida = true;
    if (bateuDiariaAgora) reg.metaDiariaBatida = true;

    if (bateuMinimaAgora || bateuDiariaAgora) {
      salvarEstado();
      if (bateuMinimaAgora && bateuDiariaAgora) {
        comemorar({
          emoji: "🏆",
          titulo: "Meta mínima e meta do dia batidas!",
          xp: 80,
          grande: true,
          tipoSom: "meta",
          fraseForcada: "Mínima e meta cheia garantidas num golpe só! O livro tá sem palavras pra tanta ousadia."
        });
      } else if (bateuDiariaAgora) {
        comemorar({
          emoji: "🏆",
          titulo: "Meta do dia concluída!",
          xp: 50,
          grande: true,
          tipoSom: "meta"
        });
      } else {
        comemorar({
          emoji: "🌿",
          titulo: "Meta mínima batida!",
          xp: 30,
          grande: false,
          tipoSom: "meta",
          tipoFalaNpc: "metaMinima",
          fraseForcada: "Meta mínima batida. O livro reconhece seu esforço, mesmo que de má vontade."
        });
      }
    }

    verificarMedalhasAutomaticas();
  }

  function verificarMetasRevisao(reg) {
    const metaDia = Math.max(1, Number(state.config.metaDiariaMinutosRevisao) || 45);
    const metaMinima = Math.max(1, Number(state.config.metaMinimaMinutosRevisao) || 15);

    const bateuMinimaAgora = !reg.metaMinimaRevisaoBatida && reg.minutosRevisados >= metaMinima;
    const bateuDiariaAgora = !reg.metaDiariaRevisaoBatida && reg.minutosRevisados >= metaDia;

    if (bateuMinimaAgora) reg.metaMinimaRevisaoBatida = true;
    if (bateuDiariaAgora) reg.metaDiariaRevisaoBatida = true;

    if (bateuMinimaAgora || bateuDiariaAgora) {
      salvarEstado();
      if (bateuMinimaAgora && bateuDiariaAgora) {
        comemorar({
          emoji: "⚔️",
          titulo: "Metas de revisão concluídas!",
          xp: 80,
          grande: true,
          tipoSom: "meta"
        });
      } else if (bateuDiariaAgora) {
        comemorar({
          emoji: "⚔️",
          titulo: "Meta de revisão concluída!",
          xp: 50,
          grande: true,
          tipoSom: "meta"
        });
      } else {
        comemorar({
          emoji: "🔍",
          titulo: "Meta mínima de revisão batida!",
          xp: 30,
          grande: false,
          tipoSom: "meta"
        });
      }
    }

    verificarMedalhasAutomaticas();
  }

  function somarPalavras(qtd) {
    const n = Math.floor(Number(qtd) || 0);
    if (n <= 0) {
      mostrarFeedbackMesa("Digite um número maior que zero, pois as palavras ainda não saem por telepatia.", "warn");
      return;
    }

    if (n > LIMITE_COLAGEM) {
      mostrarFeedbackMesa(
        `Salto de mais de ${formatarNumero(LIMITE_COLAGEM)} palavras de uma vez não conta na escrita do dia (tem cara de texto colado!). Se quiser só atualizar o total do arquivo, abra "Outras formas de contar".`,
        "warn"
      );
      return;
    }

    const reg = garantirDiaAtualizado();
    const livro = getLivroAtivo();

    reg.palavrasEscritas += n;
    reg.ultimaSomaHoje = n;
    livro.palavrasTotais = (Number(livro.palavrasTotais) || 0) + n;
    recalcularSaldoDia(reg);
    registrarMinutoRevisaoSeNovo(reg);

    salvarEstado();
    renderTudo();
    animarSubidaDiscretaNumero();
    mostrarFeedbackMesa(
      `${formatarNumero(reg.palavrasEscritas)} palavras hoje (+${formatarNumero(n)} agora em "${livro.nome}"). A procrastinação mandou lembranças.`,
      "good"
    );
    verificarMetasEscrita(reg);
  }

  function atualizarTotalLivro(novoTotalInput, apenasPontoPartida = false) {
    const novoTotal = Math.max(0, Math.floor(Number(novoTotalInput)));
    if (Number.isNaN(novoTotal)) {
      mostrarFeedbackMesa("Digite um número válido de palavras.", "warn");
      return;
    }

    const reg = garantirDiaAtualizado();
    const livro = getLivroAtivo();
    const anterior = Number(livro.palavrasTotais) || 0;
    const delta = novoTotal - anterior;

    if (apenasPontoPartida || anterior === 0) {
      livro.palavrasTotais = novoTotal;
      livro.palavrasInicioDia = novoTotal;
      recalcularSaldoDia(reg);
      salvarEstado();
      renderTudo();
      mostrarFeedbackMesa(
        `Ponto de partida de "${livro.nome}" cravado em ${formatarNumero(novoTotal)} palavras (sem contar hoje). A partir daqui, toda palavra nova entra no placar.`,
        "good"
      );
      return;
    }

    if (delta > LIMITE_COLAGEM) {
      livro.palavrasTotais = novoTotal;
      livro.palavrasInicioDia = (Number(livro.palavrasInicioDia) || 0) + delta;
      recalcularSaldoDia(reg);
      salvarEstado();
      renderTudo();
      mostrarFeedbackMesa(
        `O total saltou +${formatarNumero(delta)} palavras de uma vez (acima de ${formatarNumero(LIMITE_COLAGEM)} não entra como escrita de hoje pela regra anticolagem). Total do livro atualizado pra ${formatarNumero(novoTotal)}.`,
        "warn"
      );
      return;
    }

    if (delta > 0) {
      reg.palavrasEscritas += delta;
      reg.ultimaSomaHoje = delta;
      livro.palavrasTotais = novoTotal;
      recalcularSaldoDia(reg);
      registrarMinutoRevisaoSeNovo(reg);
      salvarEstado();
      renderTudo();
      animarSubidaDiscretaNumero();
      mostrarFeedbackMesa(
        `+${formatarNumero(delta)} palavras em "${livro.nome}" (${formatarNumero(reg.palavrasEscritas)} hoje). A procrastinação mandou lembranças.`,
        "good"
      );
      verificarMetasEscrita(reg);
      return;
    }

    if (delta < 0) {
      livro.palavrasTotais = novoTotal;
      recalcularSaldoDia(reg);
      registrarMinutoRevisaoSeNovo(reg);
      salvarEstado();
      renderTudo();
      mostrarFeedbackMesa(
        `Você cortou ${formatarNumero(Math.abs(delta))} palavras. O bisturi doeu, mas o texto agradece, e suas ${formatarNumero(reg.palavrasEscritas)} palavras escritas hoje continuam intactas.`,
        "info"
      );
      return;
    }

    mostrarFeedbackMesa("O total do livro continuou igualzinho: hora de dar um suspiro e seguir em frente.", "info");
  }

  function somarMinutosRevisao(qtd) {
    const n = Math.floor(Number(qtd) || 0);
    if (n <= 0) return;
    const reg = garantirDiaAtualizado();
    reg.minutosRevisados += n;
    salvarEstado();
    renderTudo();
    animarSubidaDiscretaNumero();
    verificarMetasRevisao(reg);
  }

  // ---------- Corrigir Palavras de Hoje (sem alterar total do livro) ----------
  const modalCorrigirPalavras = document.getElementById("modal-corrigir-palavras");
  const corrigirResumoAtual = document.getElementById("corrigir-resumo-atual");
  const corrigirPassoOpcoes = document.getElementById("corrigir-passo-opcoes");
  const corrigirPassoConfirm = document.getElementById("corrigir-passo-confirm");
  const btnCorrigirUltima = document.getElementById("btn-corrigir-ultima");
  const descCorrigirUltima = document.getElementById("desc-corrigir-ultima");
  const formCorrigirNumero = document.getElementById("form-corrigir-numero");
  const inputCorrigirNumero = document.getElementById("input-corrigir-numero");
  const btnCorrigirZerar = document.getElementById("btn-corrigir-zerar");
  const corrigirConfirmFala = document.getElementById("corrigir-confirm-fala");
  const corrigirConfirmDetalhe = document.getElementById("corrigir-confirm-detalhe");
  const btnCorrigirCancelar = document.getElementById("btn-corrigir-cancelar");
  const btnCorrigirConfirmar = document.getElementById("btn-corrigir-confirmar");
  let confirmacaoCorrecaoPendente = null;

  function corrigirPalavrasHoje(novoValorInput, limparUltimaSoma = false) {
    const novoValor = Math.max(0, Math.floor(Number(novoValorInput) || 0));
    const reg = garantirDiaAtualizado();
    const metaMinima = Math.max(1, Number(state.config.metaMinimaPalavras) || 200);
    const metaDia = Math.max(1, Number(state.config.metaDiariaPalavras) || 1000);

    let xpRemover = 0;
    if (reg.metaMinimaBatida && novoValor < metaMinima) {
      reg.metaMinimaBatida = false;
      xpRemover += 30;
    }
    if (reg.metaDiariaBatida && novoValor < metaDia) {
      reg.metaDiariaBatida = false;
      xpRemover += 50;
    }
    if (xpRemover > 0) {
      state.xpTotal = Math.max(0, (Number(state.xpTotal) || 0) - xpRemover);
      reg.xpDia = Math.max(0, (Number(reg.xpDia) || 0) - xpRemover);
    }

    reg.palavrasEscritas = novoValor;
    if (limparUltimaSoma) reg.ultimaSomaHoje = 0;

    if (novoValor === 0) {
      const hoje = hojeISO();
      state.livros.forEach((livro) => {
        livro.palavrasInicioDia = Number(livro.palavrasTotais) || 0;
        livro.dataReferenciaInicioDia = hoje;
      });
    }

    recalcularSaldoDia(reg);
    salvarEstado();
    renderTudo();
    mostrarFeedbackMesa(
      `Prontinho! Palavras escritas hoje ajustadas para ${formatarNumero(novoValor)} (o total do livro continua igual).`,
      "info"
    );
    verificarMetasEscrita(reg);
  }

  function prepararConfirmacaoCorrecao(modo, novoValorInput) {
    const reg = garantirDiaAtualizado();
    const atual = Math.max(0, Math.floor(Number(reg.palavrasEscritas) || 0));
    const alvo = Math.max(0, Math.floor(Number(novoValorInput) || 0));
    const npc = getNpcById(state.config.npcAtivoId);
    const nomeNpc = getNpcRotulo(npc);

    confirmacaoCorrecaoPendente = { modo, novoValor: alvo };
    corrigirConfirmFala.textContent = `Tem certeza? ${nomeNpc} promete não contar pra ninguém.`;
    corrigirConfirmDetalhe.textContent =
      alvo === 0
        ? `Palavras escritas hoje (de ${formatarNumero(atual)}) e saldo líquido de hoje voltam para 0. O total do livro não muda.`
        : `Palavras escritas hoje: de ${formatarNumero(atual)} para ${formatarNumero(alvo)}. O total do livro não muda.`;
    corrigirPassoOpcoes.hidden = true;
    corrigirPassoConfirm.hidden = false;
  }

  function abrirModalCorrigirPalavras() {
    const reg = garantirDiaAtualizado();
    const atual = Math.max(0, Math.floor(Number(reg.palavrasEscritas) || 0));
    const pulo = Math.max(0, Math.floor(Number(reg.ultimaSomaHoje) || 0));

    confirmacaoCorrecaoPendente = null;
    corrigirResumoAtual.textContent = `Hoje: ${formatarNumero(atual)} palavras escritas. O total do livro continua igual.`;
    corrigirPassoOpcoes.hidden = false;
    corrigirPassoConfirm.hidden = true;

    if (pulo > 0 && atual > 0) {
      const resultado = Math.max(0, atual - pulo);
      btnCorrigirUltima.disabled = false;
      descCorrigirUltima.textContent = `Tira a última soma (+${formatarNumero(pulo)}, ficando com ${formatarNumero(resultado)})`;
    } else {
      btnCorrigirUltima.disabled = true;
      descCorrigirUltima.textContent = "Nenhuma soma registrada para desfazer agora";
    }

    inputCorrigirNumero.value = atual;
    modalCorrigirPalavras.hidden = false;
  }

  function fecharModalCorrigirPalavras() {
    confirmacaoCorrecaoPendente = null;
    modalCorrigirPalavras.hidden = true;
  }

  const btnAbrirCorrigirHoje = document.getElementById("btn-abrir-corrigir-hoje");
  if (btnAbrirCorrigirHoje) {
    btnAbrirCorrigirHoje.addEventListener("click", abrirModalCorrigirPalavras);
  }
  document.getElementById("btn-fechar-corrigir-x").addEventListener("click", fecharModalCorrigirPalavras);
  modalCorrigirPalavras.addEventListener("click", (e) => {
    if (e.target === modalCorrigirPalavras) fecharModalCorrigirPalavras();
  });

  btnCorrigirUltima.addEventListener("click", () => {
    const reg = garantirDiaAtualizado();
    const pulo = Math.max(0, Math.floor(Number(reg.ultimaSomaHoje) || 0));
    if (pulo <= 0) return;
    prepararConfirmacaoCorrecao("ultima", Math.max(0, reg.palavrasEscritas - pulo));
  });

  formCorrigirNumero.addEventListener("submit", (e) => {
    e.preventDefault();
    const valor = Math.max(0, Math.floor(Number(inputCorrigirNumero.value)));
    if (Number.isNaN(valor)) return;
    prepararConfirmacaoCorrecao("numero", valor);
  });

  btnCorrigirZerar.addEventListener("click", () => {
    prepararConfirmacaoCorrecao("zerar", 0);
  });

  btnCorrigirCancelar.addEventListener("click", () => {
    confirmacaoCorrecaoPendente = null;
    corrigirPassoConfirm.hidden = true;
    corrigirPassoOpcoes.hidden = false;
  });

  btnCorrigirConfirmar.addEventListener("click", () => {
    if (!confirmacaoCorrecaoPendente) return;
    const { modo, novoValor } = confirmacaoCorrecaoPendente;
    fecharModalCorrigirPalavras();
    corrigirPalavrasHoje(novoValor, modo === "ultima" || modo === "zerar");
  });

  // ---------- Reloginho de Revisão Ativa ----------
  const btnRelogioRevisao = document.getElementById("btn-relogio-revisao");
  const statusRelogioRevisao = document.getElementById("status-relogio-revisao");
  const btnRelogioRevisaoMisto = document.getElementById("btn-relogio-revisao-misto");
  const statusRelogioRevisaoMisto = document.getElementById("status-relogio-revisao-misto");
  let revisaoTimerAtivo = false;
  let revisaoIntervalId = null;
  let revisaoSegundoInicio = 0;

  function atualizarStatusRelogioRevisao(texto) {
    if (statusRelogioRevisao) statusRelogioRevisao.textContent = texto;
    if (statusRelogioRevisaoMisto) statusRelogioRevisaoMisto.textContent = texto;
  }

  function alternarRelogioRevisao() {
    if (revisaoTimerAtivo) {
      revisaoTimerAtivo = false;
      clearInterval(revisaoIntervalId);
      btnRelogioRevisao.setAttribute("aria-pressed", "false");
      btnRelogioRevisao.textContent = "⏱️ Ligar reloginho de revisão ativa";
      if (btnRelogioRevisaoMisto) {
        btnRelogioRevisaoMisto.setAttribute("aria-pressed", "false");
        btnRelogioRevisaoMisto.textContent = "⏱️ Reloginho de revisão";
      }
      atualizarStatusRelogioRevisao("");
    } else {
      revisaoTimerAtivo = true;
      revisaoSegundoInicio = Date.now();
      btnRelogioRevisao.setAttribute("aria-pressed", "true");
      btnRelogioRevisao.textContent = "⏸ Pausar reloginho de revisão";
      if (btnRelogioRevisaoMisto) {
        btnRelogioRevisaoMisto.setAttribute("aria-pressed", "true");
        btnRelogioRevisaoMisto.textContent = "⏸ Pausar reloginho";
      }
      atualizarStatusRelogioRevisao("Cirurgia textual em andamento… 00:00");

      revisaoIntervalId = setInterval(() => {
        const seg = Math.floor((Date.now() - revisaoSegundoInicio) / 1000);
        const mm = String(Math.floor(seg / 60)).padStart(2, "0");
        const ss = String(seg % 60).padStart(2, "0");
        atualizarStatusRelogioRevisao(`Revisando agora: ${mm}:${ss} 🔍`);

        if (seg >= 60) {
          revisaoSegundoInicio += 60000;
          somarMinutosRevisao(1);
        }
      }, 1000);
    }
  }
  btnRelogioRevisao.addEventListener("click", alternarRelogioRevisao);
  if (btnRelogioRevisaoMisto) btnRelogioRevisaoMisto.addEventListener("click", alternarRelogioRevisao);

  // ---------- Quest em Foco + Mural de Missões (sincronizados!) ----------
  const questFeedback = document.getElementById("quest-feedback");

  function mostrarFeedbackQuest(msg, tipo = "info") {
    questFeedback.textContent = msg;
    questFeedback.className = `quest-feedback ${tipo === "good" ? "is-good" : tipo === "warn" ? "is-warn" : ""}`;
    questFeedback.hidden = false;
  }

  function concluirQuest(quest, viaVersaoMenor = false) {
    if (quest.concluida) return;
    quest.concluida = true;
    const reg = garantirDiaAtualizado();
    reg.missoesFeitas = (Number(reg.missoesFeitas) || 0) + 1;
    salvarEstado();

    renderQuestEmFoco();
    renderMissoesCompletas();

    mostrarFeedbackQuest(
      viaVersaoMenor
        ? `Versão menor cumprida em "${quest.titulo}"! Dia difícil domado com +${quest.xp} XP.`
        : `Quest "${quest.titulo}" fechada com ${quest.pomodorosTotal} de ${quest.pomodorosTotal} tomatinhos maduros! +${quest.xp} XP.`,
      "good"
    );

    comemorar({
      emoji: viaVersaoMenor ? "🐉🌱" : "🐉⚔️",
      titulo: viaVersaoMenor ? `Versão menor cumprida: ${quest.titulo}!` : `Quest concluída: ${quest.titulo}!`,
      xp: quest.xp,
      grande: true,
      palmas: true,
      festaDragao: true,
      tipoSom: "dragao"
    });

    verificarMedalhasAutomaticas();
  }

  function alternarPassoQuest(questId, passoIdx) {
    const quest = state.quests.find((q) => q.id === questId);
    if (!quest || !quest.passos[passoIdx]) return;

    quest.passos[passoIdx].feito = !quest.passos[passoIdx].feito;
    quest.pomodorosFeitos = quest.passos.filter((p) => p.feito).length;
    quest.encerradaSemCulpa = false;

    const acabouAgora = !quest.concluida && quest.pomodorosFeitos >= quest.pomodorosTotal;
    salvarEstado();
    renderQuestEmFoco();
    renderMissoesCompletas();

    if (acabouAgora) {
      concluirQuest(quest, false);
    } else if (quest.passos[passoIdx].feito) {
      soltarBrilhoPequeno(24);
      tocarSomFofo("tomatinho");
      const npcAtivo = getNpcById(state.config.npcAtivoId);
      if (npcAtivo && npcAtivo.falas && Array.isArray(npcAtivo.falas.tomatinho) && npcAtivo.falas.tomatinho.length > 0) {
        setMascoteEstado(mascoteEstado, sortearFalaNpc(npcAtivo, "tomatinho", "normal"));
      }
    }
  }

  function acenderTomatinhoQuest(questId = null, opcoes = {}) {
    const quest = questId ? state.quests.find((q) => q.id === questId) : getQuestEmFoco();
    if (!quest) return;

    if (quest.concluida) {
      mostrarFeedbackQuest(
        `"${quest.titulo}" já tá com todos os tomatinhos vermelhos! Escolha outra quest ali em cima ou crie uma nova.`,
        "info"
      );
      return;
    }

    const proximoPassoIdx = quest.passos.findIndex((p) => !p.feito);
    if (proximoPassoIdx >= 0) {
      quest.passos[proximoPassoIdx].feito = true;
      quest.pomodorosFeitos = quest.passos.filter((p) => p.feito).length;
    } else {
      quest.pomodorosFeitos = Math.min(quest.pomodorosTotal, quest.pomodorosFeitos + 1);
    }
    quest.encerradaSemCulpa = false;

    salvarEstado();
    renderQuestEmFoco();
    renderMissoesCompletas();

    if (quest.pomodorosFeitos >= quest.pomodorosTotal) {
      concluirQuest(quest, false);
    } else {
      if (!opcoes.semEfeito) {
        soltarBrilhoPequeno(24);
        tocarSomFofo("tomatinho");
        const npcAtivo = getNpcById(state.config.npcAtivoId);
        if (npcAtivo && npcAtivo.falas && Array.isArray(npcAtivo.falas.tomatinho) && npcAtivo.falas.tomatinho.length > 0) {
          setMascoteEstado(mascoteEstado, sortearFalaNpc(npcAtivo, "tomatinho", "normal"));
        }
      }
      mostrarFeedbackQuest(
        `Mais um tomatinho amadureceu (${quest.pomodorosFeitos} de ${quest.pomodorosTotal}). O livro já tá sentindo a pressão!`,
        "good"
      );
    }
  }

  function encerrarSessaoSemCulpa() {
    if (pomoRodando) {
      pomoRestanteSeg = Math.max(0, Math.ceil((pomoFimTimestamp - Date.now()) / 1000));
      pomoRodando = false;
      clearInterval(pomoIntervalId);
      renderPomodoro();
    }

    const quest = getQuestEmFoco();
    if (quest) {
      quest.encerradaSemCulpa = true;
      salvarEstado();
      renderQuestEmFoco();
      mostrarFeedbackQuest(
        `Sessão encerrada (${quest.pomodorosFeitos} de ${quest.pomodorosTotal} 🍅). O que você fez hoje já tá guardado no pergaminho; o resto espera por amanhã sem cobrança!`,
        "info"
      );
    } else {
      mostrarFeedbackQuest("Sessão encerrada sem culpa. Vai viver um pouco fora da tela!", "info");
    }

    setMascoteEstado("pausa", "Sessão fechada. Os gatos aprovaram sua retirada estratégica.");
  }

  function renderQuestEmFoco() {
    const select = document.getElementById("select-quest-foco");
    select.innerHTML = "";
    state.quests.forEach((q) => {
      const opt = document.createElement("option");
      opt.value = q.id;
      const check = q.concluida ? "✓ " : "";
      opt.textContent = `${check}${q.titulo} (${q.pomodorosFeitos}/${q.pomodorosTotal} 🍅)`;
      if (q.id === state.config.questEmFocoId) opt.selected = true;
      select.appendChild(opt);
    });

    const quest = getQuestEmFoco();
    if (!quest) {
      renderJanelinhaCompacta();
      return;
    }

    document.getElementById("quest-foco-titulo").textContent = quest.concluida
      ? `✓ ${quest.titulo}`
      : quest.titulo;
    document.getElementById("quest-foco-xp").textContent = `+${quest.xp} XP`;
    document.getElementById("quest-progresso-texto").textContent =
      `${quest.pomodorosFeitos} de ${quest.pomodorosTotal} ${quest.pomodorosTotal === 1 ? "pomodoro" : "pomodoros"}`;

    const row = document.getElementById("quest-tomatinhos");
    row.innerHTML = "";
    for (let i = 0; i < quest.pomodorosTotal; i++) {
      const maduro = i < quest.pomodorosFeitos;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `tomatinho ${maduro ? "is-vermelho" : "is-verde"}`;
      btn.innerHTML = gerarTomatinhoSVG(maduro);
      btn.title = maduro ? "Tomatinho maduro (concluído)" : "Tomatinho verde: clique para amadurecer";
      btn.setAttribute("aria-label", maduro ? `Tomatinho ${i + 1} maduro` : `Amadurecer tomatinho ${i + 1}`);
      if (!maduro && !quest.concluida) {
        btn.addEventListener("click", () => acenderTomatinhoQuest(quest.id));
      }
      row.appendChild(btn);
    }

    const btnAcender = document.getElementById("btn-acender-tomatinho");
    btnAcender.disabled = quest.concluida;
    btnAcender.textContent = quest.concluida ? "✓ Quest concluída" : "🍅 Acender 1 tomatinho";
    renderControlesSomAmbiente();
    renderJanelinhaCompacta();
  }

  document.getElementById("select-quest-foco").addEventListener("change", (e) => {
    state.config.questEmFocoId = e.target.value;
    questFeedback.hidden = true;
    salvarEstado();
    renderQuestEmFoco();
    renderMissoesCompletas();
  });

  document.getElementById("btn-toggle-nova-quest").addEventListener("click", () => {
    const form = document.getElementById("form-nova-quest");
    form.hidden = !form.hidden;
    if (!form.hidden) {
      document.getElementById("input-nova-quest-titulo").focus();
    }
  });

  function criarNovaQuest(titulo, tamanho, customPomodoros = null, versaoMenor = "") {
    let pomodoros = 2;
    let xp = 25;
    if (tamanho === "P") {
      pomodoros = 1;
      xp = 10;
    } else if (tamanho === "M") {
      pomodoros = 2;
      xp = 25;
    } else if (tamanho === "GG") {
      pomodoros = 4;
      xp = 50;
    } else {
      pomodoros = Math.max(3, Math.min(10, Number(customPomodoros) || 3));
      xp = 50;
    }

    const novaQuest = {
      id: gerarId("quest"),
      titulo,
      tamanho: tamanho === "GG" ? "G" : tamanho,
      pomodorosTotal: pomodoros,
      pomodorosFeitos: 0,
      xp,
      versaoMenor: versaoMenor.trim(),
      passos: criarPassosParaQuest(pomodoros, 0),
      concluida: false,
      encerradaSemCulpa: false
    };

    state.quests.unshift(novaQuest);
    state.config.questEmFocoId = novaQuest.id;
    salvarEstado();
    renderQuestEmFoco();
    renderMissoesCompletas();
  }

  document.getElementById("form-nova-quest").addEventListener("submit", (e) => {
    e.preventDefault();
    const inputTitulo = document.getElementById("input-nova-quest-titulo");
    const tamanho = document.getElementById("select-nova-quest-tamanho").value;
    const titulo = inputTitulo.value.trim();
    if (!titulo) return;

    criarNovaQuest(titulo, tamanho);
    inputTitulo.value = "";
    document.getElementById("form-nova-quest").hidden = true;
    questFeedback.hidden = true;
  });

  document.getElementById("btn-acender-tomatinho").addEventListener("click", () => acenderTomatinhoQuest());
  document.getElementById("btn-acabou-sessao").addEventListener("click", encerrarSessaoSemCulpa);

  // ---------- Mural de Missões & Quests Completo (Fase 2) ----------
  const selectMissaoTamanho = document.getElementById("missao-tamanho");
  const missaoQtdWrap = document.getElementById("missao-qtd-wrap");

  selectMissaoTamanho.addEventListener("change", () => {
    missaoQtdWrap.hidden = selectMissaoTamanho.value !== "G";
  });

  document.getElementById("form-missao-completa").addEventListener("submit", (e) => {
    e.preventDefault();
    const tituloInput = document.getElementById("missao-titulo");
    const versaoMenorInput = document.getElementById("missao-versao-menor");
    const tamanho = selectMissaoTamanho.value;
    const pomosG = document.getElementById("missao-pomos-g").value;
    const titulo = tituloInput.value.trim();
    if (!titulo) return;

    criarNovaQuest(titulo, tamanho, pomosG, versaoMenorInput.value);
    tituloInput.value = "";
    versaoMenorInput.value = "";
  });

  function renderMissoesCompletas() {
    const grid = document.getElementById("grid-missoes");
    grid.innerHTML = "";
    const focoId = state.config.questEmFocoId;

    if (state.quests.length === 0) {
      grid.innerHTML = `<div class="empty-state">Nenhuma missão cadastrada ainda. Crie uma acima!</div>`;
      return;
    }

    state.quests.forEach((q) => {
      const card = document.createElement("article");
      card.className = `missao-card ${q.id === focoId ? "is-em-foco" : ""} ${q.concluida ? "is-concluida" : ""}`;

      const head = document.createElement("div");
      head.className = "missao-card-head";

      const title = document.createElement("h3");
      title.className = "missao-card-title";
      title.textContent = q.concluida ? `✓ ${q.titulo}` : q.titulo;

      const xpBadge = document.createElement("span");
      xpBadge.className = "quest-xp-tag";
      xpBadge.textContent = `${q.tamanho} • +${q.xp} XP`;
      head.append(title, xpBadge);
      card.appendChild(head);

      // Versão menor opcional
      if (q.versaoMenor) {
        const menorBox = document.createElement("div");
        menorBox.className = "missao-menor-box";
        const spanTxt = document.createElement("span");
        spanTxt.textContent = `🌱 Versão menor: ${q.versaoMenor}`;
        menorBox.appendChild(spanTxt);

        if (!q.concluida) {
          const btnMenor = document.createElement("button");
          btnMenor.type = "button";
          btnMenor.className = "btn btn-secondary btn-small";
          btnMenor.textContent = "Valer esta!";
          btnMenor.addEventListener("click", () => concluirQuest(q, true));
          menorBox.appendChild(btnMenor);
        }
        card.appendChild(menorBox);
      }

      // Passos renomeáveis (1 por pomodoro) com tomatinho verde -> vermelho
      const passosLista = document.createElement("div");
      passosLista.className = "passos-lista";

      q.passos.forEach((passo, idx) => {
        const row = document.createElement("div");
        row.className = "passo-row";

        const btnTom = document.createElement("button");
        btnTom.type = "button";
        btnTom.className = `tomatinho passo-tomate-btn ${passo.feito ? "is-vermelho" : "is-verde"}`;
        btnTom.innerHTML = gerarTomatinhoSVG(passo.feito);
        btnTom.title = passo.feito ? "Passo concluído" : "Marcar passo concluído";
        btnTom.addEventListener("click", () => alternarPassoQuest(q.id, idx));

        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = `passo-input ${passo.feito ? "is-feito" : ""}`;
        inp.value = passo.titulo;
        inp.title = "Renomear este passo";
        inp.addEventListener("change", () => {
          passo.titulo = inp.value.trim() || `Pomodoro ${idx + 1}`;
          salvarEstado();
        });

        row.append(btnTom, inp);
        passosLista.appendChild(row);
      });
      card.appendChild(passosLista);

      // Rodapé da missão
      const footer = document.createElement("div");
      footer.className = "missao-card-footer";

      const btnFoco = document.createElement("button");
      btnFoco.type = "button";
      btnFoco.className = q.id === focoId ? "btn btn-secondary btn-small" : "btn btn-gold btn-small";
      btnFoco.textContent = q.id === focoId ? "✓ Em foco" : "🎯 Colocar em foco";
      btnFoco.disabled = q.id === focoId;
      btnFoco.addEventListener("click", () => {
        state.config.questEmFocoId = q.id;
        salvarEstado();
        renderQuestEmFoco();
        renderMissoesCompletas();
      });

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn-danger btn-small";
      btnDel.textContent = "Excluir";
      btnDel.addEventListener("click", () => {
        if (state.quests.length <= 1) {
          alert("Deixe pelo menos uma quest na lista pra o painel de foco não ficar vazio!");
          return;
        }
        state.quests = state.quests.filter((item) => item.id !== q.id);
        if (state.config.questEmFocoId === q.id) {
          state.config.questEmFocoId = state.quests[0].id;
        }
        salvarEstado();
        renderQuestEmFoco();
        renderMissoesCompletas();
      });

      footer.append(btnFoco, btnDel);
      card.appendChild(footer);
      grid.appendChild(card);
    });
  }

  // ---------- Diário de Bordo (Fase 2) ----------
  const checkboxDiarioTodos = document.getElementById("checkbox-diario-todos");

  document.getElementById("form-diario").addEventListener("submit", (e) => {
    e.preventDefault();
    const editId = document.getElementById("diario-edit-id").value;
    const inputTexto = document.getElementById("diario-texto");
    const texto = inputTexto.value.trim();
    if (!texto) return;

    const livro = getLivroAtivo();
    const hoje = hojeISO();

    if (editId) {
      const item = state.diario.find((d) => d.id === editId);
      if (item) item.texto = texto;
      limparFormularioDiario();
    } else {
      const jaTemHojeDesseLivro = state.diario.find(
        (d) => d.data === hoje && d.livroId === livro.id
      );

      if (jaTemHojeDesseLivro) {
        jaTemHojeDesseLivro.texto = texto;
      } else {
        const ehPrimeiraDoDia = !state.diario.some((d) => d.data === hoje);
        state.diario.unshift({
          id: gerarId("diario"),
          data: hoje,
          livroId: livro.id,
          texto
        });
        if (ehPrimeiraDoDia) {
          const reg = garantirDiaAtualizado();
          state.xpTotal += 10;
          reg.xpDia += 10;
        }
      }
      inputTexto.value = "";
    }

    salvarEstado();
    renderDiario();
    atualizarTopbar();
    renderPlacarGuilda();
    verificarMedalhasAutomaticas();
  });

  function limparFormularioDiario() {
    document.getElementById("diario-edit-id").value = "";
    document.getElementById("diario-texto").value = "";
    document.getElementById("btn-salvar-diario").textContent = "Guardar";
    document.getElementById("btn-cancelar-edit-diario").hidden = true;
  }

  document.getElementById("btn-cancelar-edit-diario").addEventListener("click", limparFormularioDiario);
  checkboxDiarioTodos.addEventListener("change", renderDiario);

  function renderDiario() {
    const livroAtivo = getLivroAtivo();
    document.getElementById("diario-livro-ativo-nome").textContent = `📖 ${livroAtivo.nome}`;

    const lista = document.getElementById("lista-diario");
    lista.innerHTML = "";

    const mostrarTodos = checkboxDiarioTodos.checked;
    const entradas = state.diario
      .filter((d) => mostrarTodos || d.livroId === livroAtivo.id)
      .sort((a, b) => b.data.localeCompare(a.data));

    if (entradas.length === 0) {
      lista.innerHTML = `<div class="empty-state">Nenhuma anotação pra esse livro ainda. Escreva uma linha rápida acima quando parar!</div>`;
      return;
    }

    entradas.forEach((ent) => {
      const livro = state.livros.find((l) => l.id === ent.livroId);
      const nomeLivro = livro ? livro.nome : "Livro";
      const cor = livro ? livro.cor : "#5C8D58";

      const div = document.createElement("div");
      div.className = "diario-item";
      div.style.borderLeftColor = cor;

      const info = document.createElement("div");
      const meta = document.createElement("div");
      meta.className = "diario-item-meta";
      meta.textContent = `${formatarDataBR(ent.data)} • ${nomeLivro}`;

      const p = document.createElement("p");
      p.className = "diario-item-texto";
      p.textContent = `Hoje eu ${ent.texto}`;

      info.append(meta, p);

      const acoes = document.createElement("div");
      acoes.className = "prazo-actions";

      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn btn-secondary btn-small";
      btnEdit.textContent = "✏️";
      btnEdit.title = "Editar anotação";
      btnEdit.addEventListener("click", () => {
        document.getElementById("diario-edit-id").value = ent.id;
        document.getElementById("diario-texto").value = ent.texto;
        document.getElementById("btn-salvar-diario").textContent = "Atualizar";
        document.getElementById("btn-cancelar-edit-diario").hidden = false;
        document.getElementById("diario-texto").focus();
      });

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn-danger btn-small";
      btnDel.textContent = "✕";
      btnDel.title = "Apagar anotação";
      btnDel.addEventListener("click", () => {
        state.diario = state.diario.filter((d) => d.id !== ent.id);
        salvarEstado();
        renderDiario();
      });

      acoes.append(btnEdit, btnDel);
      div.append(info, acoes);
      lista.appendChild(div);
    });
  }

  // ---------- Salinha de Troféus (Fase 2) ----------
  function somarPeriodo(diasLimite) {
    const dataCorte = dataPassadaISO(diasLimite - 1);
    const resumo = {
      palavras: 0,
      pomodoros: 0,
      revisao: 0,
      missoes: 0,
      xp: 0
    };

    Object.entries(state.registrosDiarios || {}).forEach(([data, reg]) => {
      if (data >= dataCorte) {
        resumo.palavras += Number(reg.palavrasEscritas) || 0;
        resumo.pomodoros += Number(reg.pomodorosFeitos) || 0;
        resumo.revisao += Number(reg.minutosRevisados) || 0;
        resumo.missoes += Number(reg.missoesFeitas) || 0;
        resumo.xp += Number(reg.xpDia) || 0;
      }
    });

    return resumo;
  }

  function renderPlacarGuilda() {
    const container = document.getElementById("placar-guilda");
    container.innerHTML = "";

    const periodos = [
      { titulo: "📅 Hoje", dados: somarPeriodo(1) },
      { titulo: "🌿 Últimos 7 dias", dados: somarPeriodo(7) },
      { titulo: "🗓️ Últimos 30 dias", dados: somarPeriodo(30) }
    ];

    periodos.forEach((p) => {
      const card = document.createElement("div");
      card.className = "placar-card";
      card.innerHTML = `
        <div class="placar-periodo">${p.titulo}</div>
        <div class="placar-linhas">
          <div class="placar-linha"><span>✍️ Palavras</span><strong>${formatarNumero(p.dados.palavras)}</strong></div>
          <div class="placar-linha"><span>🍅 Pomodoros</span><strong>${formatarNumero(p.dados.pomodoros)}</strong></div>
          <div class="placar-linha"><span>🔍 Revisão (min)</span><strong>${formatarNumero(p.dados.revisao)}</strong></div>
          <div class="placar-linha"><span>⚔️ Missões</span><strong>${formatarNumero(p.dados.missoes)}</strong></div>
          <div class="placar-linha"><span>✨ XP</span><strong>${formatarNumero(p.dados.xp)}</strong></div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderMedalhas() {
    const grid = document.getElementById("grid-medalhas");
    grid.innerHTML = "";

    MEDALHAS_DEFINICOES.forEach((med) => {
      const desbloqueada = Boolean(state.medalhasGanhas[med.id]);
      const card = document.createElement("div");
      card.className = `medalha-card ${desbloqueada ? "" : "is-bloqueada"}`;

      const icone = document.createElement("span");
      icone.className = "medalha-icone";
      icone.textContent = desbloqueada ? med.icone : "🔒";

      const info = document.createElement("div");
      const nome = document.createElement("div");
      nome.className = "medalha-nome";
      nome.textContent = desbloqueada ? med.nome : "???";

      const desc = document.createElement("div");
      desc.className = "medalha-desc";
      desc.textContent = desbloqueada ? med.desc : "???";

      info.append(nome, desc);

      if (!desbloqueada && med.dica) {
        const dicaEl = document.createElement("div");
        dicaEl.className = "medalha-dica";
        dicaEl.textContent = med.dica;

        const tagUnlock = document.createElement("div");
        tagUnlock.className = "medalha-unlock-tag";
        tagUnlock.textContent = "💌 Libera +1 personagem";

        info.append(dicaEl, tagUnlock);
      }

      card.append(icone, info);
      grid.appendChild(card);
    });
  }

  function renderSelectorNpc() {
    const select = document.getElementById("select-npc-ativo");
    if (!select) return;
    select.innerHTML = "";

    const disponiveis = ELENCO_NPCS.filter((npc) => isNpcDesbloqueado(npc.id));
    disponiveis.forEach((npc) => {
      const opt = document.createElement("option");
      opt.value = npc.id;
      opt.textContent = getNpcRotulo(npc);
      if (npc.id === state.config.npcAtivoId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  document.getElementById("select-npc-ativo").addEventListener("change", (e) => {
    const escolhido = e.target.value;
    if (!isNpcDesbloqueado(escolhido)) return;
    state.config.npcAtivoId = escolhido;
    salvarEstado();
    atualizarTopbar();
    renderPersonagens();
    setMascoteEstado(pomoRodando ? (pomoModo === "foco" ? "foco" : "pausa") : "normal");
    soltarBrilhoPequeno(22);
    tocarSomFofo("personagem");
  });

  function definirNomePersonagem(npcId, nomeDigitado) {
    const limpo = String(nomeDigitado || "").trim();
    if (!state.config.apelidosNpc) state.config.apelidosNpc = {};
    if (limpo) {
      state.config.apelidosNpc[npcId] = limpo;
      if (npcId === "gatinha-fiscal") state.config.nomeMascote = limpo;
    } else {
      delete state.config.apelidosNpc[npcId];
      if (npcId === "gatinha-fiscal") state.config.nomeMascote = "";
    }
    salvarEstado();
    atualizarTopbar();
    renderSelectorNpc();
    renderPersonagens();
    renderQuestZero();
  }

  function renderPersonagens() {
    const npcAtual = getNpcById(state.config.npcAtivoId);
    const destSvg = document.getElementById("personagens-ativo-svg");
    const destNome = document.getElementById("personagens-ativo-nome");
    const destDica = document.getElementById("personagens-ativo-dica");
    if (destSvg) destSvg.innerHTML = gerarSvgNpc(npcAtual.id, mascoteEstado);
    if (destNome) destNome.textContent = getNpcRotulo(npcAtual);
    if (destDica) destDica.textContent = npcAtual.descricao || "Acompanhando você na mesa de escrita.";

    const grid = document.getElementById("grid-personagens");
    if (!grid) return;
    grid.innerHTML = "";

    const ordem = getOrdemPersonagens(state.config.preferenciaRomance);
    const iniciais = ELENCO_NPCS.filter((n) => n.desbloqueadoInicio);
    const restanteUnlock = ordem.slice(0, MEDALHAS_DEFINICOES.length);
    const exibidos = [...iniciais, ...restanteUnlock];

    exibidos.forEach((npc) => {
      const livre = isNpcDesbloqueado(npc.id);
      const ativo = state.config.npcAtivoId === npc.id;
      const card = document.createElement("div");
      card.className = `personagem-card ${ativo ? "is-ativo" : ""} ${livre ? "" : "is-bloqueada"}`.trim();

      const topo = document.createElement("div");
      topo.className = "personagem-topo";

      const avatar = document.createElement("div");
      avatar.className = "personagem-avatar";
      if (livre) {
        avatar.innerHTML = gerarSvgNpc(npc.id, ativo ? mascoteEstado : "normal");
      } else {
        avatar.textContent = "💌";
      }

      const info = document.createElement("div");
      info.className = "personagem-info";

      const nomeEl = document.createElement("div");
      nomeEl.className = "personagem-nome";
      nomeEl.textContent = livre ? getNpcRotulo(npc) : "??? • Cartinha Lacrada";

      const arqEl = document.createElement("div");
      arqEl.className = "personagem-arq";
      arqEl.textContent = livre
        ? npc.descricao
        : "Novo personagem aguardando sua próxima medalha automática.";

      info.append(nomeEl, arqEl);
      topo.append(avatar, info);
      card.appendChild(topo);

      if (livre) {
        const footer = document.createElement("div");
        footer.className = "personagem-footer";

        const nomeAtual = getNpcCustomName(npc);
        const btnNome = document.createElement("button");
        btnNome.type = "button";
        btnNome.className = "btn btn-secondary btn-small";
        btnNome.textContent = nomeAtual ? "✏️ Mudar nome" : "✏️ Dar nome";
        btnNome.addEventListener("click", () => {
          const resposta = window.prompt(
            `Se quiser, dê um nome para ${npc.arquetipo} (ou deixe em branco para usar só o arquétipo):`,
            nomeAtual
          );
          if (resposta === null) return;
          definirNomePersonagem(npc.id, resposta);
        });

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = ativo ? "btn btn-secondary btn-small" : "btn btn-primary btn-small";
        btn.textContent = ativo ? "✓ Na mesa agora" : "Chamar pra mesa";
        btn.disabled = ativo;
        btn.addEventListener("click", () => {
          state.config.npcAtivoId = npc.id;
          salvarEstado();
          atualizarTopbar();
          renderSelectorNpc();
          renderPersonagens();
          setMascoteEstado("normal");
          soltarBrilhoPequeno(24);
          tocarSomFofo("personagem");
        });
        footer.append(btnNome, btn);
        card.appendChild(footer);
      } else {
        const dicaEl = document.createElement("div");
        dicaEl.className = "personagem-dica";
        dicaEl.textContent = "🔒 Ganhe mais 1 medalha automática para abrir o lacre.";
        card.appendChild(dicaEl);
      }

      grid.appendChild(card);
    });
  }

  // Marcos do livro editáveis + botão "Conquistei!"
  document.getElementById("form-novo-marco").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("input-novo-marco");
    const titulo = input.value.trim();
    if (!titulo) return;

    const livro = getLivroAtivo();
    livro.marcos.push({
      id: gerarId("marco"),
      titulo,
      conquistado: false,
      data: null
    });
    input.value = "";
    salvarEstado();
    renderMarcos();
  });

  function renderMarcos() {
    const livro = getLivroAtivo();
    document.getElementById("marco-livro-nome").textContent = livro.nome;
    const lista = document.getElementById("lista-marcos");
    lista.innerHTML = "";

    livro.marcos.forEach((marco) => {
      const item = document.createElement("div");
      item.className = `marco-item ${marco.conquistado ? "is-feito" : ""}`;

      const span = document.createElement("span");
      span.className = "marco-nome";
      span.textContent = marco.conquistado
        ? `🏆 ${marco.titulo} (${formatarDataBR(marco.data)})`
        : `🚩 ${marco.titulo}`;

      const acoes = document.createElement("div");
      acoes.className = "marco-actions";

      if (!marco.conquistado) {
        const btnConq = document.createElement("button");
        btnConq.type = "button";
        btnConq.className = "btn btn-primary btn-small";
        btnConq.textContent = "🎉 Conquistei!";
        btnConq.addEventListener("click", () => {
          marco.conquistado = true;
          marco.data = hojeISO();
          salvarEstado();
          renderMarcos();
          comemorar({
            emoji: "🚩",
            titulo: `Marco conquistado: ${marco.titulo}!`,
            xp: 40,
            grande: true,
            palmas: true
          });
        });
        acoes.appendChild(btnConq);
      }

      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn btn-secondary btn-small";
      btnEdit.textContent = "✏️";
      btnEdit.title = "Renomear marco";
      btnEdit.addEventListener("click", () => {
        const novoNome = prompt("Novo nome para este marco do livro:", marco.titulo);
        if (novoNome && novoNome.trim()) {
          marco.titulo = novoNome.trim();
          salvarEstado();
          renderMarcos();
        }
      });

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn-danger btn-small";
      btnDel.textContent = "✕";
      btnDel.title = "Remover marco";
      btnDel.addEventListener("click", () => {
        livro.marcos = livro.marcos.filter((m) => m.id !== marco.id);
        salvarEstado();
        renderMarcos();
      });

      acoes.append(btnEdit, btnDel);
      item.append(span, acoes);
      lista.appendChild(item);
    });
  }

  // Lista de desejos de recompensa
  document.getElementById("form-novo-desejo").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("input-novo-desejo");
    const texto = input.value.trim();
    if (!texto) return;
    state.desejos.unshift({
      id: gerarId("desejo"),
      texto,
      resgatado: false
    });
    input.value = "";
    salvarEstado();
    renderDesejos();
  });

  function renderDesejos() {
    const lista = document.getElementById("lista-desejos");
    lista.innerHTML = "";

    if (state.desejos.length === 0) {
      lista.innerHTML = `<div class="empty-state">Lista vazia. Anote um mimo real pra comemorar quando bater uma meta!</div>`;
      return;
    }

    state.desejos.forEach((d) => {
      const item = document.createElement("div");
      item.className = `desejo-item ${d.resgatado ? "is-feito" : ""}`;

      const span = document.createElement("span");
      span.className = "desejo-nome";
      span.textContent = d.resgatado ? `✨ ${d.texto} (resgatado!)` : `🎁 ${d.texto}`;

      const acoes = document.createElement("div");
      acoes.className = "desejo-actions";

      const btnResgatar = document.createElement("button");
      btnResgatar.type = "button";
      btnResgatar.className = d.resgatado ? "btn btn-secondary btn-small" : "btn btn-gold btn-small";
      btnResgatar.textContent = d.resgatado ? "Reabrir" : "✨ Resgatei!";
      btnResgatar.addEventListener("click", () => {
        d.resgatado = !d.resgatado;
        salvarEstado();
        renderDesejos();
        if (d.resgatado) {
          soltarConfete(70, { glitter: 45 });
          tocarSomFofo("meta");
        }
      });

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn-danger btn-small";
      btnDel.textContent = "✕";
      btnDel.title = "Remover desejo";
      btnDel.addEventListener("click", () => {
        state.desejos = state.desejos.filter((x) => x.id !== d.id);
        salvarEstado();
        renderDesejos();
      });

      acoes.append(btnResgatar, btnDel);
      item.append(span, acoes);
      lista.appendChild(item);
    });
  }

  // ---------- Pomodoro 25/5 ----------
  const pomoDisplay = document.getElementById("pomo-display");
  const btnPomoToggle = document.getElementById("btn-pomo-toggle");
  const btnPomoReset = document.getElementById("btn-pomo-reset");
  const btnPomoBrincar = document.getElementById("btn-pomo-brincar");
  const btnPomoPular = document.getElementById("btn-pomo-pular");
  const pomoProntoBadge = document.getElementById("pomo-pronto-badge");
  const btnPomoFoco = document.getElementById("btn-pomo-foco");
  const btnPomoPausa = document.getElementById("btn-pomo-pausa");
  const modalMinijogos = document.getElementById("modal-minijogos");
  const minijogoCanvas = document.getElementById("minijogo-canvas");
  const minijogoCtx = minijogoCanvas ? minijogoCanvas.getContext("2d") : null;
  const minijogoPontosEl = document.getElementById("minijogo-pontos");
  const minijogoRecordeEl = document.getElementById("minijogo-recorde");
  const minijogoStatusEl = document.getElementById("minijogo-status");
  const minijogoTempoPausaEl = document.getElementById("minijogo-tempo-pausa");

  let pomoModo = "foco";
  let pomoRodando = false;
  let pomoProntoProFoco = false;
  let pomoRestanteSeg = (Number(state.config.pomoFocoMin) || 25) * 60;
  let pomoFimTimestamp = 0;
  let pomoIntervalId = null;

  let minijogoAtivo = "cobrinha";
  let minijogoTimerId = null;
  let minijogoFrameId = null;
  let minijogoPontos = 0;
  let minijogoGameOver = false;
  let minijogoRecordeBatido = false;
  let minijogoEstado = null;

  function pararLoopsMinijogo() {
    if (minijogoTimerId) {
      clearInterval(minijogoTimerId);
      minijogoTimerId = null;
    }
    if (minijogoFrameId) {
      cancelAnimationFrame(minijogoFrameId);
      minijogoFrameId = null;
    }
  }

  function atualizarPlacarMinijogo() {
    const rec = (state.config.recordesMinijogos && state.config.recordesMinijogos[minijogoAtivo]) || 0;
    if (minijogoPontosEl) minijogoPontosEl.textContent = `Pontos: ${formatarNumero(minijogoPontos)}`;
    if (minijogoRecordeEl) minijogoRecordeEl.textContent = `🏆 Recorde: ${formatarNumero(rec)}`;
  }

  function definirPontosMinijogo(valor) {
    minijogoPontos = Math.max(0, Math.floor(Number(valor) || 0));
    const recAtual = (state.config.recordesMinijogos && state.config.recordesMinijogos[minijogoAtivo]) || 0;
    if (minijogoPontos > recAtual) {
      if (!state.config.recordesMinijogos) {
        state.config.recordesMinijogos = { cobrinha: 0, blocos: 0, fuga: 0 };
      }
      state.config.recordesMinijogos[minijogoAtivo] = minijogoPontos;
      salvarEstado();
      if (!minijogoRecordeBatido && minijogoPontos > 0) {
        minijogoRecordeBatido = true;
        soltarBrilhoPequeno(24);
        tocarSomFofo("tomatinho");
        if (minijogoStatusEl) {
          minijogoStatusEl.textContent = "🎉 Novo recorde da fazenda! (Sem XP, só orgulho de pausa!)";
        }
      }
    }
    atualizarPlacarMinijogo();
  }

  function criarAlimentoCobrinha(cobra, cols) {
    const livres = [];
    for (let y = 0; y < cols; y++) {
      for (let x = 0; x < cols; x++) {
        if (!cobra.some((seg) => seg.x === x && seg.y === y)) {
          livres.push({ x, y });
        }
      }
    }
    if (livres.length === 0) return { x: 0, y: 0 };
    return livres[Math.floor(Math.random() * livres.length)];
  }

  function iniciarCobrinhaHorta() {
    const cols = 15;
    const cobra = [
      { x: 7, y: 7 },
      { x: 6, y: 7 },
      { x: 5, y: 7 }
    ];
    minijogoEstado = {
      tipo: "cobrinha",
      cols,
      cobra,
      dir: { x: 1, y: 0 },
      filaDirs: [],
      fruta: criarAlimentoCobrinha(cobra, cols)
    };
    if (minijogoStatusEl) {
      minijogoStatusEl.textContent = "Use as setas ou clique na horta para colher os tomatinhos!";
    }
    desenharCobrinhaHorta();
    minijogoTimerId = setInterval(() => {
      if (minijogoGameOver || !minijogoEstado || minijogoEstado.tipo !== "cobrinha") return;
      const st = minijogoEstado;
      if (st.filaDirs.length > 0) {
        st.dir = st.filaDirs.shift();
      }
      const cabeca = st.cobra[0];
      const nx = cabeca.x + st.dir.x;
      const ny = cabeca.y + st.dir.y;

      if (nx < 0 || ny < 0 || nx >= st.cols || ny >= st.cols || st.cobra.some((s) => s.x === nx && s.y === ny)) {
        minijogoGameOver = true;
        if (minijogoStatusEl) {
          minijogoStatusEl.textContent = "Fim de rodada na horta! Clique em ↻ Jogar de novo ou aperte Espaço.";
        }
        desenharCobrinhaHorta();
        return;
      }

      st.cobra.unshift({ x: nx, y: ny });
      if (nx === st.fruta.x && ny === st.fruta.y) {
        tocarSomFofo("palavras");
        definirPontosMinijogo(minijogoPontos + 10);
        st.fruta = criarAlimentoCobrinha(st.cobra, st.cols);
      } else {
        st.cobra.pop();
      }
      desenharCobrinhaHorta();
    }, 150);
  }

  function desenharCobrinhaHorta() {
    if (!minijogoCtx || !minijogoEstado || minijogoEstado.tipo !== "cobrinha") return;
    const ctx = minijogoCtx;
    const st = minijogoEstado;
    const tile = 20;

    for (let y = 0; y < st.cols; y++) {
      for (let x = 0; x < st.cols; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#EFE3C6" : "#E5D5B2";
        ctx.fillRect(x * tile, y * tile, tile, tile);
      }
    }

    // Tomatinho em pixel art simples
    const fx = st.fruta.x * tile;
    const fy = st.fruta.y * tile;
    ctx.fillStyle = "#3E7A38";
    ctx.fillRect(fx + 8, fy + 2, 4, 3);
    ctx.fillStyle = "#E64539";
    ctx.fillRect(fx + 4, fy + 5, 12, 11);
    ctx.fillStyle = "#FFB8AD";
    ctx.fillRect(fx + 6, fy + 7, 3, 3);

    st.cobra.forEach((seg, idx) => {
      const sx = seg.x * tile;
      const sy = seg.y * tile;
      ctx.fillStyle = idx === 0 ? "#3B6938" : "#5C8D58";
      ctx.fillRect(sx + 2, sy + 2, tile - 4, tile - 4);
      if (idx === 0) {
        ctx.fillStyle = "#FFFDF5";
        ctx.fillRect(sx + 5, sy + 6, 3, 3);
        ctx.fillRect(sx + 12, sy + 6, 3, 3);
        ctx.fillStyle = "#241917";
        ctx.fillRect(sx + 6, sy + 7, 2, 2);
        ctx.fillRect(sx + 13, sy + 7, 2, 2);
      }
    });
  }

  const PECAS_CELEIRO = [
    { cor: "#D4A243", matriz: [[1, 1, 1, 1]] },
    { cor: "#5C8D58", matriz: [[1, 1], [1, 1]] },
    { cor: "#C96D4B", matriz: [[0, 1, 0], [1, 1, 1]] },
    { cor: "#5B8BA8", matriz: [[1, 0, 0], [1, 1, 1]] },
    { cor: "#8B5D7A", matriz: [[0, 0, 1], [1, 1, 1]] },
    { cor: "#D97F98", matriz: [[0, 1, 1], [1, 1, 0]] },
    { cor: "#8A5C3A", matriz: [[1, 1, 0], [0, 1, 1]] }
  ];

  function criarPecaCeleiro() {
    const modelo = PECAS_CELEIRO[Math.floor(Math.random() * PECAS_CELEIRO.length)];
    const matriz = modelo.matriz.map((linha) => [...linha]);
    return {
      cor: modelo.cor,
      matriz,
      x: Math.floor((10 - matriz[0].length) / 2),
      y: 0
    };
  }

  function colideBlocosCeleiro(grade, matriz, px, py) {
    for (let y = 0; y < matriz.length; y++) {
      for (let x = 0; x < matriz[y].length; x++) {
        if (!matriz[y][x]) continue;
        const gx = px + x;
        const gy = py + y;
        if (gx < 0 || gx >= 10 || gy >= 15) return true;
        if (gy >= 0 && grade[gy][gx]) return true;
      }
    }
    return false;
  }

  function rotacionarMatrizCeleiro(m) {
    const linhas = m.length;
    const cols = m[0].length;
    const nova = Array.from({ length: cols }, () => Array(linhas).fill(0));
    for (let y = 0; y < linhas; y++) {
      for (let x = 0; x < cols; x++) {
        nova[x][linhas - 1 - y] = m[y][x];
      }
    }
    return nova;
  }

  function passoBlocosCeleiro(descerManual = false) {
    if (minijogoGameOver || !minijogoEstado || minijogoEstado.tipo !== "blocos") return;
    const st = minijogoEstado;
    if (!colideBlocosCeleiro(st.grade, st.peca.matriz, st.peca.x, st.peca.y + 1)) {
      st.peca.y += 1;
      if (descerManual) definirPontosMinijogo(minijogoPontos + 1);
      desenharBlocosCeleiro();
      return;
    }

    st.peca.matriz.forEach((linha, y) => {
      linha.forEach((v, x) => {
        if (v && st.peca.y + y >= 0 && st.peca.y + y < 15) {
          st.grade[st.peca.y + y][st.peca.x + x] = st.peca.cor;
        }
      });
    });

    let linhasFeitas = 0;
    for (let y = 14; y >= 0; y--) {
      if (st.grade[y].every(Boolean)) {
        st.grade.splice(y, 1);
        st.grade.unshift(Array(10).fill(null));
        linhasFeitas += 1;
        y += 1;
      }
    }

    if (linhasFeitas > 0) {
      tocarSomFofo("tomatinho");
      definirPontosMinijogo(minijogoPontos + linhasFeitas * 50);
    } else {
      tocarSomFofo("palavras");
      definirPontosMinijogo(minijogoPontos + 2);
    }

    st.peca = criarPecaCeleiro();
    if (colideBlocosCeleiro(st.grade, st.peca.matriz, st.peca.x, st.peca.y)) {
      minijogoGameOver = true;
      if (minijogoStatusEl) {
        minijogoStatusEl.textContent = "Celeiro lotado! Clique em ↻ Jogar de novo ou aperte Espaço.";
      }
    }
    desenharBlocosCeleiro();
  }

  function iniciarBlocosCeleiro() {
    minijogoEstado = {
      tipo: "blocos",
      grade: Array.from({ length: 15 }, () => Array(10).fill(null)),
      peca: criarPecaCeleiro()
    };
    if (minijogoStatusEl) {
      minijogoStatusEl.textContent = "Encaixe os blocos no celeiro! Seta ⬆️ gira a peça e ⬇️ acelera.";
    }
    desenharBlocosCeleiro();
    minijogoTimerId = setInterval(() => passoBlocosCeleiro(false), 430);
  }

  function desenharBlocosCeleiro() {
    if (!minijogoCtx || !minijogoEstado || minijogoEstado.tipo !== "blocos") return;
    const ctx = minijogoCtx;
    const st = minijogoEstado;
    const cell = 20;
    const ox = 50;

    ctx.fillStyle = "#5B3E28";
    ctx.fillRect(0, 0, 300, 300);
    ctx.fillStyle = "#F5EAD1";
    ctx.fillRect(ox, 0, 200, 300);

    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 10; x++) {
        ctx.strokeStyle = "#E4D3AF";
        ctx.strokeRect(ox + x * cell, y * cell, cell, cell);
        if (st.grade[y][x]) {
          ctx.fillStyle = st.grade[y][x];
          ctx.fillRect(ox + x * cell + 1, y * cell + 1, cell - 2, cell - 2);
        }
      }
    }

    if (st.peca) {
      ctx.fillStyle = st.peca.cor;
      st.peca.matriz.forEach((linha, y) => {
        linha.forEach((v, x) => {
          if (v) {
            ctx.fillRect(ox + (st.peca.x + x) * cell + 1, (st.peca.y + y) * cell + 1, cell - 2, cell - 2);
          }
        });
      });
    }
  }

  const OBSTACULOS_PROCRAS = [
    { tipo: "cama", w: 36, h: 22 },
    { tipo: "celular", w: 18, h: 28 },
    { tipo: "computador", w: 30, h: 26 },
    { tipo: "sofa", w: 36, h: 24 },
    { tipo: "louca", w: 24, h: 30 }
  ];

  function iniciarFugaProcrastinacao() {
    minijogoEstado = {
      tipo: "fuga",
      y: 192,
      vy: 0,
      noChao: true,
      ticks: 0,
      proximoSpawn: 42,
      obstaculos: []
    };
    if (minijogoStatusEl) {
      minijogoStatusEl.textContent = "Pule as distrações com ⬆️, Espaço ou clicando na tela!";
    }
    const loop = () => {
      if (!minijogoEstado || minijogoEstado.tipo !== "fuga" || modalMinijogos.hidden) return;
      const st = minijogoEstado;
      if (!minijogoGameOver) {
        st.ticks += 1;
        if (st.ticks % 10 === 0) definirPontosMinijogo(minijogoPontos + 1);

        st.vy += 0.56;
        st.y += st.vy;
        if (st.y >= 192) {
          st.y = 192;
          st.vy = 0;
          st.noChao = true;
        }

        st.proximoSpawn -= 1;
        if (st.proximoSpawn <= 0) {
          const modelo = OBSTACULOS_PROCRAS[Math.floor(Math.random() * OBSTACULOS_PROCRAS.length)];
          st.obstaculos.push({
            x: 306,
            w: modelo.w,
            h: modelo.h,
            tipo: modelo.tipo,
            passado: false
          });
          st.proximoSpawn = 58 + Math.floor(Math.random() * 44);
        }

        const vel = Math.min(5.6, 3.4 + st.ticks * 0.0012);
        for (let i = st.obstaculos.length - 1; i >= 0; i--) {
          const obs = st.obstaculos[i];
          obs.x -= vel;
          const obsTopo = 224 - obs.h;
          const bX = 42;
          const bW = 20;
          const bH = 32;
          if (bX < obs.x + obs.w - 3 && bX + bW > obs.x + 3 && st.y + bH > obsTopo + 3) {
            minijogoGameOver = true;
            if (minijogoStatusEl) {
              minijogoStatusEl.textContent = "A distração encostou em você! Clique em ↻ Jogar de novo ou aperte Espaço.";
            }
          } else if (!obs.passado && obs.x + obs.w < bX) {
            obs.passado = true;
            definirPontosMinijogo(minijogoPontos + 15);
          }
          if (obs.x + obs.w < -40) {
            st.obstaculos.splice(i, 1);
          }
        }
      }
      desenharFugaProcrastinacao();
      if (!minijogoGameOver) {
        minijogoFrameId = requestAnimationFrame(loop);
      }
    };
    minijogoFrameId = requestAnimationFrame(loop);
  }

  function desenharObstaculoPixel(ctx, obs) {
    const x = Math.round(obs.x);
    const y = 224 - obs.h;

    if (obs.tipo === "cama") {
      // Cama fofinha com cabeceira, travesseiro e cobertor rosa
      ctx.fillStyle = "#6C442B";
      ctx.fillRect(x, y, 5, 20);
      ctx.fillRect(x + 32, y + 6, 4, 14);
      ctx.fillRect(x + 2, y + 18, 4, 4);
      ctx.fillRect(x + 31, y + 18, 4, 4);
      ctx.fillStyle = "#8A5C3A";
      ctx.fillRect(x + 4, y + 13, 30, 5);
      ctx.fillStyle = "#FFFDF5";
      ctx.fillRect(x + 5, y + 8, 27, 6);
      ctx.fillStyle = "#F5E1B8";
      ctx.fillRect(x + 6, y + 5, 7, 4);
      ctx.fillStyle = "#D97F98";
      ctx.fillRect(x + 14, y + 7, 18, 8);
      ctx.fillStyle = "#B85C76";
      ctx.fillRect(x + 14, y + 12, 18, 3);
    } else if (obs.tipo === "celular") {
      // Celular em pé com tela acesa e bolinha vermelha de notificação
      ctx.fillStyle = "#2E333D";
      ctx.fillRect(x, y, 18, 28);
      ctx.fillStyle = "#87B8D4";
      ctx.fillRect(x + 2, y + 3, 14, 20);
      ctx.fillStyle = "#FFFDF5";
      ctx.fillRect(x + 4, y + 6, 10, 3);
      ctx.fillRect(x + 4, y + 11, 8, 3);
      ctx.fillRect(x + 4, y + 16, 10, 3);
      ctx.fillStyle = "#E64539";
      ctx.fillRect(x + 12, y + 2, 5, 5);
      ctx.fillStyle = "#AAB2BD";
      ctx.fillRect(x + 7, y + 25, 4, 2);
    } else if (obs.tipo === "computador") {
      // Computador de tela brilhante tentando distrair com vídeos/abas
      ctx.fillStyle = "#D9CEB4";
      ctx.fillRect(x + 2, y, 26, 18);
      ctx.fillStyle = "#3E6B89";
      ctx.fillRect(x + 5, y + 3, 20, 12);
      ctx.fillStyle = "#F4D06F";
      ctx.fillRect(x + 7, y + 5, 6, 4);
      ctx.fillStyle = "#D97F98";
      ctx.fillRect(x + 15, y + 5, 8, 4);
      ctx.fillStyle = "#87B8D4";
      ctx.fillRect(x + 7, y + 10, 16, 3);
      ctx.fillStyle = "#7C5132";
      ctx.fillRect(x + 11, y + 18, 8, 4);
      ctx.fillStyle = "#6C442B";
      ctx.fillRect(x, y + 22, 30, 4);
    } else if (obs.tipo === "sofa") {
      // Sofá quentinho com almofadas
      ctx.fillStyle = "#A85237";
      ctx.fillRect(x + 2, y, 32, 12);
      ctx.fillStyle = "#C96D4B";
      ctx.fillRect(x, y + 6, 5, 15);
      ctx.fillRect(x + 31, y + 6, 5, 15);
      ctx.fillRect(x + 4, y + 12, 28, 9);
      ctx.fillStyle = "#E8A65D";
      ctx.fillRect(x + 6, y + 10, 11, 5);
      ctx.fillRect(x + 19, y + 10, 11, 5);
      ctx.fillStyle = "#5C8D58";
      ctx.fillRect(x + 22, y + 9, 8, 9);
      ctx.fillStyle = "#5B3E28";
      ctx.fillRect(x + 3, y + 21, 4, 3);
      ctx.fillRect(x + 29, y + 21, 4, 3);
    } else {
      // Pilha de louça na pia (pratos e caneca em cima)
      ctx.fillStyle = "#D9CEB4";
      ctx.fillRect(x + 2, y + 24, 20, 6);
      ctx.fillStyle = "#FFFDF5";
      ctx.fillRect(x + 1, y + 20, 22, 4);
      ctx.fillStyle = "#87B8D4";
      ctx.fillRect(x + 3, y + 16, 18, 4);
      ctx.fillStyle = "#FFFDF5";
      ctx.fillRect(x + 4, y + 12, 16, 4);
      ctx.fillStyle = "#D4A243";
      ctx.fillRect(x + 7, y + 4, 10, 8);
      ctx.fillRect(x + 17, y + 6, 3, 4);
      ctx.fillStyle = "#E8F7FF";
      ctx.fillRect(x + 9, y, 4, 4);
      ctx.fillRect(x + 15, y + 1, 3, 3);
    }
  }

  function desenharFugaProcrastinacao() {
    if (!minijogoCtx || !minijogoEstado || minijogoEstado.tipo !== "fuga") return;
    const ctx = minijogoCtx;
    const st = minijogoEstado;

    ctx.fillStyle = "#FAF0D8";
    ctx.fillRect(0, 0, 300, 224);
    ctx.fillStyle = "#FFF9EC";
    ctx.fillRect(40, 42, 48, 16);
    ctx.fillRect(195, 62, 54, 16);

    ctx.fillStyle = "#76B865";
    ctx.fillRect(0, 224, 300, 14);
    ctx.fillStyle = "#C7AA7F";
    ctx.fillRect(0, 238, 300, 62);

    // Boneco escriba em pixel art
    const bx = 42;
    const by = Math.round(st.y);
    ctx.fillStyle = "#2E2019";
    ctx.fillRect(bx + 3, by, 14, 6);
    ctx.fillStyle = "#F2C9A5";
    ctx.fillRect(bx + 4, by + 6, 12, 8);
    ctx.fillStyle = "#5C8D58";
    ctx.fillRect(bx + 2, by + 14, 16, 12);
    ctx.fillStyle = "#3B2A1E";
    ctx.fillRect(bx + 4, by + 26, 4, 6);
    ctx.fillRect(bx + 12, by + 26, 4, 6);

    // Obstáculos de procrastinação desenhados em pixel art (cama, celular, computador, sofá, louça)
    st.obstaculos.forEach((obs) => desenharObstaculoPixel(ctx, obs));
  }

  function iniciarPartidaMinijogo(tipo) {
    pararLoopsMinijogo();
    minijogoAtivo = ["cobrinha", "blocos", "fuga"].includes(tipo) ? tipo : "cobrinha";
    minijogoPontos = 0;
    minijogoGameOver = false;
    minijogoRecordeBatido = false;

    document.querySelectorAll("[data-minijogo-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.minijogoTab === minijogoAtivo);
    });
    atualizarPlacarMinijogo();

    if (minijogoAtivo === "cobrinha") {
      iniciarCobrinhaHorta();
    } else if (minijogoAtivo === "blocos") {
      iniciarBlocosCeleiro();
    } else {
      iniciarFugaProcrastinacao();
    }
  }

  function aplicarDirecaoMinijogo(dir) {
    if (!modalMinijogos || modalMinijogos.hidden || !minijogoEstado) return;
    if (minijogoGameOver) {
      if (dir === "up") iniciarPartidaMinijogo(minijogoAtivo);
      return;
    }

    if (minijogoEstado.tipo === "cobrinha") {
      const mapa = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
      };
      const nova = mapa[dir];
      if (!nova) return;
      const ultima =
        minijogoEstado.filaDirs.length > 0
          ? minijogoEstado.filaDirs[minijogoEstado.filaDirs.length - 1]
          : minijogoEstado.dir;
      if (ultima.x + nova.x === 0 && ultima.y + nova.y === 0) return;
      if (minijogoEstado.filaDirs.length < 2) {
        minijogoEstado.filaDirs.push(nova);
      }
      return;
    }

    if (minijogoEstado.tipo === "blocos") {
      const st = minijogoEstado;
      if (dir === "left" && !colideBlocosCeleiro(st.grade, st.peca.matriz, st.peca.x - 1, st.peca.y)) {
        st.peca.x -= 1;
        desenharBlocosCeleiro();
      } else if (dir === "right" && !colideBlocosCeleiro(st.grade, st.peca.matriz, st.peca.x + 1, st.peca.y)) {
        st.peca.x += 1;
        desenharBlocosCeleiro();
      } else if (dir === "down") {
        passoBlocosCeleiro(true);
      } else if (dir === "up") {
        const rot = rotacionarMatrizCeleiro(st.peca.matriz);
        for (const chuteX of [0, -1, 1, -2, 2]) {
          if (!colideBlocosCeleiro(st.grade, rot, st.peca.x + chuteX, st.peca.y)) {
            st.peca.matriz = rot;
            st.peca.x += chuteX;
            desenharBlocosCeleiro();
            break;
          }
        }
      }
      return;
    }

    if (minijogoEstado.tipo === "fuga" && dir === "up") {
      if (minijogoEstado.noChao) {
        minijogoEstado.vy = -10.2;
        minijogoEstado.noChao = false;
        tocarSomFofo("palavras");
      }
    }
  }

  function abrirModalMinijogos() {
    if (!modalMinijogos || pomoModo !== "pausa") return;
    modalMinijogos.hidden = false;
    iniciarPartidaMinijogo(minijogoAtivo);
  }

  function fecharModalMinijogos() {
    pararLoopsMinijogo();
    minijogoEstado = null;
    if (modalMinijogos) modalMinijogos.hidden = true;
  }

  function atualizarEstadoMascotePeloPomodoro() {
    if (!modalConquista.hidden) return;
    if (pomoRodando) {
      setMascoteEstado(pomoModo === "foco" ? "foco" : "pausa");
    } else if (pomoModo === "pausa") {
      setMascoteEstado("pausa");
    } else {
      setMascoteEstado("normal");
    }
  }

  function formatarRelogio(segundos) {
    const s = Math.max(0, Math.ceil(segundos));
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const r = String(s % 60).padStart(2, "0");
    return `${m}:${r}`;
  }

  function renderPomodoro() {
    pomoDisplay.textContent = formatarRelogio(pomoRestanteSeg);
    btnPomoFoco.classList.toggle("is-active", pomoModo === "foco");
    btnPomoPausa.classList.toggle("is-active", pomoModo === "pausa");
    btnPomoToggle.textContent = pomoRodando ? "⏸ Pausar" : "▶ Começar";
    if (btnPomoBrincar) btnPomoBrincar.hidden = pomoModo !== "pausa";
    if (btnPomoPular) btnPomoPular.hidden = pomoModo !== "pausa";
    if (pomoProntoBadge) {
      pomoProntoBadge.hidden = !(pomoProntoProFoco && pomoModo === "foco" && !pomoRodando);
    }
    if (minijogoTempoPausaEl) {
      minijogoTempoPausaEl.textContent = `☕ Pausa: ${formatarRelogio(pomoRestanteSeg)}`;
    }
    if (pomoModo !== "pausa" && modalMinijogos && !modalMinijogos.hidden) {
      fecharModalMinijogos();
    }

    const reg = garantirDiaAtualizado();
    const qtd = reg.pomodorosFeitos;
    document.getElementById("pomo-hoje-badge").textContent =
      qtd === 1 ? "1 pomodoro hoje" : `${qtd} pomodoros hoje`;

    if (pomoRodando) {
      document.title = `${formatarRelogio(pomoRestanteSeg)} • Central de Livrinhos`;
    } else {
      document.title = "Central de Livrinhos ⚔️";
    }

    renderControlesSomAmbiente();
    renderJanelinhaCompacta();
  }

  function trocarModoPomodoro(novoModo, prontoProFoco = false) {
    if (novoModo !== "pausa" && modalMinijogos && !modalMinijogos.hidden) {
      fecharModalMinijogos();
    }
    pomoRodando = false;
    clearInterval(pomoIntervalId);
    pomoModo = novoModo;
    pomoProntoProFoco = Boolean(prontoProFoco && novoModo === "foco");
    const mins =
      novoModo === "foco"
        ? Number(state.config.pomoFocoMin) || 25
        : Number(state.config.pomoPausaMin) || 5;
    pomoRestanteSeg = mins * 60;
    renderPomodoro();
    atualizarEstadoMascotePeloPomodoro();
  }

  function pularPausaPomodoro() {
    if (pomoModo !== "pausa") return;
    fecharModalMinijogos();
    trocarModoPomodoro("foco", true);
    setMascoteEstado("normal", "Pausa encerrada! Relógio parado e pronto pro próximo foco quando você quiser.");
  }

  function finalizarCicloPomodoro() {
    pomoRodando = false;
    clearInterval(pomoIntervalId);

    if (pomoModo === "foco") {
      const reg = garantirDiaAtualizado();
      reg.pomodorosFeitos += 1;

      const quest = getQuestEmFoco();
      const questVaiConcluirAgora =
        quest && !quest.concluida && quest.pomodorosFeitos + 1 >= quest.pomodorosTotal;

      if (!questVaiConcluirAgora) {
        state.xpTotal += 15;
        reg.xpDia += 15;
        salvarEstado();
        soltarBrilhoPequeno(28);
        tocarSomFofo("pomodoro");
      } else {
        salvarEstado();
      }

      if (quest && !quest.concluida) {
        acenderTomatinhoQuest(quest.id, { semEfeito: !questVaiConcluirAgora });
      }

      verificarMedalhasAutomaticas();
      trocarModoPomodoro("pausa", false);
      setMascoteEstado("pausa");
    } else {
      const estavaJogandoNaPausa = Boolean(modalMinijogos && !modalMinijogos.hidden);
      fecharModalMinijogos();
      soltarBrilhoPequeno(20);
      tocarSomFofo("pausaFim");
      trocarModoPomodoro("foco", true);
      setMascoteEstado("normal", "Pausa acabou, a história tá esperando! Relógio parado e pronto pro próximo foco.");
      if (estavaJogandoNaPausa) {
        mostrarFeedbackMesa("Pausa acabou, a história tá esperando! O minijogo fechou sozinho pro livro voltar à mesa.", "info");
      }
    }
    atualizarTopbar();
    renderPomodoro();
    renderPlacarGuilda();
  }

  function togglePomodoro() {
    if (pomoRodando) {
      pomoRestanteSeg = Math.max(0, Math.ceil((pomoFimTimestamp - Date.now()) / 1000));
      pomoRodando = false;
      clearInterval(pomoIntervalId);
      renderPomodoro();
      atualizarEstadoMascotePeloPomodoro();
      return;
    }

    if (pomoRestanteSeg <= 0) {
      trocarModoPomodoro(pomoModo);
    }

    pomoProntoProFoco = false;
    pomoRodando = true;
    pomoFimTimestamp = Date.now() + pomoRestanteSeg * 1000;
    renderPomodoro();
    atualizarEstadoMascotePeloPomodoro();

    pomoIntervalId = setInterval(() => {
      const falta = Math.ceil((pomoFimTimestamp - Date.now()) / 1000);
      if (falta <= 0) {
        pomoRestanteSeg = 0;
        finalizarCicloPomodoro();
      } else {
        pomoRestanteSeg = falta;
        renderPomodoro();
      }
    }, 250);
  }

  btnPomoToggle.addEventListener("click", togglePomodoro);
  btnPomoReset.addEventListener("click", () => trocarModoPomodoro(pomoModo));
  if (btnPomoBrincar) btnPomoBrincar.addEventListener("click", abrirModalMinijogos);
  if (btnPomoPular) btnPomoPular.addEventListener("click", pularPausaPomodoro);
  btnPomoFoco.addEventListener("click", () => trocarModoPomodoro("foco"));
  btnPomoPausa.addEventListener("click", () => trocarModoPomodoro("pausa"));

  if (modalMinijogos) {
    document.getElementById("btn-fechar-minijogos")?.addEventListener("click", fecharModalMinijogos);
    document.getElementById("btn-fechar-minijogos-x")?.addEventListener("click", fecharModalMinijogos);
    modalMinijogos.addEventListener("click", (e) => {
      if (e.target === modalMinijogos) fecharModalMinijogos();
    });
    document.getElementById("btn-minijogo-pular-pausa")?.addEventListener("click", pularPausaPomodoro);
    document.getElementById("btn-minijogo-reiniciar")?.addEventListener("click", () => {
      iniciarPartidaMinijogo(minijogoAtivo);
    });
    document.querySelectorAll("[data-minijogo-tab]").forEach((btn) => {
      btn.addEventListener("click", () => iniciarPartidaMinijogo(btn.dataset.minijogoTab));
    });
    document.querySelectorAll("[data-minijogo-dir]").forEach((btn) => {
      btn.addEventListener("click", () => aplicarDirecaoMinijogo(btn.dataset.minijogoDir));
    });
  }

  if (minijogoCanvas) {
    minijogoCanvas.addEventListener("click", (e) => {
      if (!minijogoEstado) return;
      if (minijogoGameOver) {
        iniciarPartidaMinijogo(minijogoAtivo);
        return;
      }
      const rect = minijogoCanvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * minijogoCanvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * minijogoCanvas.height;

      if (minijogoEstado.tipo === "cobrinha") {
        const cabeca = minijogoEstado.cobra[0];
        const dx = x - (cabeca.x * 20 + 10);
        const dy = y - (cabeca.y * 20 + 10);
        if (Math.abs(dx) > Math.abs(dy)) {
          aplicarDirecaoMinijogo(dx >= 0 ? "right" : "left");
        } else {
          aplicarDirecaoMinijogo(dy >= 0 ? "down" : "up");
        }
      } else if (minijogoEstado.tipo === "blocos") {
        if (y > 240) aplicarDirecaoMinijogo("down");
        else if (x < 105) aplicarDirecaoMinijogo("left");
        else if (x > 195) aplicarDirecaoMinijogo("right");
        else aplicarDirecaoMinijogo("up");
      } else {
        aplicarDirecaoMinijogo("up");
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!modalMinijogos || modalMinijogos.hidden) return;
    const mapaTeclas = {
      ArrowUp: "up",
      KeyW: "up",
      ArrowDown: "down",
      KeyS: "down",
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right"
    };
    if (e.code === "Space") {
      e.preventDefault();
      if (minijogoGameOver) iniciarPartidaMinijogo(minijogoAtivo);
      else aplicarDirecaoMinijogo("up");
      return;
    }
    const dir = mapaTeclas[e.code];
    if (dir) {
      e.preventDefault();
      aplicarDirecaoMinijogo(dir);
    }
  });

  // ---------- Renderização Principal ----------
  function renderMesa() {
    const reg = garantirDiaAtualizado();
    const livroAtivo = getLivroAtivo();

    const selectMesa = document.getElementById("select-livro-mesa");
    selectMesa.innerHTML = "";
    state.livros.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = l.nome;
      if (l.id === livroAtivo.id) opt.selected = true;
      selectMesa.appendChild(opt);
    });
    document.getElementById("mesa-livro-cor").style.backgroundColor = livroAtivo.cor || "#5C8D58";

    const modoHoje = ["escrita", "misto", "revisao"].includes(state.config.modoHoje)
      ? state.config.modoHoje
      : "escrita";
    const emRevisaoPura = modoHoje === "revisao";
    const emMisto = modoHoje === "misto";
    document.getElementById("btn-modo-escrita").classList.toggle("is-active", modoHoje === "escrita");
    const btnModoMisto = document.getElementById("btn-modo-misto");
    if (btnModoMisto) btnModoMisto.classList.toggle("is-active", emMisto);
    document.getElementById("btn-modo-revisao").classList.toggle("is-active", emRevisaoPura);
    document.getElementById("painel-escrita").hidden = emRevisaoPura;
    document.getElementById("painel-revisao").hidden = !emRevisaoPura;
    const mistoBox = document.getElementById("misto-revisao-box");
    if (mistoBox) mistoBox.hidden = !emMisto;

    recalcularSaldoDia(reg);
    document.getElementById("num-palavras-hoje").textContent = formatarNumero(reg.palavrasEscritas);
    const sinal = reg.saldoDia >= 0 ? "+" : "";
    document.getElementById("texto-saldo-hoje").textContent =
      `Saldo líquido de hoje: ${sinal}${formatarNumero(reg.saldoDia)} palavras (total do livro: ${formatarNumero(livroAtivo.palavrasTotais)})`;

    const metaPalavras = Math.max(1, Number(state.config.metaDiariaPalavras) || 1000);
    const minPalavras = Math.max(1, Number(state.config.metaMinimaPalavras) || 200);
    const pctEscrita = Math.min(100, Math.round((reg.palavrasEscritas / metaPalavras) * 100));
    const posMinEscrita = Math.min(100, Math.round((minPalavras / metaPalavras) * 100));

    document.getElementById("label-progresso-escrita").textContent =
      `${formatarNumero(reg.palavrasEscritas)} / ${formatarNumero(metaPalavras)} palavras`;
    document.getElementById("badge-minima-escrita").textContent =
      `🌱 Mínima (dia ruim): ${formatarNumero(minPalavras)}`;
    document.getElementById("barra-escrita").style.width = `${pctEscrita}%`;
    document.getElementById("marcador-minima-escrita").style.left = `${posMinEscrita}%`;

    document.getElementById("input-meta-palavras").value = metaPalavras;
    document.getElementById("input-meta-minima-palavras").value = minPalavras;

    document.getElementById("num-minutos-revisao").textContent = formatarNumero(reg.minutosRevisados);
    const metaRev = Math.max(1, Number(state.config.metaDiariaMinutosRevisao) || 45);
    const minRev = Math.max(1, Number(state.config.metaMinimaMinutosRevisao) || 15);
    const pctRev = Math.min(100, Math.round((reg.minutosRevisados / metaRev) * 100));
    const posMinRev = Math.min(100, Math.round((minRev / metaRev) * 100));

    document.getElementById("label-progresso-revisao").textContent =
      `${formatarNumero(reg.minutosRevisados)} / ${formatarNumero(metaRev)} minutos`;
    const numRevMisto = document.getElementById("num-minutos-revisao-misto");
    const labelRevMisto = document.getElementById("label-progresso-revisao-misto");
    if (numRevMisto) numRevMisto.textContent = `${formatarNumero(reg.minutosRevisados)} min`;
    if (labelRevMisto) {
      labelRevMisto.textContent = `(meta: ${formatarNumero(reg.minutosRevisados)} / ${formatarNumero(metaRev)} min • mínima: ${formatarNumero(minRev)} min)`;
    }
    document.getElementById("badge-minima-revisao").textContent =
      `🌱 Mínima (dia ruim): ${formatarNumero(minRev)} min`;
    document.getElementById("barra-revisao").style.width = `${pctRev}%`;
    document.getElementById("marcador-minima-revisao").style.left = `${posMinRev}%`;

    document.getElementById("input-meta-revisao").value = metaRev;
    document.getElementById("input-meta-minima-revisao").value = minRev;
    renderControlesSomAmbiente();
    renderJanelinhaCompacta();
  }

  function calcularContagemRegressiva(dataISO) {
    const hoje = new Date(`${hojeISO()}T00:00:00`);
    const alvo = new Date(`${dataISO}T00:00:00`);
    const diffDias = Math.round((alvo - hoje) / 86400000);

    if (diffDias > 1) return { texto: `Faltam ${diffDias} dias`, classe: "" };
    if (diffDias === 1) return { texto: "É amanhã! Café preparado.", classe: "" };
    if (diffDias === 0) return { texto: "É hoje!! Hora do duelo final.", classe: "is-hoje" };
    const atraso = Math.abs(diffDias);
    return {
      texto: `Passou há ${atraso} ${atraso === 1 ? "dia" : "dias"} (o tempo voa, ajusta a rota)`,
      classe: "is-passado"
    };
  }

  function renderPrazos() {
    const selectPrazoLivro = document.getElementById("prazo-livro");
    const valorAtual = selectPrazoLivro.value;
    selectPrazoLivro.innerHTML = "";
    state.livros.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = l.nome;
      selectPrazoLivro.appendChild(opt);
    });
    const optGeral = document.createElement("option");
    optGeral.value = "__geral__";
    optGeral.textContent = "Outro projeto / geral";
    selectPrazoLivro.appendChild(optGeral);
    if (valorAtual) selectPrazoLivro.value = valorAtual;

    const lista = document.getElementById("lista-prazos");
    lista.innerHTML = "";

    if (state.prazos.length === 0) {
      lista.innerHTML = `<div class="empty-state">Quadro vazio. Nenhuma data fazendo careta pra você hoje. 🌿</div>`;
      return;
    }

    const ordenados = [...state.prazos].sort((a, b) => a.data.localeCompare(b.data));
    ordenados.forEach((p) => {
      const livro = state.livros.find((l) => l.id === p.livroId);
      const nomeLivro = livro ? livro.nome : "Projeto geral";
      const cor = livro ? livro.cor : "#8B5D7A";
      const cd = calcularContagemRegressiva(p.data);

      const item = document.createElement("div");
      item.className = "prazo-item";
      item.style.borderLeftColor = cor;

      const info = document.createElement("div");
      info.className = "prazo-info";

      const tag = document.createElement("span");
      tag.className = "prazo-livro-tag";
      tag.textContent = `📖 ${nomeLivro}`;

      const titulo = document.createElement("span");
      titulo.className = "prazo-titulo";
      titulo.textContent = p.titulo;

      const linha = document.createElement("div");
      linha.className = "prazo-data-linha";

      const dataEl = document.createElement("span");
      dataEl.className = "prazo-data";
      dataEl.textContent = formatarDataBR(p.data);

      const badge = document.createElement("span");
      badge.className = `prazo-countdown ${cd.classe}`;
      badge.textContent = cd.texto;

      linha.append(dataEl, badge);
      info.append(tag, titulo, linha);

      const acoes = document.createElement("div");
      acoes.className = "prazo-actions";

      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn btn-secondary btn-small";
      btnEdit.textContent = "✏️";
      btnEdit.title = "Editar prazo";
      btnEdit.addEventListener("click", () => iniciarEdicaoPrazo(p.id));

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn-danger btn-small";
      btnDel.textContent = "✕";
      btnDel.title = "Remover prazo";
      btnDel.addEventListener("click", () => removerPrazo(p.id));

      acoes.append(btnEdit, btnDel);
      item.append(info, acoes);
      lista.appendChild(item);
    });
  }

  function renderEstante() {
    const grid = document.getElementById("grid-estante");
    grid.innerHTML = "";
    const ativoId = getLivroAtivo().id;

    state.livros.forEach((livro) => {
      const ehAtivo = livro.id === ativoId;
      const card = document.createElement("article");
      card.className = `livro-card ${ehAtivo ? "is-ativo" : ""}`;
      card.style.borderTopColor = livro.cor || "#5C8D58";

      const topo = document.createElement("div");
      topo.className = "livro-card-top";

      const nome = document.createElement("h3");
      nome.className = "livro-nome";
      nome.textContent = livro.nome;

      const status = document.createElement("span");
      status.className = "livro-status-pill";
      status.textContent = livro.status;

      topo.append(nome, status);

      const desc = document.createElement("p");
      desc.className = "livro-desc";
      desc.textContent = livro.descricao || "Sem premissa anotada ainda.";

      const meta = document.createElement("div");
      meta.className = "livro-meta-dados";
      const totalSpan = document.createElement("span");
      totalSpan.textContent = `📝 ${formatarNumero(livro.palavrasTotais)} palavras totais`;
      const arqSpan = document.createElement("span");
      const listaArq = Array.isArray(livro.arquivosMarcados) ? livro.arquivosMarcados : [];
      const listaChaves = Array.isArray(livro.palavrasChave) ? livro.palavrasChave : [];
      if (listaArq.length > 0 && listaChaves.length > 0) {
        arqSpan.textContent = `📎 Reconhece: ${listaArq.join(", ")} • chaves: "${listaChaves.join('", "')}"`;
      } else if (listaArq.length > 0) {
        arqSpan.textContent = `📎 Arquivos: ${listaArq.join(", ")}`;
      } else if (listaChaves.length > 0) {
        arqSpan.textContent = `🔎 Chaves no nome: "${listaChaves.join('", "')}"`;
      } else if (livro.arquivoContador) {
        arqSpan.textContent = `📎 Arquivo: ${livro.arquivoContador}`;
      } else {
        arqSpan.textContent = "📎 Nenhum arquivo/chave marcado ainda";
      }
      meta.append(totalSpan, arqSpan);

      const btns = document.createElement("div");
      btns.className = "livro-card-btns";

      const btnUsar = document.createElement("button");
      btnUsar.type = "button";
      btnUsar.className = ehAtivo ? "btn btn-secondary btn-small" : "btn btn-primary btn-small";
      btnUsar.textContent = ehAtivo ? "✓ Na mesa agora" : "Colocar na mesa";
      btnUsar.disabled = ehAtivo;
      btnUsar.addEventListener("click", () => {
        state.config.livroAtivoId = livro.id;
        salvarEstado();
        renderTudo();
      });

      const btnEditar = document.createElement("button");
      btnEditar.type = "button";
      btnEditar.className = "btn btn-secondary btn-small";
      btnEditar.textContent = "Editar";
      btnEditar.addEventListener("click", () => abrirModalLivro(livro.id));

      const btnExcluir = document.createElement("button");
      btnExcluir.type = "button";
      btnExcluir.className = "btn btn-danger btn-small";
      btnExcluir.textContent = "Excluir";
      btnExcluir.addEventListener("click", () => excluirLivro(livro.id));

      btns.append(btnUsar, btnEditar, btnExcluir);
      card.append(topo, desc, meta, btns);
      grid.appendChild(card);
    });
  }

  function atualizarTopbar() {
    const rpg = calcularNivelRPG(state.xpTotal);
    document.getElementById("topbar-xp").textContent =
      `🛡️ Nv ${rpg.nivel} (${rpg.titulo}) • ${formatarNumero(state.xpTotal)} XP`;

    const btnSom = document.getElementById("btn-som");
    const volumeAtual = typeof state.config.volumeSom === "number"
      ? Math.max(0, Math.min(100, Math.round(state.config.volumeSom)))
      : 80;
    const somLigado = Boolean(state.config.somAtivo) && volumeAtual > 0;
    btnSom.setAttribute("aria-pressed", String(somLigado));
    btnSom.textContent = somLigado ? "🔊 Som" : "🔇 Mudo";

    const btnSomAjustes = document.getElementById("btn-som-ajustes");
    if (btnSomAjustes) {
      btnSomAjustes.setAttribute("aria-pressed", String(somLigado));
      btnSomAjustes.textContent = somLigado ? "🔊 Som ligado" : "🔇 Som no mudo";
    }

    const inputVolume = document.getElementById("input-volume-som");
    if (inputVolume) {
      inputVolume.value = String(volumeAtual);
    }
    const labelVolume = document.getElementById("label-volume-som");
    if (labelVolume) {
      labelVolume.textContent = somLigado ? `${volumeAtual}%` : "mudo";
    }

    const resumoPerfil = document.getElementById("resumo-perfil-ajustes");
    if (resumoPerfil) {
      const autora = (state.config.nomeAutora || "").trim() || "Sem nome definido";
      const livro = getLivroAtivo();
      const onde = formatarEditoresEscrita(state.config.editoresEscrita);
      resumoPerfil.textContent =
        `Autora: ${autora} • Livro em foco: ${livro.nome} • Onde escreve: ${onde} • Meta diária: ${formatarNumero(state.config.metaDiariaPalavras)} palavras (mínima: ${formatarNumero(state.config.metaMinimaPalavras)}).`;
    }

    const editoresAtuais = normalizarEditoresEscrita(state.config.editoresEscrita);
    document.querySelectorAll('input[name="ajustes-editor"]').forEach((chk) => {
      chk.checked = editoresAtuais.includes(chk.value);
    });

    const npc = getNpcById(state.config.npcAtivoId);
    document.getElementById("mascote-nome").textContent = getNpcRotulo(npc);
    document.getElementById("input-nome-mascote").value = getNpcCustomName(npc);
    document.getElementById("input-pomo-foco-min").value = Number(state.config.pomoFocoMin) || 25;
    document.getElementById("input-pomo-pausa-min").value = Number(state.config.pomoPausaMin) || 5;
    renderControlesSomAmbiente();
    renderJanelinhaCompacta();
  }

  function atualizarSaudacao() {
    const base = SAUDACOES_RPG[Math.floor(Math.random() * SAUDACOES_RPG.length)];
    const nome = (state.config.nomeAutora || "").trim();
    document.getElementById("saudacao-rpg").textContent = nome ? `Olá, ${nome}! ${base}` : base;
  }

  function renderTudo() {
    atualizarTopbar();
    renderSelectorNpc();
    renderMesa();
    renderDiario();
    renderPomodoro();
    renderQuestEmFoco();
    renderMissoesCompletas();
    renderPlacarGuilda();
    renderMedalhas();
    renderPersonagens();
    renderMarcos();
    renderDesejos();
    renderPrazos();
    renderEstante();
    renderQuestZero();
  }

  // ---------- Eventos da Mesa ----------
  document.getElementById("select-livro-mesa").addEventListener("change", (e) => {
    state.config.livroAtivoId = e.target.value;
    salvarEstado();
    renderTudo();
    sincronizarRegrasLivrosContadorAuto();
  });

  document.getElementById("btn-modo-escrita").addEventListener("click", () => {
    state.config.modoHoje = "escrita";
    salvarEstado();
    renderMesa();
  });

  const btnModoMistoEl = document.getElementById("btn-modo-misto");
  if (btnModoMistoEl) {
    btnModoMistoEl.addEventListener("click", () => {
      state.config.modoHoje = "misto";
      salvarEstado();
      renderMesa();
    });
  }

  document.getElementById("btn-modo-revisao").addEventListener("click", () => {
    state.config.modoHoje = "revisao";
    salvarEstado();
    renderMesa();
  });

  document.querySelectorAll("[data-add-words]").forEach((btn) => {
    btn.addEventListener("click", () => {
      somarPalavras(Number(btn.dataset.addWords));
    });
  });

  document.getElementById("form-somar-palavras").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("input-somar-palavras");
    somarPalavras(input.value);
    input.value = "";
  });

  document.getElementById("form-total-arquivo").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("input-total-arquivo");
    if (input.value === "") return;
    atualizarTotalLivro(input.value, false);
    input.value = "";
  });

  document.getElementById("btn-ajustar-partida").addEventListener("click", () => {
    const input = document.getElementById("input-total-arquivo");
    if (input.value === "") {
      mostrarFeedbackMesa("Digite primeiro o total atual do arquivo na caixinha acima.", "warn");
      return;
    }
    atualizarTotalLivro(input.value, true);
    input.value = "";
  });

  const textareaColar = document.getElementById("textarea-colar");
  const textoContagemColada = document.getElementById("texto-contagem-colada");

  function atualizarContagemColada() {
    const n = contarPalavrasTexto(textareaColar.value);
    textoContagemColada.textContent = `Texto colado tem ${formatarNumero(n)} palavras (nenhum texto é salvo!)`;
  }
  textareaColar.addEventListener("input", atualizarContagemColada);

  document.getElementById("btn-colar-somar").addEventListener("click", () => {
    const n = contarPalavrasTexto(textareaColar.value);
    textareaColar.value = "";
    atualizarContagemColada();
    somarPalavras(n);
  });

  document.getElementById("btn-colar-total").addEventListener("click", () => {
    const n = contarPalavrasTexto(textareaColar.value);
    textareaColar.value = "";
    atualizarContagemColada();
    atualizarTotalLivro(n, false);
  });

  document.getElementById("input-meta-palavras").addEventListener("change", (e) => {
    state.config.metaDiariaPalavras = Math.max(1, Number(e.target.value) || 1000);
    salvarEstado();
    renderMesa();
  });
  document.getElementById("input-meta-minima-palavras").addEventListener("change", (e) => {
    state.config.metaMinimaPalavras = Math.max(1, Number(e.target.value) || 200);
    salvarEstado();
    renderMesa();
  });
  document.getElementById("input-meta-revisao").addEventListener("change", (e) => {
    state.config.metaDiariaMinutosRevisao = Math.max(1, Number(e.target.value) || 45);
    salvarEstado();
    renderMesa();
  });
  document.getElementById("input-meta-minima-revisao").addEventListener("change", (e) => {
    state.config.metaMinimaMinutosRevisao = Math.max(1, Number(e.target.value) || 15);
    salvarEstado();
    renderMesa();
  });

  document.querySelectorAll("[data-add-min]").forEach((btn) => {
    btn.addEventListener("click", () => {
      somarMinutosRevisao(Number(btn.dataset.addMin));
    });
  });

  document.getElementById("input-pomo-foco-min").addEventListener("change", (e) => {
    state.config.pomoFocoMin = Math.max(1, Math.min(120, Number(e.target.value) || 25));
    salvarEstado();
    if (!pomoRodando && pomoModo === "foco") trocarModoPomodoro("foco");
  });
  document.getElementById("input-pomo-pausa-min").addEventListener("change", (e) => {
    state.config.pomoPausaMin = Math.max(1, Math.min(60, Number(e.target.value) || 5));
    salvarEstado();
    if (!pomoRodando && pomoModo === "pausa") trocarModoPomodoro("pausa");
  });
  document.getElementById("input-nome-mascote").addEventListener("change", (e) => {
    const npc = getNpcById(state.config.npcAtivoId);
    definirNomePersonagem(npc.id, e.target.value);
  });

  // ---------- Quadro de Avisos (Prazos) ----------
  const formPrazo = document.getElementById("form-novo-prazo");
  const btnCancelarEditPrazo = document.getElementById("btn-cancelar-edit-prazo");

  function iniciarEdicaoPrazo(id) {
    const p = state.prazos.find((x) => x.id === id);
    if (!p) return;
    document.getElementById("prazo-edit-id").value = p.id;
    document.getElementById("prazo-livro").value = p.livroId || "__geral__";
    document.getElementById("prazo-titulo").value = p.titulo;
    document.getElementById("prazo-data").value = p.data;
    document.getElementById("btn-salvar-prazo").textContent = "Salvar prazo ✓";
    btnCancelarEditPrazo.hidden = false;
  }

  function limparFormularioPrazo() {
    document.getElementById("prazo-edit-id").value = "";
    document.getElementById("prazo-titulo").value = "";
    document.getElementById("prazo-data").value = "";
    document.getElementById("btn-salvar-prazo").textContent = "+ Pregar no quadro";
    btnCancelarEditPrazo.hidden = true;
  }

  btnCancelarEditPrazo.addEventListener("click", limparFormularioPrazo);

  formPrazo.addEventListener("submit", (e) => {
    e.preventDefault();
    const editId = document.getElementById("prazo-edit-id").value;
    const livroId = document.getElementById("prazo-livro").value;
    const titulo = document.getElementById("prazo-titulo").value.trim();
    const data = document.getElementById("prazo-data").value;
    if (!titulo || !data) return;

    if (editId) {
      const idx = state.prazos.findIndex((x) => x.id === editId);
      if (idx >= 0) {
        state.prazos[idx] = { id: editId, livroId, titulo, data };
      }
    } else {
      state.prazos.push({ id: gerarId("prazo"), livroId, titulo, data });
    }

    salvarEstado();
    limparFormularioPrazo();
    renderPrazos();
    verificarMedalhasAutomaticas();
  });

  function removerPrazo(id) {
    state.prazos = state.prazos.filter((p) => p.id !== id);
    salvarEstado();
    renderPrazos();
  }

  // ---------- Estante da Guilda (Modal Livro) ----------
  const modalLivro = document.getElementById("modal-livro");
  const paletaCores = document.getElementById("livro-cores");
  let corSelecionadaLivro = CORES_ESTANTE[0].hex;

  function renderPaletaCores() {
    paletaCores.innerHTML = "";
    CORES_ESTANTE.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `color-swatch ${c.hex === corSelecionadaLivro ? "is-selected" : ""}`;
      btn.style.backgroundColor = c.hex;
      btn.title = c.nome;
      btn.setAttribute("aria-label", c.nome);
      btn.addEventListener("click", () => {
        corSelecionadaLivro = c.hex;
        renderPaletaCores();
      });
      paletaCores.appendChild(btn);
    });
  }

  function parseListaVirgula(texto) {
    const vistos = new Set();
    return String(texto || "")
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter((item) => {
        if (!item) return false;
        const chave = item.toLowerCase();
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
      });
  }

  function abrirModalLivro(id = null) {
    const ehEdicao = Boolean(id);
    const livro = ehEdicao ? state.livros.find((l) => l.id === id) : null;

    document.getElementById("modal-livro-titulo").textContent = ehEdicao ? "Editar livro" : "Novo livro na estante";
    document.getElementById("livro-edit-id").value = livro ? livro.id : "";
    document.getElementById("livro-nome").value = livro ? livro.nome : "";
    document.getElementById("livro-status").value = livro ? livro.status : "Rascunho ✍️";
    document.getElementById("livro-palavras").value = livro ? livro.palavrasTotais : 0;
    document.getElementById("livro-descricao").value = livro ? livro.descricao : "";
    document.getElementById("livro-arquivos-marcados").value =
      livro && Array.isArray(livro.arquivosMarcados)
        ? livro.arquivosMarcados.join(", ")
        : livro && livro.arquivoContador
        ? livro.arquivoContador
        : "";
    document.getElementById("livro-palavras-chave").value =
      livro && Array.isArray(livro.palavrasChave) ? livro.palavrasChave.join(", ") : "";
    document.getElementById("livro-arquivo-dica").textContent =
      "O contador confere SÓ o nome do documento aberto no Word/Pages. Se o nome não estiver na lista nem tiver essas palavras-chave, ele ignora e nem lê o texto.";

    corSelecionadaLivro = livro ? livro.cor : CORES_ESTANTE[state.livros.length % CORES_ESTANTE.length].hex;
    renderPaletaCores();
    modalLivro.hidden = false;
  }

  function fecharModalLivro() {
    modalLivro.hidden = true;
  }

  document.getElementById("btn-novo-livro").addEventListener("click", () => abrirModalLivro(null));
  document.getElementById("btn-cancelar-livro").addEventListener("click", fecharModalLivro);
  document.getElementById("btn-fechar-livro-x").addEventListener("click", fecharModalLivro);

  document.getElementById("input-arquivo-livro").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const inpMarcados = document.getElementById("livro-arquivos-marcados");
    const atuais = parseListaVirgula(inpMarcados.value);
    if (!atuais.some((x) => x.toLowerCase() === file.name.toLowerCase())) {
      atuais.push(file.name);
      inpMarcados.value = atuais.join(", ");
    }

    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "txt" || ext === "md") {
      const reader = new FileReader();
      reader.onload = () => {
        const qtd = contarPalavrasTexto(String(reader.result || ""));
        document.getElementById("livro-palavras").value = qtd;
        document.getElementById("livro-arquivo-dica").textContent =
          `Li "${file.name}" agora e contei ${formatarNumero(qtd)} palavras (sem guardar nenhum texto!). Ele já foi marcado na lista deste livro.`;
      };
      reader.readAsText(file);
    } else {
      document.getElementById("livro-arquivo-dica").textContent =
        `"${file.name}" marcado! Quando esse arquivo estiver aberto no Word/Pages, o contador já soma neste livro sozinho.`;
    }
    e.target.value = "";
  });

  document.getElementById("form-livro").addEventListener("submit", (e) => {
    e.preventDefault();
    const editId = document.getElementById("livro-edit-id").value;
    const nome = document.getElementById("livro-nome").value.trim();
    if (!nome) return;

    const status = document.getElementById("livro-status").value;
    const palavras = Math.max(0, Math.floor(Number(document.getElementById("livro-palavras").value) || 0));
    const descricao = document.getElementById("livro-descricao").value.trim();
    const arquivosMarcados = parseListaVirgula(document.getElementById("livro-arquivos-marcados").value);
    const palavrasChave = parseListaVirgula(document.getElementById("livro-palavras-chave").value);
    const resumoContador =
      arquivosMarcados[0] || (palavrasChave[0] ? `chave: ${palavrasChave[0]}` : "");
    const hoje = hojeISO();

    if (editId) {
      const livro = state.livros.find((l) => l.id === editId);
      if (livro) {
        livro.nome = nome;
        livro.cor = corSelecionadaLivro;
        livro.status = status;
        livro.descricao = descricao;
        livro.arquivosMarcados = arquivosMarcados;
        livro.palavrasChave = palavrasChave;
        livro.arquivoContador = resumoContador;
        if (!livro.contagemPorDoc || typeof livro.contagemPorDoc !== "object") {
          livro.contagemPorDoc = {};
        }
        if (livro.palavrasTotais === 0 && palavras > 0) {
          livro.palavrasInicioDia = palavras;
        }
        livro.palavrasTotais = palavras;
      }
    } else {
      const novoLivro = {
        id: gerarId("livro"),
        nome,
        cor: corSelecionadaLivro,
        status,
        descricao,
        palavrasTotais: palavras,
        palavrasInicioDia: palavras,
        dataReferenciaInicioDia: hoje,
        arquivoContador: resumoContador,
        arquivosMarcados,
        palavrasChave,
        contagemPorDoc: {},
        marcos: criarMarcosIniciais()
      };
      state.livros.push(novoLivro);
      state.config.livroAtivoId = novoLivro.id;
    }

    salvarEstado();
    fecharModalLivro();
    renderTudo();
    sincronizarRegrasLivrosContadorAuto(true);
  });

  function excluirLivro(id) {
    if (state.livros.length <= 1) {
      alert("Deixe pelo menos um livrinho na estante pra mesa não ficar vazia.");
      return;
    }
    const livro = state.livros.find((l) => l.id === id);
    if (!livro) return;
    if (!confirm(`Quer mesmo tirar "${livro.nome}" da estante?`)) return;

    state.livros = state.livros.filter((l) => l.id !== id);
    if (state.config.livroAtivoId === id) {
      state.config.livroAtivoId = state.livros[0].id;
    }
    salvarEstado();
    renderTudo();
    sincronizarRegrasLivrosContadorAuto(true);
  }

  // ---------- Som & Frases ----------
  function alternarSomGlobal() {
    const volumeAtual = typeof state.config.volumeSom === "number" ? state.config.volumeSom : 80;
    const estavaLigado = Boolean(state.config.somAtivo) && volumeAtual > 0;
    if (estavaLigado) {
      state.config.somAtivo = false;
    } else {
      state.config.somAtivo = true;
      if (volumeAtual <= 0) state.config.volumeSom = 80;
    }
    salvarEstado();
    atualizarTopbar();
    if (state.config.somAtivo) tocarSomFofo("tomatinho");
  }

  document.getElementById("btn-som").addEventListener("click", alternarSomGlobal);

  const btnSomAjustesEl = document.getElementById("btn-som-ajustes");
  if (btnSomAjustesEl) {
    btnSomAjustesEl.addEventListener("click", alternarSomGlobal);
  }

  const inputVolumeSomEl = document.getElementById("input-volume-som");
  if (inputVolumeSomEl) {
    inputVolumeSomEl.addEventListener("input", (e) => {
      const novoVol = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0)));
      state.config.volumeSom = novoVol;
      state.config.somAtivo = novoVol > 0;
      salvarEstado();
      atualizarTopbar();
    });
    inputVolumeSomEl.addEventListener("change", () => {
      if (state.config.somAtivo && state.config.volumeSom > 0) {
        tocarSomFofo("tomatinho");
      }
    });
  }

  const modalFrases = document.getElementById("modal-frases");

  function renderListaFrases() {
    const ul = document.getElementById("lista-frases");
    ul.innerHTML = "";
    state.config.frasesCarinhosas.forEach((frase, idx) => {
      const li = document.createElement("li");
      li.className = "frase-item";

      const span = document.createElement("span");
      span.textContent = frase;

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn-danger btn-small";
      btnDel.textContent = "✕";
      btnDel.title = "Apagar frase";
      btnDel.addEventListener("click", () => {
        if (state.config.frasesCarinhosas.length <= 1) {
          alert("Deixe pelo menos uma frase no pergaminho pro jogo sortear!");
          return;
        }
        state.config.frasesCarinhosas.splice(idx, 1);
        salvarEstado();
        renderListaFrases();
      });

      li.append(span, btnDel);
      ul.appendChild(li);
    });
  }

  document.getElementById("btn-frases").addEventListener("click", () => {
    renderListaFrases();
    modalFrases.hidden = false;
  });
  document.getElementById("btn-fechar-frases").addEventListener("click", () => {
    modalFrases.hidden = true;
  });
  document.getElementById("btn-fechar-frases-x").addEventListener("click", () => {
    modalFrases.hidden = true;
  });

  document.getElementById("form-nova-frase").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("input-nova-frase");
    const txt = limparTravessoesTexto(input.value);
    if (!txt) return;
    state.config.frasesCarinhosas.unshift(txt);
    input.value = "";
    salvarEstado();
    renderListaFrases();
  });

  // ---------- Abas do Livro RPG & Janelinha Compacta ----------
  function selecionarAbaCentral(abaId, salvar = true) {
    const aba = ABAS_CENTRAL.includes(abaId) ? abaId : "mesa";
    document.querySelectorAll(".book-tab-btn[data-tab-target]").forEach((btn) => {
      const ativa = btn.dataset.tabTarget === aba;
      btn.classList.toggle("is-active", ativa);
      btn.setAttribute("aria-selected", String(ativa));
    });
    document.querySelectorAll(".book-panel[data-tab-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.tabPanel !== aba;
    });
    if (salvar && state.config.abaAtiva !== aba) {
      state.config.abaAtiva = aba;
      salvarEstado();
    }
  }

  document.querySelectorAll(".book-tab-btn[data-tab-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selecionarAbaCentral(btn.dataset.tabTarget, true);
    });
  });

  function renderJanelinhaCompacta() {
    const card = document.getElementById("janelinha-compacta");
    if (!card || card.hidden) return;

    const npc = getNpcById(state.config.npcAtivoId);
    const svgEl = document.getElementById("mini-mascote-svg");
    const nomeEl = document.getElementById("mini-mascote-nome");
    const falaEl = document.getElementById("mini-mascote-fala");
    if (svgEl) svgEl.innerHTML = gerarSvgNpc(npc.id, mascoteEstado);
    if (nomeEl) nomeEl.textContent = getNpcRotulo(npc);
    if (falaEl) falaEl.textContent = mascoteFala ? mascoteFala.textContent : "";

    const modoEl = document.getElementById("mini-pomo-modo-badge");
    const timerEl = document.getElementById("mini-pomo-display");
    const toggleEl = document.getElementById("mini-pomo-toggle");
    if (modoEl) {
      modoEl.textContent =
        pomoModo === "pausa"
          ? "☕ Pausa"
          : pomoProntoProFoco && !pomoRodando
            ? "🍅 Pronto pro foco"
            : "🍅 Foco";
    }
    if (timerEl) timerEl.textContent = formatarRelogio(pomoRestanteSeg);
    if (toggleEl) {
      toggleEl.textContent = pomoRodando ? "⏸" : "▶";
      toggleEl.title = pomoRodando ? "Pausar relógio" : "Começar relógio";
    }
    const miniPularRow = document.getElementById("mini-pomo-pular-row");
    if (miniPularRow) miniPularRow.hidden = pomoModo !== "pausa";

    const quest = getQuestEmFoco();
    const questTituloEl = document.getElementById("mini-quest-titulo");
    const tomRowEl = document.getElementById("mini-quest-tomatinhos");
    if (quest && questTituloEl && tomRowEl) {
      questTituloEl.textContent = quest.concluida ? `✓ ${quest.titulo}` : quest.titulo;
      tomRowEl.innerHTML = "";
      for (let i = 0; i < quest.pomodorosTotal; i++) {
        const maduro = i < quest.pomodorosFeitos;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `tomatinho ${maduro ? "is-vermelho" : "is-verde"}`;
        btn.innerHTML = gerarTomatinhoSVG(maduro);
        btn.title = maduro ? "Tomatinho maduro" : "Tomatinho verde: clique para amadurecer";
        if (!maduro && !quest.concluida) {
          btn.addEventListener("click", () => acenderTomatinhoQuest(quest.id));
        }
        tomRowEl.appendChild(btn);
      }
    }

    const reg = garantirDiaAtualizado();
    const emRevisao = state.config.modoHoje === "revisao";
    const numEl = document.getElementById("mini-palavras-hoje");
    const rotEl = document.getElementById("mini-palavras-rotulo");
    const progEl = document.getElementById("mini-progresso-texto");
    const barraEl = document.getElementById("mini-barra-fill");
    const minMarkerEl = document.getElementById("mini-marcador-minima");

    if (emRevisao) {
      const meta = Math.max(1, Number(state.config.metaDiariaMinutosRevisao) || 45);
      const min = Math.max(1, Number(state.config.metaMinimaMinutosRevisao) || 15);
      if (numEl) numEl.textContent = formatarNumero(reg.minutosRevisados);
      if (rotEl) rotEl.textContent = "min revisão";
      if (progEl) progEl.textContent = `${formatarNumero(reg.minutosRevisados)} / ${formatarNumero(meta)}`;
      if (barraEl) barraEl.style.width = `${Math.min(100, Math.round((reg.minutosRevisados / meta) * 100))}%`;
      if (minMarkerEl) minMarkerEl.style.left = `${Math.min(100, Math.round((min / meta) * 100))}%`;
    } else {
      const meta = Math.max(1, Number(state.config.metaDiariaPalavras) || 1000);
      const min = Math.max(1, Number(state.config.metaMinimaPalavras) || 200);
      if (numEl) numEl.textContent = formatarNumero(reg.palavrasEscritas);
      if (rotEl) rotEl.textContent = "palavras hoje";
      if (progEl) progEl.textContent = `${formatarNumero(reg.palavrasEscritas)} / ${formatarNumero(meta)}`;
      if (barraEl) barraEl.style.width = `${Math.min(100, Math.round((reg.palavrasEscritas / meta) * 100))}%`;
      if (minMarkerEl) minMarkerEl.style.left = `${Math.min(100, Math.round((min / meta) * 100))}%`;
    }

    const miniMistoRev = document.getElementById("mini-misto-revisao");
    if (miniMistoRev) {
      const emMisto = state.config.modoHoje === "misto";
      miniMistoRev.hidden = !emMisto;
      if (emMisto) {
        const metaRev = Math.max(1, Number(state.config.metaDiariaMinutosRevisao) || 45);
        miniMistoRev.textContent = `🔍 Revisão: ${formatarNumero(reg.minutosRevisados)} / ${formatarNumero(metaRev)} min`;
      }
    }
    renderControlesSomAmbiente();
  }

  function ativarModoJanelinha() {
    document.body.classList.add("is-janelinha");
    const card = document.getElementById("janelinha-compacta");
    if (card) card.hidden = false;
    renderControlesSomAmbiente();
    renderJanelinhaCompacta();
  }

  const miniMascoteSvgEl = document.getElementById("mini-mascote-svg");
  if (miniMascoteSvgEl) {
    miniMascoteSvgEl.addEventListener("click", () => setMascoteEstado(mascoteEstado));
    miniMascoteSvgEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setMascoteEstado(mascoteEstado);
      }
    });
  }
  const miniPomoToggleEl = document.getElementById("mini-pomo-toggle");
  if (miniPomoToggleEl) miniPomoToggleEl.addEventListener("click", togglePomodoro);
  const miniPomoResetEl = document.getElementById("mini-pomo-reset");
  if (miniPomoResetEl) {
    miniPomoResetEl.addEventListener("click", () => trocarModoPomodoro(pomoModo));
  }
  const miniPomoPularEl = document.getElementById("mini-pomo-pular");
  if (miniPomoPularEl) miniPomoPularEl.addEventListener("click", pularPausaPomodoro);

  const selectSomAmbienteEl = document.getElementById("select-som-ambiente");
  if (selectSomAmbienteEl) {
    selectSomAmbienteEl.addEventListener("change", (e) => trocarTipoSomAmbiente(e.target.value));
  }
  const btnAmbienteToggleEl = document.getElementById("btn-ambiente-toggle");
  if (btnAmbienteToggleEl) btnAmbienteToggleEl.addEventListener("click", alternarSomAmbiente);
  const miniAmbienteToggleEl = document.getElementById("mini-ambiente-toggle");
  if (miniAmbienteToggleEl) miniAmbienteToggleEl.addEventListener("click", alternarSomAmbiente);
  const inputVolumeAmbienteEl = document.getElementById("input-volume-ambiente");
  if (inputVolumeAmbienteEl) {
    inputVolumeAmbienteEl.addEventListener("input", (e) => atualizarVolumeSomAmbiente(e.target.value));
    inputVolumeAmbienteEl.addEventListener("change", (e) => atualizarVolumeSomAmbiente(e.target.value));
  }

  async function abrirJanelinhaMesaPopup() {
    try {
      const resp = await fetch(`${CONTADOR_AUTO_URL}/api/abrir-janelinha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      if (resp.ok) return;
    } catch (_) {
      // Se o programinha local não estiver rodando, abre como pop-up do navegador
    }
    window.open(
      "index.html?mini=1",
      "MiniMesaCentralLivrinhos",
      "width=320,height=360,resizable=yes,scrollbars=no"
    );
  }

  document.getElementById("btn-abrir-popup").addEventListener("click", abrirJanelinhaMesaPopup);
  const btnAbrirJanelinhaAjustes = document.getElementById("btn-abrir-janelinha-ajustes");
  if (btnAbrirJanelinhaAjustes) {
    btnAbrirJanelinhaAjustes.addEventListener("click", abrirJanelinhaMesaPopup);
  }

  if (new URLSearchParams(window.location.search).get("mini") === "1") {
    ativarModoJanelinha();
  }

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      state = carregarEstado();
      garantirDiaAtualizado();
      selecionarAbaCentral(state.config.abaAtiva, false);
      renderTudo();
    }
  });

  // ---------- Backup & Restauração (.json) ----------
  document.getElementById("btn-baixar-backup").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `save-central-de-livrinhos-${hojeISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("input-restaurar-backup").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || ""));
        state = normalizarEstado(obj);
        garantirDiaAtualizado();
        salvarEstado();
        renderTudo();
        sincronizarRegrasLivrosContadorAuto(true);
        mostrarFeedbackMesa("Save restaurado com sucesso! Tudo no lugar de volta.", "good");
      } catch (_) {
        alert("Esse arquivo não parece ser um backup válido da Central de Livrinhos.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ---------- Quest 0: Chegar na Fazenda ----------
  function obterPassosQuestZero() {
    const usaGDocs = normalizarEditoresEscrita(state.config.editoresEscrita).includes("gdocs");
    const passos = [
      {
        titulo: (nome, n) => `${n}. Bem-vinda à fazenda${nome ? ", " + nome : ""}!`,
        texto:
          "Tudo aqui mora só no seu computador: nada de internet, zero IA inventando coisa e nenhum trecho do seu livro é guardado. Na Mesa, escolha entre Dia de Escrita, Dia de Revisão ou Dia Misto (que conta palavras em destaque e minutos de revisão embaixo, valendo pros Troféus e medalhas)."
      },
      {
        titulo: (_nome, n) => `${n}. Marcar os arquivos do livro na Estante`,
        texto:
          "Se usar Word ou Pages, lá na Estante de Projetos clique em Editar no seu livro e anote os nomes dos arquivos ou palavras-chave (tipo 'Trilha' ou 'cap'). O contador olha SÓ o nome do documento aberto no Word/Pages e ignora o resto 💤!"
      }
    ];

    if (usaGDocs) {
      passos.push({
        titulo: (_nome, n) => `${n}. Como contar no Google Docs ☁️`,
        texto:
          "O Docs mora na internet e a Central, de propósito, não. Por isso a contagem do Docs é por esse número: no Docs, vá em Ferramentas → Contagem de palavras e marque 'Mostrar contagem de palavras durante a digitação'. No fim da sessão, digite o total em 'Atualizar total do arquivo' (em Outras formas de contar), e a Central calcula as palavras novas!"
      });
    }

    passos.push(
      {
        titulo: (_nome, n) => `${n}. Seu acompanhante de escrita`,
        texto:
          "Começamos esta fazenda juntos: eu no posto de O Moreno Sarcástico e A Gatinha da Fazenda no turno felino. Os personagens aqui não têm nome fixo; você pode deixar só o arquétipo ou dar o nome que quiser!"
      },
      {
        titulo: (_nome, n) => `${n}. Quests, Pomodoro & Pular pausa`,
        texto:
          "Monte uma quest em Quests e clique em Pôr em foco. Cada pomodoro concluído amadurece um tomatinho verde para vermelho. Na pausa, você pode abrir Brincar na pausa 🎮 (com minijogos leves que fecham sozinhos quando o descanso termina) ou clicar em Pular pausa ⏭, e o relógio fica parado pronto pro próximo foco."
      },
      {
        titulo: (_nome, n) => `${n}. Cartinhas Lacradas & Personagens`,
        texto:
          "Cada Medalha Automática chega numa cartinha lacrada com confete e libera um novo mocinho, mocinha ou personagem não binário no seu Álbum de Personagens. Se quiser rever tudo, clique em 📖 Manual na aba Ajustes!"
      }
    );

    return passos;
  }

  function renderQuestZero() {
    const card = document.getElementById("quest-zero-card");
    if (!card) return;

    const deveMostrar = !state.config.questZeroConcluida && !state.config.questZeroPulada;
    card.hidden = !deveMostrar;
    if (!deveMostrar) return;

    const passos = obterPassosQuestZero();
    const passoIdx = Math.max(0, Math.min(passos.length - 1, Number(state.config.questZeroPasso) || 0));
    const passo = passos[passoIdx];
    const nome = (state.config.nomeAutora || "").trim();
    const anfitriao = getNpcById("moreno-sarcastico");

    document.getElementById("q0-npc-svg").innerHTML = gerarSvgNpc(
      "moreno-sarcastico",
      passoIdx === passos.length - 1 ? "festa" : "normal"
    );
    document.getElementById("q0-npc-tag").textContent = getNpcRotulo(anfitriao);
    document.getElementById("q0-passo-badge").textContent = `Passo ${passoIdx + 1} de ${passos.length}`;
    document.getElementById("q0-titulo").textContent = passo.titulo(nome, passoIdx + 1);
    document.getElementById("q0-texto").textContent = passo.texto;

    document.getElementById("btn-q0-prev").disabled = passoIdx === 0;
    document.getElementById("btn-q0-next").textContent =
      passoIdx === passos.length - 1 ? "Concluir Quest 0 (+20 XP) ⚔️" : "Próximo passo →";
  }

  document.getElementById("btn-q0-prev").addEventListener("click", () => {
    state.config.questZeroPasso = Math.max(0, (Number(state.config.questZeroPasso) || 0) - 1);
    salvarEstado();
    renderQuestZero();
  });

  document.getElementById("btn-q0-next").addEventListener("click", () => {
    const passos = obterPassosQuestZero();
    const atual = Number(state.config.questZeroPasso) || 0;
    if (atual < passos.length - 1) {
      state.config.questZeroPasso = atual + 1;
      salvarEstado();
      renderQuestZero();
      return;
    }

    const jaGanhouXpTour = Boolean(state.config.questZeroXpEntregue);
    state.config.questZeroConcluida = true;
    state.config.questZeroPulada = true;
    state.config.questZeroXpEntregue = true;
    salvarEstado();
    renderQuestZero();
    comemorar({
      emoji: "🧭",
      titulo: "Quest 0 concluída: chegou na fazenda!",
      xp: jaGanhouXpTour ? 0 : 20,
      grande: true,
      fraseForcada: "Pronto! Agora você já conhece cada porteira da fazenda literária."
    });
  });

  document.getElementById("btn-q0-pular").addEventListener("click", () => {
    state.config.questZeroPulada = true;
    salvarEstado();
    renderQuestZero();
  });

  // ---------- Criação de Personagem (Onboarding) + Perfil + Manual ----------
  const modalOnboarding = document.getElementById("modal-onboarding");
  const modalManual = document.getElementById("modal-manual");

  function abrirModalOnboarding() {
    const livro = getLivroAtivo();
    document.getElementById("onb-nome-autora").value = state.config.nomeAutora || "";
    document.getElementById("onb-nome-livro").value = livro ? livro.nome : "Meu Romance Novo";
    const marcas = [
      ...(livro && Array.isArray(livro.arquivosMarcados) ? livro.arquivosMarcados : []),
      ...(livro && Array.isArray(livro.palavrasChave) ? livro.palavrasChave : [])
    ];
    document.getElementById("onb-palavra-chave-livro").value = marcas.join(", ");
    document.getElementById("onb-meta-dia").value = Number(state.config.metaDiariaPalavras) || 1000;
    document.getElementById("onb-meta-minima").value = Number(state.config.metaMinimaPalavras) || 250;

    const editoresAtuais = normalizarEditoresEscrita(state.config.editoresEscrita);
    document.querySelectorAll('input[name="onb-editor"]').forEach((chk) => {
      chk.checked = editoresAtuais.includes(chk.value);
    });

    const prefAtual = state.config.preferenciaRomance || "todos";
    const radio = document.querySelector(`input[name="onb-preferencia"][value="${prefAtual}"]`);
    if (radio) radio.checked = true;

    modalOnboarding.hidden = false;
  }

  function fecharModalOnboarding() {
    if (!state.config.onboardingConcluido) {
      state.config.onboardingConcluido = true;
      salvarEstado();
    }
    modalOnboarding.hidden = true;
  }

  document.getElementById("btn-fechar-onboarding-x").addEventListener("click", fecharModalOnboarding);

  document.getElementById("form-onboarding").addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = document.getElementById("onb-nome-autora").value.trim();
    const nomeLivro = document.getElementById("onb-nome-livro").value.trim();
    const itensContador = parseListaVirgula(document.getElementById("onb-palavra-chave-livro").value);
    const metaDia = Math.max(10, Number(document.getElementById("onb-meta-dia").value) || 1000);
    const metaMin = Math.max(10, Number(document.getElementById("onb-meta-minima").value) || 250);
    const prefSelecionada =
      document.querySelector('input[name="onb-preferencia"]:checked')?.value || "todos";
    const editoresMarcados = Array.from(document.querySelectorAll('input[name="onb-editor"]:checked')).map(
      (el) => el.value
    );

    state.config.nomeAutora = nome;
    state.config.metaDiariaPalavras = metaDia;
    state.config.metaMinimaPalavras = Math.min(metaMin, metaDia);
    state.config.preferenciaRomance = prefSelecionada;
    state.config.editoresEscrita = normalizarEditoresEscrita(editoresMarcados);
    state.config.onboardingConcluido = true;

    const livroAtivo = getLivroAtivo();
    if (livroAtivo) {
      if (nomeLivro) livroAtivo.nome = nomeLivro;
      const arqs = [];
      const chaves = [];
      itensContador.forEach((item) => {
        if (/\.(docx|txt|md|markdown|odt|pages)$/i.test(item)) {
          arqs.push(item);
        } else {
          chaves.push(item);
        }
      });
      livroAtivo.arquivosMarcados = arqs;
      livroAtivo.palavrasChave = chaves;
      livroAtivo.arquivoContador = arqs[0] || (chaves[0] ? `chave: ${chaves[0]}` : "");
    }

    salvarEstado();
    modalOnboarding.hidden = true;
    atualizarSaudacao();
    renderTudo();
    renderQuestZero();
    sincronizarRegrasLivrosContadorAuto(true);
    setMascoteEstado(
      "normal",
      nome
        ? `Ficha carimbada, ${nome}! Já separei seu café e tranquei a Dona Procrastinação lá fora.`
        : "Ficha carimbada! Café pronto e mesa aberta pro seu livro."
    );
  });

  document.querySelectorAll('input[name="ajustes-editor"]').forEach((chk) => {
    chk.addEventListener("change", () => {
      const marcados = Array.from(document.querySelectorAll('input[name="ajustes-editor"]:checked')).map(
        (el) => el.value
      );
      state.config.editoresEscrita = normalizarEditoresEscrita(marcados);
      salvarEstado();
      renderTudo();
      renderQuestZero();
    });
  });

  document.getElementById("btn-perfil").addEventListener("click", abrirModalOnboarding);

  document.getElementById("btn-manual").addEventListener("click", () => {
    modalManual.hidden = false;
  });
  document.getElementById("btn-fechar-manual").addEventListener("click", () => {
    modalManual.hidden = true;
  });
  document.getElementById("btn-fechar-manual-x").addEventListener("click", () => {
    modalManual.hidden = true;
  });
  modalManual.addEventListener("click", (e) => {
    if (e.target === modalManual) modalManual.hidden = true;
  });
  modalOnboarding.addEventListener("click", (e) => {
    if (e.target === modalOnboarding) fecharModalOnboarding();
  });
  document.getElementById("btn-manual-perfil").addEventListener("click", () => {
    modalManual.hidden = true;
    abrirModalOnboarding();
  });
  function reverQuestZero() {
    modalManual.hidden = true;
    state.config.questZeroConcluida = false;
    state.config.questZeroPulada = false;
    state.config.questZeroPasso = 0;
    salvarEstado();
    selecionarAbaCentral("mesa", true);
    renderQuestZero();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("btn-manual-quest-zero").addEventListener("click", reverQuestZero);
  const btnReverQuestZeroAjustes = document.getElementById("btn-rever-quest-zero");
  if (btnReverQuestZeroAjustes) {
    btnReverQuestZeroAjustes.addEventListener("click", reverQuestZero);
  }

  // ---------- Contador Automático Local (Fase 3 v2: filtro estrito por livro na Estante) ----------
  const CONTADOR_AUTO_URL = "http://127.0.0.1:8765";
  const contadorAutoDot = document.getElementById("contador-auto-dot");
  const contadorAutoStatus = document.getElementById("contador-auto-status");
  const contadorAutoActions = document.getElementById("contador-auto-actions");
  const contadorAutoAjudaBox = document.getElementById("contador-auto-ajuda-box");
  const btnAutoMarcarDocAberto = document.getElementById("btn-auto-marcar-doc-aberto");
  const btnAutoPausar = document.getElementById("btn-auto-pausar");
  const avisoSaltoPendente = document.getElementById("aviso-salto-pendente");
  const avisoSaltoTexto = document.getElementById("aviso-salto-texto");
  const btnSaltoEscrevi = document.getElementById("btn-salto-escrevi");
  const btnSaltoColei = document.getElementById("btn-salto-colei");
  const miniAvisoSalto = document.getElementById("mini-aviso-salto");
  const miniAvisoSaltoTexto = document.getElementById("mini-aviso-salto-texto");
  const btnMiniSaltoEscrevi = document.getElementById("btn-mini-salto-escrevi");
  const btnMiniSaltoColei = document.getElementById("btn-mini-salto-colei");
  let contadorAutoPollId = null;
  let contadorAutoOcupado = false;
  let contadorAutoOnline = false;
  let ultimaAssinaturaRegrasSync = "";
  let ultimoDocIgnoradoNome = "";
  let saltoPendente = null;
  const janelaSaltosPorDoc = {};

  function renderAvisoSaltoPendente() {
    const texto = saltoPendente
      ? `Uau, +${formatarNumero(saltoPendente.delta)} de uma vez! Você escreveu ou colou/recuperou texto?`
      : "";
    if (avisoSaltoPendente && avisoSaltoTexto) {
      avisoSaltoPendente.hidden = !saltoPendente;
      avisoSaltoTexto.textContent = texto;
    }
    if (miniAvisoSalto && miniAvisoSaltoTexto) {
      miniAvisoSalto.hidden = !saltoPendente;
      miniAvisoSaltoTexto.textContent = texto;
    }
  }

  function resolverSaltoPendente(foiEscrito) {
    if (!saltoPendente) return;
    const pendente = saltoPendente;
    const livroAlvo = state.livros.find((l) => l.id === pendente.livroId) || getLivroAtivo();
    saltoPendente = null;
    renderAvisoSaltoPendente();
    if (!livroAlvo) return;

    if (!livroAlvo.contagemPorDoc || typeof livroAlvo.contagemPorDoc !== "object") {
      livroAlvo.contagemPorDoc = {};
    }
    const anteriorDoc = livroAlvo.contagemPorDoc[pendente.docChave] || {};
    livroAlvo.contagemPorDoc[pendente.docChave] = {
      palavras: pendente.palavrasNovasTotal,
      tamanhoBytes: pendente.tamanhoBytes !== null ? pendente.tamanhoBytes : anteriorDoc.tamanhoBytes || null,
      modificadoEm: pendente.modificadoEm || anteriorDoc.modificadoEm || null
    };
    janelaSaltosPorDoc[pendente.docChave] = { inicioMs: Date.now(), ganhoAcumulado: 0 };

    const reg = garantirDiaAtualizado();
    if (foiEscrito) {
      const celebracoesAntes = totalCelebracoesAbertas;
      reg.palavrasEscritas += pendente.delta;
      reg.ultimaSomaHoje = pendente.delta;
      livroAlvo.palavrasTotais = Math.max(0, (Number(livroAlvo.palavrasTotais) || 0) + pendente.delta);
      recalcularSaldoDia(reg);
      registrarMinutoRevisaoSeNovo(reg);
      salvarEstado();
      renderTudo();
      animarSubidaDiscretaNumero();
      mostrarFeedbackMesa(
        `+${formatarNumero(pendente.delta)} palavras confirmadas como escritas em "${livroAlvo.nome}" (${formatarNumero(reg.palavrasEscritas)} hoje)!`,
        "good"
      );
      verificarMetasEscrita(reg);
      if (totalCelebracoesAbertas === celebracoesAntes) {
        soltarConfete(90, { glitter: 50, espalhado: true });
        tocarSomFofo("meta");
      }
      return;
    }

    livroAlvo.palavrasTotais = Math.max(0, (Number(livroAlvo.palavrasTotais) || 0) + pendente.delta);
    livroAlvo.palavrasInicioDia = Math.max(0, (Number(livroAlvo.palavrasInicioDia) || 0) + pendente.delta);
    recalcularSaldoDia(reg);
    salvarEstado();
    renderTudo();
    mostrarFeedbackMesa(
      `Total de "${livroAlvo.nome}" atualizado (+${formatarNumero(pendente.delta)} palavras coladas/recuperadas), sem somar nas palavras de hoje.`,
      "info"
    );
  }

  [btnSaltoEscrevi, btnMiniSaltoEscrevi].forEach((btn) => {
    if (btn) btn.addEventListener("click", () => resolverSaltoPendente(true));
  });
  [btnSaltoColei, btnMiniSaltoColei].forEach((btn) => {
    if (btn) btn.addEventListener("click", () => resolverSaltoPendente(false));
  });

  function gerarPayloadRegrasLivros() {
    return state.livros.map((l) => ({
      id: l.id,
      nome: l.nome,
      arquivosMarcados: Array.isArray(l.arquivosMarcados) ? l.arquivosMarcados : [],
      palavrasChave: Array.isArray(l.palavrasChave) ? l.palavrasChave : []
    }));
  }

  function renderBarraContadorOffline() {
    contadorAutoOnline = false;
    ultimaAssinaturaRegrasSync = "";
    ultimoDocIgnoradoNome = "";
    contadorAutoDot.classList.remove("is-online");
    contadorAutoDot.classList.add("is-offline");
    contadorAutoStatus.textContent =
      "Contador automático desligado (instale uma vez no Windows ou abra no Mac)";
    contadorAutoActions.hidden = true;
    btnAutoMarcarDocAberto.hidden = true;
  }

  function aplicarLeituraContadorAuto(dados, origemSync = false) {
    if (!dados || !dados.ativo) {
      renderBarraContadorOffline();
      return;
    }

    const estavaOffline = !contadorAutoOnline;
    contadorAutoOnline = true;
    contadorAutoDot.classList.remove("is-offline");
    contadorAutoDot.classList.add("is-online");
    contadorAutoActions.hidden = false;

    const estaPausado = Boolean(dados.pausado || dados.estado === "pausado");
    btnAutoPausar.textContent = estaPausado ? "▶️ Retomar" : "⏸️ Pausar";
    btnAutoPausar.title = estaPausado
      ? "Retomar a leitura automática"
      : "Pausar a leitura automática";

    if (estavaOffline && !origemSync) {
      sincronizarRegrasLivrosContadorAuto(true);
    }

    if (estaPausado) {
      ultimoDocIgnoradoNome = "";
      btnAutoMarcarDocAberto.hidden = true;
      contadorAutoStatus.textContent = "⏸️ Contador automático pausado";
      return;
    }

    if (dados.estado === "ignorado") {
      ultimoDocIgnoradoNome = String(dados.arquivoNome || "").trim();
      contadorAutoStatus.textContent = "documento aberto não é de nenhum livro, ignorando 💤";
      btnAutoMarcarDocAberto.hidden = !ultimoDocIgnoradoNome;
      return;
    }

    ultimoDocIgnoradoNome = "";
    btnAutoMarcarDocAberto.hidden = true;

    if (dados.erro) {
      const prefixo = dados.arquivoNome ? `${dados.arquivoNome}: ` : "";
      contadorAutoStatus.textContent = `🟢 Ligado • ⚠️ ${prefixo}${dados.erro}`;
      return;
    }

    if (dados.estado !== "contando" || !dados.arquivoNome) {
      contadorAutoStatus.textContent =
        "🟢 Contador ligado • esperando você abrir um documento marcado no Word/Pages";
      return;
    }

    const totalLido = Math.max(0, Math.floor(Number(dados.palavras) || 0));
    const hora = dados.ultimaLeituraHora ? ` • às ${dados.ultimaLeituraHora}` : "";
    const nomeLivroStatus = dados.livroNome || "Livro";
    contadorAutoStatus.textContent =
      `🟢 contando: ${dados.arquivoNome} (${nomeLivroStatus}) • ${formatarNumero(totalLido)} palavras${hora}`;

    const livroAlvo =
      state.livros.find((l) => l.id === dados.livroId) || getLivroAtivo();
    if (!livroAlvo) return;

    if (!livroAlvo.contagemPorDoc || typeof livroAlvo.contagemPorDoc !== "object") {
      livroAlvo.contagemPorDoc = {};
    }

    const reg = garantirDiaAtualizado();
    const docChave = `${dados.modo || "doc"}:${String(dados.arquivoNome).toLowerCase()}`;
    const docAnterior = livroAlvo.contagemPorDoc[docChave];
    const tamanhoAtual =
      dados.tamanhoBytes !== null && dados.tamanhoBytes !== undefined
        ? Number(dados.tamanhoBytes)
        : null;
    const modAtual = dados.modificadoEm || null;

    if (!docAnterior) {
      const tinhaZeroNoLivro =
        (Number(livroAlvo.palavrasTotais) || 0) === 0 &&
        Object.keys(livroAlvo.contagemPorDoc).length === 0;
      livroAlvo.contagemPorDoc[docChave] = {
        palavras: totalLido,
        tamanhoBytes: tamanhoAtual,
        modificadoEm: modAtual
      };
      if (tinhaZeroNoLivro) {
        livroAlvo.palavrasTotais = totalLido;
        livroAlvo.palavrasInicioDia = totalLido;
      }
      recalcularSaldoDia(reg);
      salvarEstado();
      renderTudo();
      mostrarFeedbackMesa(
        `Contando "${dados.arquivoNome}" (${livroAlvo.nome}): ponto de partida em ${formatarNumero(totalLido)} palavras.`,
        "good"
      );
      return;
    }

    const mudouTamanho =
      tamanhoAtual !== null &&
      docAnterior.tamanhoBytes !== null &&
      docAnterior.tamanhoBytes !== undefined &&
      tamanhoAtual !== Number(docAnterior.tamanhoBytes);
    const mudouMtime = Boolean(modAtual && docAnterior.modificadoEm && modAtual !== docAnterior.modificadoEm);
    const houveAlteracao = totalLido !== Number(docAnterior.palavras) || mudouTamanho || mudouMtime;
    const delta = totalLido - Number(docAnterior.palavras);

    if (saltoPendente && saltoPendente.docChave === docChave) {
      const deltaDesdeBase = totalLido - saltoPendente.palavrasBase;
      if (deltaDesdeBase > LIMITE_SALTO_PERGUNTA) {
        saltoPendente.delta = deltaDesdeBase;
        saltoPendente.palavrasNovasTotal = totalLido;
        saltoPendente.tamanhoBytes = tamanhoAtual !== null ? tamanhoAtual : saltoPendente.tamanhoBytes;
        saltoPendente.modificadoEm = modAtual || saltoPendente.modificadoEm;
        renderAvisoSaltoPendente();
        return;
      }
      saltoPendente = null;
      renderAvisoSaltoPendente();
    }

    if (state.config.modoHoje !== "revisao" && delta > 0) {
      const agora = Date.now();
      const regJanela = janelaSaltosPorDoc[docChave];
      let ganhoNaJanela = delta;
      if (!regJanela || agora - regJanela.inicioMs > JANELA_SALTO_MS) {
        janelaSaltosPorDoc[docChave] = { inicioMs: agora, ganhoAcumulado: delta };
      } else {
        regJanela.ganhoAcumulado += delta;
        ganhoNaJanela = regJanela.ganhoAcumulado;
      }

      if (delta > LIMITE_SALTO_PERGUNTA || ganhoNaJanela > LIMITE_SALTO_PERGUNTA) {
        if (!saltoPendente) {
          saltoPendente = {
            livroId: livroAlvo.id,
            livroNome: livroAlvo.nome,
            docChave,
            arquivoNome: dados.arquivoNome,
            palavrasBase: Number(docAnterior.palavras) || 0,
            palavrasNovasTotal: totalLido,
            delta,
            tamanhoBytes: tamanhoAtual,
            modificadoEm: modAtual
          };
          renderAvisoSaltoPendente();
        }
        return;
      }
    }

    livroAlvo.contagemPorDoc[docChave] = {
      palavras: totalLido,
      tamanhoBytes: tamanhoAtual !== null ? tamanhoAtual : docAnterior.tamanhoBytes || null,
      modificadoEm: modAtual || docAnterior.modificadoEm || null
    };

    if (state.config.modoHoje === "revisao") {
      if (houveAlteracao) {
        livroAlvo.palavrasTotais = Math.max(0, (Number(livroAlvo.palavrasTotais) || 0) + delta);
        livroAlvo.palavrasInicioDia = Math.max(0, (Number(livroAlvo.palavrasInicioDia) || 0) + delta);
        recalcularSaldoDia(reg);
        registrarMinutoRevisaoSeNovo(reg);
        salvarEstado();
        renderTudo();
        animarSubidaDiscretaNumero();
        mostrarFeedbackMesa(
          `Contador automático: alteração detectada em "${dados.arquivoNome}" (${livroAlvo.nome}), minuto de revisão somado!`,
          "good"
        );
      } else {
        salvarEstado();
      }
      return;
    }

    if (delta === 0) {
      if (state.config.modoHoje === "misto" && houveAlteracao) {
        registrarMinutoRevisaoSeNovo(reg);
        salvarEstado();
        renderTudo();
      } else {
        salvarEstado();
      }
      return;
    }

    if (delta > 0) {
      reg.palavrasEscritas += delta;
      reg.ultimaSomaHoje = delta;
      livroAlvo.palavrasTotais = Math.max(0, (Number(livroAlvo.palavrasTotais) || 0) + delta);
      recalcularSaldoDia(reg);
      registrarMinutoRevisaoSeNovo(reg);
      salvarEstado();
      renderTudo();
      animarSubidaDiscretaNumero();
      mostrarFeedbackMesa(
        `Contador automático somou +${formatarNumero(delta)} palavras em "${livroAlvo.nome}" (${dados.arquivoNome})! (${formatarNumero(reg.palavrasEscritas)} hoje).`,
        "good"
      );
      verificarMetasEscrita(reg);
      return;
    }

    // delta < 0: palavras cortadas não tiram o esforço já digitado hoje
    livroAlvo.palavrasTotais = Math.max(0, (Number(livroAlvo.palavrasTotais) || 0) + delta);
    recalcularSaldoDia(reg);
    registrarMinutoRevisaoSeNovo(reg);
    salvarEstado();
    renderTudo();
    mostrarFeedbackMesa(
      `Você cortou ${formatarNumero(Math.abs(delta))} palavras em "${dados.arquivoNome}" (${livroAlvo.nome}). Suas ${formatarNumero(reg.palavrasEscritas)} palavras escritas hoje continuam intactas.`,
      "info"
    );
  }

  async function sincronizarRegrasLivrosContadorAuto(forcar = false) {
    const livros = gerarPayloadRegrasLivros();
    const assinatura = JSON.stringify(livros);
    if (!forcar && assinatura === ultimaAssinaturaRegrasSync) return;
    ultimaAssinaturaRegrasSync = assinatura;

    try {
      const resp = await fetch(`${CONTADOR_AUTO_URL}/api/regras-livros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ livros })
      });
      if (!resp.ok) throw new Error("offline");
      const dados = await resp.json();
      aplicarLeituraContadorAuto(dados, true);
    } catch (_) {
      ultimaAssinaturaRegrasSync = "";
    }
  }

  async function consultarContadorAuto(forcar = false) {
    if (contadorAutoOcupado) return;
    contadorAutoOcupado = true;
    try {
      const url = `${CONTADOR_AUTO_URL}/api/status${forcar ? "?agora=1" : ""}`;
      const resp = await fetch(url, { method: "GET", cache: "no-store" });
      if (!resp.ok) throw new Error("offline");
      const dados = await resp.json();
      aplicarLeituraContadorAuto(dados, false);
    } catch (_) {
      renderBarraContadorOffline();
    } finally {
      contadorAutoOcupado = false;
    }
  }

  document.getElementById("btn-auto-ajuda").addEventListener("click", () => {
    contadorAutoAjudaBox.hidden = !contadorAutoAjudaBox.hidden;
  });

  document.getElementById("btn-auto-marcar-arquivos").addEventListener("click", () => {
    const livro = getLivroAtivo();
    if (livro) abrirModalLivro(livro.id);
  });

  btnAutoMarcarDocAberto.addEventListener("click", () => {
    const nomeDoc = ultimoDocIgnoradoNome;
    const livro = getLivroAtivo();
    if (!nomeDoc || !livro) return;
    if (!Array.isArray(livro.arquivosMarcados)) livro.arquivosMarcados = [];
    if (!livro.arquivosMarcados.some((x) => x.toLowerCase() === nomeDoc.toLowerCase())) {
      livro.arquivosMarcados.push(nomeDoc);
    }
    if (!livro.arquivoContador) livro.arquivoContador = nomeDoc;
    salvarEstado();
    renderTudo();
    sincronizarRegrasLivrosContadorAuto(true);
    mostrarFeedbackMesa(`"${nomeDoc}" marcado em "${livro.nome}"! Agora o contador já soma aqui.`, "good");
  });

  document.getElementById("btn-auto-pausar").addEventListener("click", async () => {
    try {
      const resp = await fetch(`${CONTADOR_AUTO_URL}/api/pausar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      if (!resp.ok) throw new Error("offline");
      const dados = await resp.json();
      aplicarLeituraContadorAuto(dados, true);
    } catch (_) {
      renderBarraContadorOffline();
    }
  });

  document.getElementById("btn-auto-ler-agora").addEventListener("click", () => {
    consultarContadorAuto(true);
  });

  document.getElementById("btn-auto-escolher-arquivo").addEventListener("click", async () => {
    try {
      contadorAutoStatus.textContent = "📂 Abrindo seletor (opção extra)...";
      const resp = await fetch(`${CONTADOR_AUTO_URL}/api/escolher-arquivo`, { method: "POST" });
      if (!resp.ok) throw new Error("offline");
      const dados = await resp.json();
      aplicarLeituraContadorAuto(dados, true);
    } catch (_) {
      renderBarraContadorOffline();
    }
  });

  // ---------- Inicialização ----------
  garantirDiaAtualizado();
  atualizarSaudacao();
  setMascoteEstado("normal");
  selecionarAbaCentral(state.config.abaAtiva, false);
  renderTudo();
  verificarMedalhasAutomaticas();
  consultarContadorAuto(false);
  contadorAutoPollId = setInterval(() => consultarContadorAuto(false), 5000);

  if (!state.config.onboardingConcluido && !document.body.classList.contains("is-janelinha")) {
    abrirModalOnboarding();
  }
})();
