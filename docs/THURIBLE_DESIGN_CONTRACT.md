# Contrato de design do turíbulo

## Intenção

O turíbulo é um instrumento cerimonial de roleplay. Ele deve comunicar metal, corrente, peso, brasa discreta e fumaça de incenso com clareza cinematográfica, sem converter a ação litúrgica em magia ou sistema de sobrevivência.

O item público é `aspergillum:thurible`. A v1.2.2 não inclui naveta, suporte, combustível, carvão, inventário, durabilidade, recarga, progressão, efeito de estado, dano, interação com mobs ou transformação de blocos. Enquanto estiver na mão, o instrumento é considerado pronto para uso.

## Uso

- **Usar/Interagir** executa uma única oscilação controlada de `0,92 s`.
- A ação funciona tanto no ar quanto ao apontar para um bloco, permitindo incensar altar, ambão, assembleia ou percurso sem conflito de input.
- O cooldown nativo `thurible_incense` dura `1,05 s` e apenas sincroniza input, animação e apresentação; não representa recurso consumível.
- Ataque contra entidade e mineração com o turíbulo são cancelados. O instrumento nunca causa dano nem quebra bloco.
- Espectador não executa a ação. Os demais modos têm comportamento idêntico, pois não existe economia associada.
- Não há HUD, mensagem de carga, contador ou feedback mágico. O botão localizado é **Incensar** / **Incense**.

Pressões sucessivas após o cooldown produzem naturalmente uma fumaça mais densa porque as partículas anteriores permanecem no espaço. Não existe combo, multiplicador ou estado persistente para esse resultado.

## Construção

A receita representa a estrutura física em vez de uma mecânica de abastecimento:

```text
 C 
CNC
GGG
```

- `C`: corrente;
- `N`: pepita de ouro, como detalhe de ferragem;
- `G`: lingote de cobre, como corpo metálico aquecido.

A receita produz somente o turíbulo. Incenso e carvão não são ingredientes de uso nem itens auxiliares.

## Hierarquia física

```text
thurible_bound                 binding neutro do item
└── thurible_presentation      pose por perspectiva
    └── thurible_action        impulso da mão
        ├── hand_ring          argola e girador superior
        └── suspension         prato e correntes; pivô do pêndulo
            └── bowl_counterweight
                ├── lid       tampa perfurada e fresta quente
                │   └── smoke_origin
                │       └── locator thurible_smoke
                └── bowl      vaso, fundo e terminal inferior
```

Contratos estruturais:

| Propriedade | Valor |
| --- | --- |
| Geometry format | `1.16.0` |
| Binding | `q.item_slot_to_bone_name(context.item_slot)` |
| Raiz | `thurible_bound`, sem cubos e sem correção artística |
| Grip/pivô | `[-6, 24, 1]` |
| Identificador da geometria | `geometry.aspergillum.thurible.held` |
| Locator | `thurible_smoke` em `[-6, 33.72, 1]` |
| Fonte autoral | `assets-src/models/thurible.model.json` |
| Atlas | `256 × 256`, UV explícito por face, densidade de `4` texels por unidade |
| Materiais semânticos | `bronze`, `bronze_dark`, `chain`, `perforated_bronze`, `ember` |

A silhueta usa três correntes de suspensão e uma corrente central da tampa. As perfurações são desenhadas no metal opaco, com recessos escuros e raros reflexos quentes; transparência real não é necessária para parecer vazado e não pode introduzir culling instável.

## Apresentação 1.2.1

O modelo autoral cresce em `+Y` a partir do grip e, por isso, precisa da rotação ponta a ponta de `180°` nas duas perspectivas para representar um vaso pendente. A 1.2.0 aplicava essa inversão apenas em primeira pessoa; o primeiro gate físico revelou o vaso acima da mão e junto ao rosto em terceira pessoa.

| Perspectiva | Posição em `thurible_presentation` | Rotação aditiva | Escala | Resultado |
| --- | --- | --- | --- | --- |
| Primeira pessoa | `[0, -2.75, 0.45]` | `[180, 0, 0]` | `[0.68, 0.68, 0.68]` | conjunto completo no quadrante inferior direito, afastado da mira e do plano próximo |
| Terceira pessoa | `[5, -1.35, -2.2]` | `[176, 0, 0]` | nativa `1` | rotação efetiva de aproximadamente `180°`; argola no punho e vaso abaixo da mão |

Escala e pose pertencem somente a `thurible_presentation`. `thurible_bound`, o grip `[-6,24,1]`, os vértices e os pivôs físicos permanecem inalterados.

## Movimento

O Bedrock estável não oferece uma junta física confiável entre o item preso à mão e uma cadeia de corpos articulados. A v1.2.1 usa uma simulação autoral determinística, reproduzível para todos os observadores:

1. `thurible_action` transmite o impulso curto da mão;
2. `suspension` gira no prato superior e define o arco principal;
3. `bowl_counterweight` responde em sentido contrário com amplitude reduzida, sugerindo massa e atraso da corrente;
4. `lid` recebe somente uma folga angular mínima e sempre retorna fechada;
5. todos os canais voltam exatamente a zero antes do final.

A primeira pessoa limita o pêndulo a aproximadamente `23°`; a terceira pessoa alcança `39°` para conservar a leitura da silhueta à distância. Em repouso, um ciclo de `2,8 s` move a suspensão em apenas `±1,3°`. Não há rotação aleatória, mola infinita, abertura da tampa ou balanço contínuo depois da ação.

O braço do jogador recebe uma animação aditiva separada de `0,98 s`, com peso `0,30` em primeira pessoa e `1,0` em terceira. A malha continua vinculada ao item slot; nenhum canal `rightitem` é usado para corrigir pose.

## Fumaça 1.2.2

A fumaça preserva a vantagem visual das poções prolongadas — memória no espaço — sem copiar uma nuvem circular no chão e sem carregar qualquer efeito de gameplay. O gate da 1.2.1 reprovou cerca de quatorze partículas pequenas e pouco opacas como insuficientes para incensação de altar ou consagração. A 1.2.2 troca essa economia excessiva por uma frase em três escalas: coluna próxima, rastro do arco e atmosfera residual.

```text
repouso: 2 fios discretos a cada 1,4 s

uso: emissor móvel por 0,86 s
├── cerca de 18–19 partículas do rastro
├── véu residual no instante 0,16 s: 6 partículas
├── véu residual no instante 0,41 s: 6 partículas
└── véu residual no instante 0,68 s: 6 partículas

partículas já emitidas: world-space, subida lenta e dissipação individual
```

### Camadas

| Camada | Quantidade e vida | Função visual |
| --- | --- | --- |
| `thurible_idle_smoke` | duas partículas; `3,8–5,4 s` | formar uma coluna estreita e reconhecível sem competir com o gesto |
| `thurible_action_smoke` | `22/s` por `0,86 s`, máximo `24`; `4,8–6,8 s` | desenhar continuamente o caminho do vaso durante a oscilação |
| `thurible_residual_smoke` | três grupos de seis; `8–11 s` | construir massas amplas e persistentes sobre altar, presbitério ou percurso |

Repouso e rastro usam `textures/particle/incense_smoke`, flipbook autoral de oito quadros em `128×16`; o véu usa `textures/particle/incense_veil`, oito quadros de `32×32` num atlas `256×32`. O atlas maior permite massas difusas de até aproximadamente um bloco sem pixelar a coluna junto ao vaso. Cor, alfa, tamanho, rotação e deriva variam por partícula. O repouso conserva `particle_appearance_lighting`; rastro e véu omitem lighting e usam cinza quente médio para permanecerem legíveis em igrejas escuras sem parecer emissão luminosa. A fresta do vaso continua âmbar escuro, não uma fonte de brilho mágico.

Invariantes de VFX:

- os efeitos declarados nos estados do animation controller usam somente `effect` e `locator`; o vínculo ao ator é implícito e `bind_to_actor` é inválido nesse schema;
- o emissor acompanha `thurible_smoke`, mas cada partícula emitida permanece em world-space;
- não há `particle_motion_collision`, disco no chão, raio de efeito, comando, entidade ou área persistente de gameplay;
- nenhuma fumaça nasce do rosto, da mão ou do centro do jogador;
- o repouso nunca cresce até competir com o altar ou encobrir a câmera;
- uma ação precisa tornar o arco legível; duas ou três constroem volume no espaço por sobreposição natural, sem combo ou estado persistente;
- os véus expandem e sobem; não permanecem como círculos no chão nem reproduzem a semântica visual de área de efeito;
- bordas continuam difusas e o alfa individual permanece moderado, mesmo com maior densidade total;
- tirar o item da mão impede novas emissões; partículas já soltas terminam apenas o próprio fade.

## Áudio

`aspergillum.thurible.swing` é um cue espacial curto, emitido pela timeline no início da transferência de peso. A família usa três variações metálicas existentes em volume `0,28` e alcance máximo de `10` blocos. Esse reuso é deliberado: evita introduzir mídia sem proveniência apenas para a série v1.2 e mantém o som abaixo da fumaça e do gesto visual.

O som é apresentação não transacional: sua falha não cancela a oscilação, e a oscilação não muda estado de mundo. Uma gravação dedicada de correntes pode substituir a mídia no futuro sem alterar o identificador público.

## Critérios de aceitação em jogo

- argola permanece no punho e o vaso fica pendente, sem atravessar mão, braço, torso ou chão;
- três correntes e corrente central continuam reconhecíveis em primeira e terceira pessoa;
- pêndulo descreve um arco único, com peso no retorno e sem estalo nos extremos;
- tampa não se separa do vaso e o contrapeso não parece um segundo objeto solto;
- fumaça nasce na tampa durante todo o arco e abandona o instrumento no espaço;
- o rastro não vira linha rígida, explosão, nuvem de poção ou fumaça preta de incêndio;
- o véu permanece legível por alguns segundos em nave, presbitério e procissão, mas não bloqueia rostos à curta distância;
- ações repetidas tornam a cena mais rica sem queda perceptível de desempenho;
- uso em altar/bloco e uso no ar acionam exatamente uma oscilação;
- ataque e mineração não causam dano ou quebra;
- observador remoto vê gesto, fumaça e cue uma única vez;
- Content Log não registra erro de item, custom component, geometria, locator, controller, partícula, som ou Molang.

Qualquer alteração de escala, pivô, hierarquia, arco, densidade, lifetime, paleta ou divisão entre locator e world-space exige atualização deste contrato. Ajustes de pose devem ocorrer em `thurible_presentation`, nunca no bone vinculado.
