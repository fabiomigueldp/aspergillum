# Design System

## Direction

Um jogador prepara um aspersório de prata numa sacristia de pedra iluminada por velas. A peça repousa sobre nogueira encerada e tecido verde profundo; latão envelhecido aparece apenas nas ferragens. O resultado é quente, tátil e silencioso, sem aparência mágica.

## Color Strategy

Estratégia restrita. Madeira e neutros quentes ocupam a maior parte do bloco; verde de tecido organiza a área de trabalho; prata fria identifica o instrumento; latão é um acento pequeno.

| Papel | Referência | Uso |
| --- | --- | --- |
| Nogueira profunda | `oklch(32% 0.045 52)` | estrutura, pernas e gaveta |
| Madeira iluminada | `oklch(45% 0.060 58)` | bordas e veio superior |
| Verde de tecido | `oklch(35% 0.055 155)` | apoio do aspersório |
| Prata fria | `oklch(70% 0.010 170)` | instrumento e ferragens funcionais |
| Latão envelhecido | `oklch(59% 0.095 78)` | puxador e detalhes menores |
| Vinho escuro | `oklch(34% 0.070 25)` | uma das opções de empunhadura |

Os PNGs gerados usam aproximações sRGB dessas referências e mantêm neutros levemente aquecidos, nunca preto ou branco puros.

## Materials

- Madeira: veio discreto, variação ampla e acabamento encerado sem ruído de alta frequência excessivo.
- Tecido: verde desaturado, trama mínima e alta rugosidade.
- Prata: contraste de face, bordas legíveis e roughness distinta entre polida e envelhecida.
- Latão: usado em menos de dez por cento da superfície visível.
- Couro: castanho, vinho e preto aquecido, todos com leitura de enrolamento.

## Interface

A GUI usa componentes nativos de `@minecraft/server-ui`, localização por `RawMessage`, cabeçalhos curtos, espaçadores de ritmo e dropdowns com descrição. A própria seleção e a prévia física do item confirmam mudanças imediatas; texto persistente não repete o que os controles já comunicam. Divisores representam somente grupos reais, nunca são usados como espaço vazio. Não existe custo, botão de compra ou campo numérico.

Hierarquia:

1. Perfil de aspersão.
2. Acabamento metálico.
3. Empunhadura.
4. Restauração, retirada e fechamento.

## Interaction States

- Livre: apoio vazio e mensagem para acomodar o aspersório.
- Ocupada: item visível e menu disponível.
- Em uso: lock por bloco; outro jogador recebe feedback localizado.
- Alterada: a prévia física muda imediatamente; falha recebe action bar localizada.
- Falha: snapshot e permutação anteriores são restaurados.
- Quebra: mesa e item exato são recuperados separadamente.

## Motion and Feedback

Mudanças usam somente atualização imediata da prévia. Não há demonstração encoberta pelo menu, bounce, brilho contínuo, partículas ociosas ou sequência de abertura.

## Constraints

- Nenhuma Beta API ou Creator Feature experimental.
- O perfil Clássico preserva integralmente a física 1.0.20.
- Nenhuma escolha depende exclusivamente de hover.
- Modelos e mapas PBR são gerados de fontes em `assets-src/`.
- Acabamentos publicados tornam-se compatibilidade de mundo e exigem IDs estáveis.
