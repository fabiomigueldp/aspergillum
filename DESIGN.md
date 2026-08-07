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

A GUI usa componentes nativos de `@minecraft/server-ui`, localização por `RawMessage`, cabeçalhos curtos, divisores e dropdowns com descrição. Seleções são aplicadas imediatamente e confirmadas por uma linha de estado. Não existe custo, botão de compra ou campo numérico.

Hierarquia:

1. Identidade do item e cargas.
2. Perfil de aspersão.
3. Acabamento metálico.
4. Empunhadura.
5. Demonstração, restauração e retirada.

## Interaction States

- Livre: apoio vazio e mensagem para acomodar o aspersório.
- Ocupada: item visível e menu disponível.
- Em uso: lock por bloco; outro jogador recebe feedback localizado.
- Alterada: prévia física muda imediatamente e o status confirma a escolha.
- Falha: snapshot e permutação anteriores são restaurados.
- Quebra: mesa e item exato são recuperados separadamente.

## Motion and Feedback

Mudanças usam somente som curto e atualização imediata da prévia. A demonstração do spray é bounded, puramente cosmética e possui cooldown próprio. Não há bounce, brilho contínuo, partículas ociosas ou sequência de abertura.

## Constraints

- Nenhuma Beta API ou Creator Feature experimental.
- O perfil Clássico preserva integralmente a física 1.0.20.
- Nenhuma escolha depende exclusivamente de hover.
- Modelos e mapas PBR são gerados de fontes em `assets-src/`.
- Acabamentos publicados tornam-se compatibilidade de mundo e exigem IDs estáveis.
