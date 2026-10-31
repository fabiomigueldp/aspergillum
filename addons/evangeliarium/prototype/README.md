# Estudo de fluxo do leitor

24/10/2026. Abra `index.html` diretamente no navegador: os scripts são clássicos, os dados são locais e não existe `fetch`, fonte externa, dependência de build ou serviço de rede na leitura. Não é um pack Minecraft nem uma promessa de aparência final em pixels.

## O que funciona

- A primeira abertura mostra **Lucas 13,1–9**, identificado como **Exemplo**. Não representa uma escolha de calendário.
- Mateus, Marcos, Lucas e João estão completos: **89 capítulos, 3.779 versículos** da edição Bíblia Livre `porbr2018`.
- `Escolher` abre livro/capítulo e intervalo simples opcional de versículos. Campo vazio abre o capítulo inteiro. `16` e `1–18` são aceitos; intervalos entre capítulos, segmentos descontínuos e sufixos a/b/c ficam fora deste protótipo.
- `Anterior` e `Próxima` aparecem apenas onde têm destino. A navegação termina no trecho selecionado, sem saltar silenciosamente para outro capítulo/livro. O indicador só aparece com duas ou mais páginas.
- `Voltar`, Escape na seleção e o botão voltar do navegador retornam à leitura. Escolher outra passagem remove o rótulo `Exemplo`.
- `Marcar no livro` grava explicitamente a referência no `localStorage` deste navegador/origem. Reabrir retoma a passagem marcada, no início. Consultar uma passagem não muda a marca. É apenas demonstração local, sem objeto físico, jogador ou sincronização. Para restaurar o exemplo inicial, apague a chave `evangeliarium.prototype.bookmark.v1` no armazenamento do navegador. Bloqueio de armazenamento não impede leitura.
- Foco visível, controles em coluna, rótulos, erros associados ao campo e texto redimensionável. Créditos ficam fora da moldura de leitura.

## Limites deliberados

Não há calendário brasileiro, `Hoje`, resolução por data, celebrações, variantes de missa ou tradução litúrgica da CNBB. Texto integral dos quatro Evangelhos não significa calendário implementado. O exemplo não é anunciado como Evangelho do dia.

Não existem API do Minecraft, item, colocação/retirada, modelo 3D, braços, animação, inventário, multiplayer, locks, persistência do mundo ou sessões de jogo. Nenhum botão simula ações físicas inexistentes. Essas funções pertencem ao projeto do add-on e aos futuros diagnósticos.

A aparência usa HTML/CSS para estudar sequência e densidade; o produto usará formulários nativos do Minecraft. Uma coluna de componentes é plausível; tipografia, margens, cores, rolagem, foco e altura de botão dependem do cliente real. O banner externo explicita essa diferença. Não substitui testes no jogo, controle ou toque.

A paginação usa orçamento conservador de **850 caracteres**, com fronteira de versículo. Não é um limite da API. O maior versículo deste corpus é menor que o orçamento. Agrupamentos de até três versículos são uma convenção visual do estudo, pois a fonte VPL não fornece parágrafos editoriais. O texto original não é cortado, reescrito ou resumido. A quantidade confortável por página precisa ser calibrada no Minecraft.

## Proveniência e licença

**Bíblia Livre**, versão de fevereiro de 2018, `porbr2018`. **© 2018 Diego Santos, Mario Sérgio, e Marco Teles.** Licença **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**. [Projeto](https://sites.google.com/site/biblialivre/), [licença na origem](https://ebible.org/porbr2018/copyright.htm), [VPL](https://ebible.org/Scriptures/porbr2018_vpl.zip).

O ZIP integral da fonte permanece em `source/`, como evidência reprodutível; apenas os quatro Evangelhos entram em `data.js`. Códigos efetivos da origem: **MAT, MAR, LUK, JOH**. Não presumir MRK/JHN. A cópia da licença preserva a redação da origem; o link canônico da licença acima é CC BY 4.0.

O VPL fornecido já remove formatação, parágrafos, notas, introduções e títulos não canônicos, conforme `source/porbr2018_about.htm`. Nenhuma nota foi incorporada. Colchetes e palavras entre eles fazem parte do texto fornecido e permanecem. A única transformação de conteúdo é seleção/indexação; números e agrupamentos para exibição não pertencem ao texto de cada versículo. A assinatura PGP fornecida é preservada como evidência, **não foi verificada criptograficamente**. A verificação feita usa SHA-256 contra a cópia fixada.

ZIP SHA-256: `1f71b7765795ae7cc416a9255c7d9c3a3932ce868206fa762606c7438c8fc682`.

`source/manifest.json` registra hashes do ZIP, VPL, licença e dados gerados; também registra quantidades de versículos de cada capítulo. Aquisição em 24/10/2026. A data da captura não altera a identificação editorial 2018.

## Importação reproduzível

Requer Python 3, apenas biblioteca padrão. A partir da raiz do repositório:

```powershell
python addons/evangeliarium/prototype/import_corpus.py
python addons/evangeliarium/prototype/import_corpus.py --check
node --check addons/evangeliarium/prototype/app.js
node --check addons/evangeliarium/prototype/data.js
```

`--download` obtém apenas fontes ausentes; se o ZIP remoto mudar, o hash fixado recusa a nova edição. Atualizar a fonte exige revisão deliberada de proveniência e versificação. A importação não instala dependências nem modifica packs ou arquivos fora desta pasta. Não edite `data.js` à mão.

Validação: SHA-256 do ZIP, UTF-8 sem caracteres de substituição, quatro livros, capítulos sequenciais, ausência de referências duplicadas, versículos contínuos iniciando em 1, conteúdo não vazio, total por livro, reprodução byte a byte dos dados e manifest. Isso confere integridade da importação; não é uma certificação filológica da tradução nem aprovação litúrgica.

## Revisão manual

1. Sem marca anterior, abrir o exemplo e percorrer até o fim; botões inexistentes na primeira/última página devem estar ausentes.
2. Escolher João 1 inteiro, depois João 3,16. Confirmar capítulo completo e página única.
3. Tentar intervalo invertido ou além do capítulo: ficar no formulário com erro no campo.
4. Marcar uma passagem, consultar outra e recarregar: retomar a marcada.
5. Usar Tab, Enter e Escape; repetir em largura de celular sem rolagem horizontal.
6. Desconectar a rede: leitura/seleção/paginação continuam; somente links externos de créditos exigem internet.
