# Estratégia de testes e QA

## Princípio

Automação prova regras e estrutura; somente o Minecraft prova input, cache, animação, câmera, skin, rendering e integração real. Uma revisão não é aprovada por inspeção de JSON ou por “não haver erro de build”.

## Gate de compatibilidade runtime do inventário 3D — v1.2.5

- [x] os 16 `block_placer.block` são strings; nenhum descritor contém objeto/state;
- [x] os 16 proxies não possuem states ou permutations e declaram `item_visual` somente em `components`;
- [x] itens preservam `max_stack_size: 1`, custom component, IDs e ausência de PNG raster;
- [x] build direcionado, 130 JSONs, 149 texturas, documentação e Creator Tools aprovados; artefato com `3.096.416` bytes e SHA-256 `e62551816aeac54d1b8c7bfcadac334a92857ea2ab8ad778dbd896fb67bde06a`;
- [ ] importar somente `Aspergillum-1.2.5.mcaddon` e confirmar ausência de `item_visual is not allowed`, `block: invalid string`, `Missing icon`, custom component não usado e dynamic properties em stackable items;
- [ ] executar mesa, recuperação de snapshot, inicialização lazy, caldeirinha e quatro aspersões para provar que propriedades dinâmicas voltaram a operar;
- [ ] confirmar os 16 modelos e todas as travas de colocação nos mesmos cenários visuais/input da lista 1.2.4 abaixo.

## Gate do modelo 3D no inventário — v1.2.4 (rejeitado)

- [x] `package.json`, registro de releases e manifests convergem em `1.2.4`/`[1,2,4]`; `npm run package` passou com 98 testes do Add-On e 21 do viewer;
- [x] artefato final com `3.087.734` bytes e SHA-256 `752f9ad393240a0d9af73a79fcd1d6c7b503cdd5e4e35bed87840953be34df52`; Creator Tools aceitou 11 warnings offline conhecidos e nenhum inesperado;
- [x] os 16 itens não declaram `minecraft:icon`, referenciam o state cosmético correto do único proxy e preservam seus IDs publicados;
- [x] a geometria de inventário contém os mesmos 14 cubos e UVs do modelo equipado, usa formato `1.16.0` e não copia o binding do attachable;
- [x] os materiais apontam diretamente para os 16 color maps reais e seus texture sets PBR; o pack não contém PNGs nem aliases raster dos itens;
- [x] `use_on: minecraft:air`, filtro de suporte impossível e custom component cancelável protegem contra colocação do proxy;
- [ ] fechar o Minecraft, remover revisões/cache concorrentes e importar somente `Aspergillum-1.2.4.mcaddon`;
- [ ] comparar os 16 modelos em inventário Criativo, hotbar, baú e Mesa do Sacristão, em UI clara/escura e gráficos clássicos/Vibrant Visuals;
- [ ] confirmar silhueta inteira, escala útil, inclinação consistente, perfurações e distinção dos quatro metais/quatro cabos, sem clipping ou miniatura excessivamente estreita;
- [ ] usar cada rota de interação sobre ar, chão, parede, caldeirinha e mesa; nenhum gesto pode colocar `aspergillum:inventory_visual` ou consumir o item;
- [ ] repetir carregar, quatro aspersões, personalizar, acomodar/retirar, quebrar, reload, inventário cheio e persistência; exportar Content Log limpo.

## Gate da identidade localizada — v1.2.3

- [x] `assets-src/branding/pack-identity.json` define exatamente `en_US` e `pt_BR`, com nome e descrição distintos para Behavior e Resource Pack;
- [x] ambos os manifests usam somente `pack.name` e `pack.description`, e nenhum arquivo `.lang` conserva `pack.aspergillum.*`;
- [x] testes e validadores rejeitam divergência entre contrato, manifests, `languages.json` e os quatro arquivos `.lang`;
- [ ] importar apenas `Aspergillum-1.2.3.mcaddon` e confirmar **Aspergillum — Comportamento/Recursos** em `pt_BR` e **Aspergillum — Behavior/Resources** em `en_US`;
- [ ] nome e descrição aparecem traduzidos nos dois seletores, sem token `pack.*`, corte indevido, ícone antigo ou cache concorrente;
- [ ] registrar versão, hash, locale, capturas de BP/RP e Content Log; repetir o smoke funcional da 1.2.2.

## Gate automatizado da release — v1.2.3

- [x] `package.json`, registro de releases e ambos os manifests convergem em `1.2.3`/`[1,2,3]` sem alterar UUIDs;
- [x] tipos, 98 testes do Add-On, 21 testes do viewer, 43 documentos, geração e validadores passam no gate completo;
- [x] duas construções da árvore aprovada produzem `3.105.394` bytes e SHA-256 `be689665739129f1fbff803eb51e64b451c3fd6f015b598b2d24f356e1164983`;
- [x] Creator Tools aceita somente os onze warnings offline conhecidos, sem warning inesperado, Error ou Failure;
- [ ] importar o artefato exato e concluir o gate físico de identidade, smoke persistente e Content Log.

## Gate automatizado da release — v1.2.2

- [x] TypeScript, 85 testes do add-on e 21 testes do viewer foram aprovados durante o desenvolvimento das duas frentes;
- [x] `npm run package` regenerou assets/áudio, compilou o bundle estável, aprovou validação estrutural, animação, VFX, áudio, ícones e prontidão da release;
- [x] `Aspergillum-1.2.2.mcaddon` tem `3.105.396` bytes e SHA-256 `e48f9124e109c3fcea768de6c37b0150cf1f288efd36781c32d80580f4937798`;
- [x] Creator Tools aceitou somente os onze warnings offline conhecidos, sem warning inesperado, Error ou Failure;
- [ ] importar o artefato exato e concluir os gates físicos de partículas, inventário, smoke persistente e Content Log abaixo.

## Gate das partículas de quebra — v1.2.2

- [x] o gerador cria deterministicamente dois tiles opacos de `16 × 16`, e o validador confere dimensões, aliases, componentes, contagens e `tint_method: "none"`;
- [x] o tile da caldeirinha contém somente seis tons metálicos neutros/patinados; o tile da mesa contém exatamente 240 pixels de madeira, doze de veludo e quatro de latão;
- [x] água e cores do aspergillum acomodado não entram nos tiles; as dezesseis variantes reutilizam a mesma textura estrutural por bloco;
- [ ] com o Content Log limpo, bater e quebrar caldeirinha vazia, cheia e ocupada; os fragmentos durante os golpes e no estouro final devem parecer metal, sem ciano, couro ou dourado do item;
- [ ] bater e quebrar Mesa do Sacristão vazia e ocupada; o efeito deve ser predominantemente madeira escura, com raros acentos verdes e de latão, nunca um mosaico do aspergillum;
- [ ] repetir em Sobrevivência e Criativo, nas dezesseis rotações, com gráficos clássicos e Vibrant Visuals; a contagem deve ser legível sem encobrir o objeto e o Content Log não deve registrar textura ou componente desconhecido;
- [ ] confirmar que quebra, recuperação do item acomodado, água, drops, inventário cheio e persistência permanecem idênticos à 1.2.1 no pacote final 1.2.2.

## Gate dos ícones de inventário — v1.2.2

- [x] `npm run render:inventory-icons -- --apply` deriva os dezesseis PNGs da geometria e dos mapas PBR reais, grava fontes `32 × 32`, manifest com câmera/hashes e uma prancha 4×4;
- [x] o validador exige fundo transparente, margem segura, cobertura, contraste interno, bytes fonte/pack idênticos e assinaturas distintas nas regiões projetadas de cabeça e cabo;
- [x] o item preserva as mesmas dezesseis chaves de `minecraft:icon`; attachables, IDs, índices cosméticos, binding, geometria e poses não mudam;
- [ ] depois de integrar as demais mudanças da 1.2.2 e gerar o pacote final, limpar revisões/cache anteriores e comparar os dezesseis ícones em escala normal no inventário Criativo, hotbar, baú e Mesa do Sacristão;
- [ ] em UI clara e escura, confirmar silhueta 3D reconhecível, perfurações e pomo sem corte; prata/envelhecida/dourada/bronze e castanho/vinho/preto/marfim devem ser distinguíveis sem depender somente do nome;
- [ ] comparar inventário, primeira pessoa, terceira pessoa, item acomodado e mesa: todos devem representar o mesmo acabamento, sem regressão funcional ou novo erro no Content Log.

## Gate da identidade visual — v1.2.1

- [x] `npm run render:cover -- --size 2048` gera capa e prova nativa de 256 px com assunto `docked`, PBR, água cheia e cobertura alfa acima de 4%;
- [x] duas execuções com as mesmas opções produzem PNGs byte a byte idênticos;
- [x] `assets-src/branding/cover-manifest.json` registra versão 1.2.1, câmera, geometria, acabamento, água, fonte, bytes e SHA-256 corretos;
- [x] `npm run build` publica `assets-src/branding/aspergillum-cover-256.png` sem recompressão e os dois `pack_icon.png` permanecem byte-idênticos à fonte;
- [x] `npm run check`, build do viewer, `npm run package` e Creator Tools passam sem warning inesperado, Error ou Failure;
- [ ] importar somente `Aspergillum-1.2.1.mcaddon`, confirmar manifests `[1,2,1]`, UUIDs oficiais e o SHA publicado em [Release 1.2.1](releases/1.2.1.md);
- [ ] na tela de armazenamento e no seletor de packs, confirmar título legível, silhueta reconhecível, água ciano e ausência de corte ou ícone antigo após limpar o cache;
- [ ] executar o smoke de carga, quatro aspersões, docking, mesa, quebra e reload; a mudança de identidade não altera gameplay nem Content Log.

## Gate da matriz de acabamentos — v1.2.0

- [x] catálogo, domínio e validadores expõem exatamente quatro metais × quatro empunhaduras e bloqueiam qualquer alteração dos pares/índices históricos `0..8`;
- [x] os dezesseis IDs de item/attachable, materiais da caldeirinha/mesa, texture sets, ícones e chaves `pt_BR`/`en_US` são gerados e validados;
- [x] caldeirinha e mesa publicam respectivamente `9.216` e `512` combinações, sem state individual acima de dezesseis valores;
- [x] `npm run check` passa com tipos, testes, viewer, documentação, build e validadores verdes;
- [x] capturas `--subject all --cosmetic all` em PBR e clássico mostram uma matriz visual 4×4, em ordem metal × empunhadura, sem alterar silhueta ou composição;
- [x] `npm run package` reproduz duas vezes o mesmo SHA-256, e o Creator Tools aceita somente os onze warnings offline conhecidos;
- [ ] importar somente `Aspergillum-1.2.0.mcaddon`, conferir manifests `[1,2,0]`, UUIDs oficiais e o SHA publicado em [Release 1.2.0](releases/1.2.0.md);
- [ ] numa cópia de mundo 1.1.10, conferir que itens e blocos nos índices `0..8` mantêm exatamente seus acabamentos após o upgrade;
- [ ] aplicar os dezesseis pares pela Mesa do Sacristão e verificar ícone, mão, terceira pessoa, mesa e caldeirinha; retirada, reload, quebra e inventário cheio não perdem nem duplicam item;
- [ ] comparar prata/envelhecida/dourada/bronze e castanho/vinho/preto/marfim na escala real do inventário, sem depender somente do texto;
- [ ] repetir em gráficos clássicos e Vibrant Visuals; nenhuma variante altera geometria, binding, pose, UV ou gameplay;
- [ ] limpar o Content Log e executar o smoke completo de água, cargas, quatro aspersões, docking, mesa, persistência e ciclo de vida sem novo erro/warning do add-on.

## Gate de polimento — v1.1.10

- [x] viewer testa catálogo, ordem de acabamentos, assuntos e nove câmeras e conclui build Vite;
- [x] capturas `empty|low|mid|high|full` registram `geometry.aspergillum.aspersorium_water_visual` no manifest schema 2 e mostram composição coerente em vistas oblíqua/superior;
- [x] reconciliação da entidade cobre criação, quatro níveis, recentralização, atualização, deduplicação, remoção diferida, órfão e entity load;
- [x] gate de ícones exige assinatura opaca de grip, contraste interno e distância mínima entre metais/empunhaduras;
- [x] executar a matriz `--subject all --cosmetic all` em PBR e clássico com o pacote final; manifests e pranchas em `out/model-captures/1.1.10-all-finishes-{pbr,classic}`;
- [ ] importar somente `Aspergillum-1.1.10.mcaddon`, confirmar manifests `[1,1,19]` e SHA `f9c9fbdf313ed324d3ab02f2892d1bf9a0ae90220f92127a81fd0e4c3f09844f` publicado em [Release 1.1.10](releases/1.1.10.md);
- [ ] limpar o Content Log e repetir encher, `16→12→8→4→0`, carregar, quatro aspersões, docking, retirada, mesa, nove acabamentos, quebra e reload;
- [ ] comparar os nove ícones no inventário/UI em escala normal e confirmar castanho/vinho/preto sem depender do nome;
- [ ] testar clássico e Vibrant Visuals; nenhum acabamento pode alterar silhueta, UV, pose, binding ou geometria.

## Gate histórico da release oficial — v1.1.9

**Decisão:** GO em 2026-08-10, conforme [registro de promoção](releases/1.1.9.md). A lista abaixo permanece como runbook reproduzível. Itens sem evidência registrada não são retroativamente marcados como executados; upgrade de cópia 1.1.7 e profiler 1/16/64/256 seguem como monitoramento pós-release.

- [ ] preservar o mundo original e criar uma cópia que esteja usando a release 1.1.7; fechar o jogo e importar somente `Aspergillum-1.1.9.mcaddon`;
- [ ] confirmar manifests `[1,1,18]` e SHA-256 `b0f2a02440f6ef2e551e2cd69699f4fde29b49be0272287f41c750a5117192da`;
- [ ] confirmar que os UUIDs oficiais dos packs continuam `bac9f8bc-71f5-4db7-a0ff-3c5a365749b4` e `fdb8a79c-8f77-4831-9a5c-8e2b8ecca29e`, de modo que o mundo atualize os packs em vez de empilhá-los;
- [ ] limpar o Content Log antes de abrir o mundo e confirmar ausência de `actor_definitions`, `failed to load from JSON`, `minecraft:pushable`, `not present in the Schema` e `not a valid entity type`;
- [ ] abrir caldeirinhas preexistentes vazia/¼/½/¾/cheia; cada bloco não vazio deve ganhar exatamente uma projeção correta em no máximo seis segundos, sem alterar suas unidades;
- [ ] limpar o Content Log e confirmar ausência das duas mensagens de `MaterialInstances`, além de qualquer erro/warning envolvendo `aspersorium_water_visual`, `water_visual_level`, render controller, geometria ou propriedade;
- [ ] comparar lado a lado com imagens equivalentes da 1.1.7b: cor, translucidez, textura, espessura, reflexo, profundidade e integração com metal/aspersório em sol, sombra e luz quente;
- [ ] orbitar vazio/¼/½/¾/cheio em câmera parada e em movimento, curta/média/longa distância, gráficos convencionais e Vibrant Visuals;
- [ ] confirmar a sequência `16→12→8→4→0` e mudanças imediatas entre as quatro alturas, sem superfície residual no zero;
- [ ] acomodar os nove cosméticos com `0..4` cargas, retirar, renomear, recarregar o mundo e confirmar que água, item e snapshot permanecem exatos;
- [ ] quebrar vazio, cheio e ocupado; testar explosão e `/setblock ~ ~ ~ air destroy`; nenhuma entidade de água pode permanecer no local;
- [ ] executar `/kill @e[type=aspergillum:aspersorium_water_visual]` junto a uma caldeirinha cheia e confirmar recriação correta em no máximo seis segundos, sem alterar suas unidades;
- [ ] sair e reentrar no mundo e descarregar/recarregar chunks: existe exatamente uma entidade por caldeirinha não vazia e nenhuma por caldeirinha vazia;
- [ ] testar multiplayer com observador remoto: mesma altura/translucidez e nenhuma oscilação, duplicação ou entidade selecionável;
- [ ] medir profiler e contagem de entidades com 1, 16, 64 e 256 caldeirinhas carregadas; registrar CPU/tick e memória antes de autorizar promoção;
- [ ] executar o smoke test completo de item, carga, aspersão, docking, Mesa do Sacristão, quebra e persistência;
- [ ] repetir reload e descarregamento de chunk, remover a projeção com `/kill @e[type=aspergillum:aspersorium_water_visual]` e confirmar autorreparo sem duplicação ou mudança lógica;
- [ ] medir custo com 1, 16, 64 e 256 caldeirinhas não vazias carregadas, registrando entidades, CPU/tick e memória; a medição de 256 é stress, não uma expectativa de construção normal;
- [ ] executar smoke test de carga, aspersão, docking, retirada, quebra, Mesa do Sacristão, cosméticos e persistência no mundo migrado;
- [x] registrar hash, Content Log observado e decisão GO no [registro da release](releases/1.1.9.md); plataforma/capturas adicionais permanecem no [runbook histórico](RELEASE_CANDIDATE.md).

## Gate da água alpha-test com UV corrigido — v1.1.8d

- [ ] importar somente `Aspergillum-1.1.8d.mcaddon` num mundo novo, sem A/B/C ou packs anteriores ativos;
- [ ] confirmar manifest `[1,1,14]` e hash publicado no [diagnóstico 1.1.8](diagnostics/1.1.8-water-dither-matrix.md);
- [ ] limpar Content Log, executar `/function aspergillum/dev_kit` e comparar caldeirinhas vazias/cheias com os mesmos FOV, rotação, luz e pontos de câmera;
- [ ] inspecionar separadamente os quatro níveis, sem item e com aspersórios clássico/dourado acomodados;
- [ ] orbitar parado e em movimento por topo, diagonais e ângulos rasantes, procurando grade, tecido, pixels agrupados, moiré, shimmer, recorte ou mudança de densidade;
- [ ] aproximar até o plano próximo e afastar por aproximadamente 1, 4, 8, 16 e 32 blocos, registrando qualquer transição abrupta para opaco;
- [ ] confirmar que bordas, corpo, pomo, haste e seis níveis da cabeça permanecem sólidos, sem falhas nas quatro laterais, topo ou base;
- [ ] confirmar que o defeito A/B de um quadrante invisível e três sólidos desapareceu; a máscara deve se distribuir em detalhes pequenos por toda a superfície, nunca em quatro regiões ampliadas;
- [ ] avaliar a cobertura D=81,25% pela leitura de líquido e legibilidade do item, sem privilegiar limpeza de log sobre qualidade visual;
- [ ] repetir em gráficos convencionais e Vibrant Visuals quando disponível;
- [ ] confirmar ausência das mensagens `All MaterialInstances must use the same render_method for a given block` e `MaterialInstances can't mix and match opaque and transparent materials`; qualquer mensagem nova de material/renderização reprova o candidato;
- [ ] executar smoke de encher, carregar quatro vezes, aspergir, acomodar, retirar, quebrar, mesa, reload e persistência;
- [ ] preencher a tabela de resultados do diagnóstico com plataforma, GPU, versão Bedrock, capturas equivalentes e Content Log antes de qualquer promoção.

## Gate oficial da separação material — v1.1.7

- [ ] fechar o jogo, remover packs ativos anteriores e importar somente `Aspergillum-1.1.7.mcaddon` com manifests `[1,1,10]`;
- [ ] confirmar que estrutura da caldeirinha e aspersório acomodado permanecem opacos, enquanto os quatro níveis de água preservam translucidez equivalente à diagnóstica B;
- [ ] acomodar clássico e dourado em caldeirinha vazia/cheia; orbitar topo, base e quatro lados em ângulos rasantes sem revelar ouro ou superfícies inferiores indevidas;
- [ ] aproximar a câmera até o plano próximo e afastá-la progressivamente; não pode surgir falha, recorte, cintilação, transparência estrutural ou comportamento semelhante à diagnóstica C;
- [ ] repetir em gráficos convencionais e Vibrant Visuals quando disponível, registrando plataforma, GPU e versão do Bedrock;
- [ ] aceitar exclusivamente as mensagens conhecidas `All MaterialInstances must use the same render_method for a given block` e `MaterialInstances can't mix and match opaque and transparent materials`; qualquer outra mensagem atribuível ao add-on reprova o gate;
- [ ] repetir o smoke funcional: encher, carregar, aspergir quatro vezes, acomodar, retirar, quebrar, mesa, nove acabamentos, três perfis, reload e persistência;
- [ ] registrar SHA-256, capturas equivalentes e Content Log antes de declarar a 1.1.7 aprovada.

## Gate da matriz de renderização — v1.1.7a/b/c

- [ ] importar `Aspergillum-1.1.7a.mcaddon`, `Aspergillum-1.1.7b.mcaddon` e `Aspergillum-1.1.7c.mcaddon`, confirmando nomes/ícones distintos e manifests `[1,1,7]`, `[1,1,8]` e `[1,1,9]`;
- [ ] criar três mundos novos equivalentes e ativar somente um par BP/RP diagnóstico em cada mundo; não ativar duas variantes simultaneamente nem usar mundo persistente;
- [ ] confirmar os hashes publicados em [diagnóstico 1.1.7](diagnostics/1.1.7-render-pipeline-matrix.md) antes de iniciar;
- [ ] limpar o Content Log, executar `/function aspergillum/dev_kit` e colocar duas caldeirinhas com a mesma rotação, uma vazia e outra cheia;
- [ ] acomodar o aspersório clássico e o dourado, repetindo os mesmos pontos de câmera, FOV, distância e iluminação nas três variantes;
- [ ] orbitar lentamente por topo, base, quatro lados e ângulos rasantes; registrar quadro a quadro se terraços metalizados desaparecem ou revelam ouro/superfície inferior;
- [ ] na A, ignorar a aparência opaca intencional da água e avaliar somente estabilidade da cabeça;
- [ ] na B, confirmar água translúcida, estrutura opaca e ausência/presença de erro ou warning runtime de `MaterialInstances`;
- [ ] na C, confirmar simultaneamente quatro paredes completas e estabilidade/instabilidade das vinte faixas externas; os 34 avisos offline de mais de cinquenta cubos são esperados somente neste diagnóstico;
- [ ] salvar capturas equivalentes e exportar o Content Log de A, B e C antes de interpretar o resultado;
- [ ] interromper novas correções se A também falhar ou se o resultado contradizer a matriz; atualizar o diagnóstico antes de alterar a versão oficial.

## Gate visual da cabeça, do pomo e da Mesa do Sacristão — v1.1.6

- [ ] fechar o jogo, remover revisões anteriores e importar somente `Aspergillum-1.1.6.mcaddon` com manifests `[1,1,6]`;
- [ ] confirmar Content Log sem erro/warning de `@minecraft/server-ui`, `@minecraft/common`, custom component, formulário, item, attachable, geometria, textura, tradução ou block state;
- [ ] fabricar/obter a Mesa do Sacristão, colocá-la nos dezesseis setores e confirmar frente da gaveta, colisão, seleção, som de madeira e impossibilidade de movimento por pistão;
- [ ] usar um aspersório nomeado, com `instance_id`, carga parcial e propriedade customizada; ele sai da mão, repousa inteiro e centralizado sobre o veludo, sem ultrapassar bordas, e abre a UI exatamente uma vez;
- [ ] orbitar frente, lados, trás e topo: o veludo preenche todo o nicho sem z-fighting, as bordas elevadas permanecem intactas e não existem os dois antigos apoios dourados no tampo;
- [ ] confirmar respiro visível abaixo de **Mesa do Sacristão**, abaixo de **Perfil de aspersão**, abaixo de **Acabamento** e acima de **Restaurar padrão**;
- [ ] confirmar que perfil e acabamento pertencem ao mesmo fluxo contínuo, sem faixa/divisor que pareça uma seção vazia entre eles; somente o grupo final **Concluir e retirar**/**Fechar** mantém divisor próprio;
- [ ] confirmar hierarquia compacta da UI: perfil, acabamento, restauração, conclusão e **Fechar**; não aparecem item/cargas, texto genérico de gratuidade, demonstração ou status persistente;
- [ ] em `pt_BR`, confirmar **Fechar** em vez de `Close`; em `en_US`, confirmar `Close`; nenhum texto fica cortado e o menu não exige rolagem indevida na mesma resolução das capturas 1.1.1;
- [ ] alternar `Clássico`, `Processional` e `Contido`; a seleção aplica imediatamente, persiste na lore e só afeta a próxima rajada;
- [ ] combinar os três metais com as três empunhaduras; as nove aparências atualizam o item sobre a mesa, o ícone, a mão, a terceira pessoa e a composição na caldeirinha;
- [ ] aproximar a câmera da extremidade prateada do cabo e movê-la lentamente em ângulos oblíquos: a antiga faixa preto/prateada não aparece; placa, aro vazado e couro permanecem estáveis, sem pixels alternantes, faces duplicadas ou cintilação;
- [ ] observar o aro por cima, por baixo e pelos quatro lados: ele envolve o couro sem buraco central aparente, tampas internas, linha preta, barras desconectadas ou mudança brusca de espessura;
- [ ] repetir a órbita com o item empunhado em primeira/terceira pessoa, no suporte de armadura, acomodado na caldeirinha e sobre a mesa; os mesmos dois estágios metálicos e a mesma emenda limpa aparecem em todas as apresentações;
- [ ] acomodar na caldeirinha um aspersório clássico e um dourado; orbitar lentamente por cima, por baixo e em ângulos rasantes, confirmando que anel inferior, domo inferior, corpo, domo superior, anel superior e terminal permanecem contínuos em todos os quadros;
- [ ] durante a órbita da caldeirinha, nenhuma tampa prateada/metalizada desaparece para revelar o corpo dourado ou a superfície situada abaixo; não há cintilação, moiré, triângulo, fenda central ou troca conforme a distância;
- [ ] usar mão, suporte de armadura e mesa como controles: a nova cabeça preserva exatamente a silhueta, as duas fileiras de perfurações e a distribuição de acabamentos anterior;
- [ ] na mesa e na caldeirinha, observar separadamente norte, sul, leste e oeste da cabeça: nenhum lado pode aparecer como aro vazio, perder o painel perfurado ou deixar o cenário visível através do volume;
- [ ] confirmar que prata clássica + couro castanho reproduz a aparência 1.0.20 e que **Restaurar padrão** volta a `standard/classic`;
- [ ] usar **Fechar**: configuração já aplicada persiste e o item permanece na mesa; reabrir mostra os valores atuais;
- [ ] **Concluir e retirar** devolve exatamente o mesmo item e libera a mesa; com inventário cheio, o item é dropado uma vez sem apagar o snapshot antes da recuperação;
- [ ] agachar com mão vazia recupera o item sem depender da UI; outro item na mão não retira;
- [ ] quebrar mesa ocupada, recarregar mundo e sair/reentrar recuperam/preservam exatamente um item, sem duplicação da loot table;
- [ ] dois jogadores tentam editar a mesma mesa: somente um abre/edita; morte, respawn, logout, troca de dimensão e quebra liberam o lock;
- [ ] acomodar cada aparência na caldeirinha preserva cargas restantes e projeta o acabamento correto; retirar volta o state cosmético a clássico;
- [ ] perfil `standard` reproduz a rajada aprovada; `processional` é mais aberto/lento e `contained` mais estreito/preciso, todos com uma carga, 36 gotas e seis pulsos;
- [ ] repetir smoke da 1.0.20: `12+4`, `14+4`, `16+4`, Creative finito, reload/quebra, FP/TP, áudio, bridge e cancelamento pré/pós-release;
- [ ] registrar hash do `.mcaddon`, plataforma, controles, gráficos, locale, resultado e Content Log antes de declarar GO.

## Gate de docking parcial — v1.0.20

- [ ] importar somente `Aspergillum-1.0.20.mcaddon` após fechar o jogo e remover revisões anteriores;
- [ ] confirmar manifests `[1,0,36]` e Content Log sem erro/warning de script, dynamic property, tradução, áudio ou block state;
- [ ] em Survival, Adventure e Creative, provar `12/16 + 4/4 → 16/16 + 0/4`, `14/16 + 4/4 → 16/16 + 2/4` e `16/16 + 4/4 → 16/16 + 4/4` após acomodar e retirar;
- [ ] confirmar HUD distinto para transferência integral, parcial, caldeirinha cheia e item vazio, sem `%` residual em `pt_BR`/`en_US`;
- [ ] confirmar que áudio molhado corresponde somente a `1..4` cargas efetivamente transferidas e zero transferência toca apenas o encaixe mecânico;
- [ ] reload, quebra, explosão e inventário cheio restauram exatamente as cargas restantes, nome, `instance_id`, cosmético, perfil e propriedades customizadas;
- [ ] snapshot V1 existente recupera item `0/4` sem duplicar a água previamente devolvida;
- [ ] falha/rollback não publica água, ocupação ou snapshot parcial; Espectador não acomoda nem retira;
- [ ] repetir agachar + usar e mão vazia em teclado/mouse, controle e toque; cada gesto produz um único commit;
- [ ] repetir smoke visual, animações, 36 gotas/seis pulsos, bridge e áudio da 1.0.19b.

## Gate de polimento visual — v1.0.19b

- [ ] importar somente `Aspergillum-1.0.19b.mcaddon` após fechar o jogo e remover revisões anteriores;
- [ ] confirmar nos manifests `[1,0,35]` e Content Log sem erro/warning de geometria, UV, textura, material ou tamanho de atlas;
- [ ] comparar item e composição acomodada em frente/trás/direita/esquerda/topo/base: couro, pomo, haste, férula, seis volumes da cabeça e terminal correspondem sem peça simplificada ou cor trocada;
- [ ] nas quatro faces laterais do corpo central, confirmar duas fileiras de perfurações retangulares e uma faixa equatorial metálica; nenhuma face pode ficar lisa ou depender de transparência;
- [ ] orbitar por cima e por baixo: anel inferior, domo inferior, corpo central, domo superior, anel superior e terminal mantêm paredes contínuas e mipmaps sem sangramento;
- [ ] em primeira pessoa, olhar para cima/frente/baixo com FOV mínimo/padrão/máximo: item permanece à direita da mira, não cresce perceptivelmente e não cruza o plano próximo;
- [ ] em terceira pessoa, repetir repouso/carregamento/aspersão com Steve/wide, Alex/slim e Persona: grip continua no punho e cabeça não cruza rosto, ombro ou tórax;
- [ ] inspecionar caldeirinha vazia e nos quatro níveis: metal martelado não vira ruído quadriculado, água não herda o material e bordas/handle conservam contraste;
- [ ] repetir em gráficos clássicos e Vibrant Visuals: prata, ouro e couro permanecem distinguíveis, sem dominante roxa, emissividade ou reflexo plástico excessivo;
- [ ] executar `npm run capture:models -- --subject all --size 1024 --material pbr` e comparar com `out/model-captures/polish-baseline-pbr` usando opções idênticas;
- [ ] repetir smoke 4/16, docking/undocking, reload/quebra, locator, 36 gotas/seis pulsos, animações e áudio da 1.0.19;
- [ ] registrar hash do `.mcaddon`, plataforma, FOV, skin, gráficos, resultado observado e Content Log antes de declarar GO.

## Gate visual — v1.0.19a

- [ ] importar somente `Aspergillum-1.0.19a.mcaddon` após fechar o jogo e remover revisões anteriores;
- [ ] confirmar nos manifests importados `[1,0,34]` e Content Log sem erro/warning de geometria, UV, textura ou material;
- [ ] em terceira pessoa, orbitar por baixo, por cima e pelos quatro lados: pomo, haste, férula, anel inferior da cabeça, anel superior e terminal mantêm paredes contínuas;
- [ ] repetir a órbita em repouso e durante carregamento/aspersão, sem face piscando, sumindo ou invertendo;
- [ ] repetir em primeira pessoa olhando para cima, frente e baixo; silhueta, mira e plano próximo permanecem idênticos à baseline aprovada;
- [ ] repetir com Steve/wide, Alex/slim e Persona; o cabo continua atravessando o punho e a cabeça não cruza corpo/rosto;
- [ ] confirmar couro somente no grip, prata no pomo/haste/cabeça e ouro somente na férula sob a cabeça;
- [ ] repetir em gráficos clássicos e Vibrant Visuals: PBR não altera a cor-base nem cria dominante roxa;
- [ ] confirmar que o Fidelity Renderer mostra `UV Bedrock-safe: per-face inteiro` e nenhuma incompatibilidade;
- [ ] nos dois viewers web, inspecionar especialmente os texels pretos da cabeça: cada região permanece retangular sobre a face, sem losango, triângulo, costura diagonal ou troca entre norte/sul;
- [ ] repetir smoke 4/16, docking, locator, 36 gotas/seis pulsos e áudio da 1.0.19 para provar ausência de regressão.

## Gate de áudio — v1.0.19

- [ ] importar somente `Aspergillum-1.0.19.mcaddon` após fechar o jogo e remover revisões anteriores;
- [ ] Content Log não contém erro/warning de evento, OGG, codec, caminho, definição ou chamada de áudio;
- [ ] ouvir todas as variantes por repetição suficiente de fill, load `1..4`, dock `0..4`, undock, dry, prepare e release;
- [ ] 200 aspersões válidas produzem exatamente 200 releases, nunca dois por ação;
- [ ] 100 cancelamentos antes do tick 5 produzem zero release molhado;
- [ ] 100 tentativas vazias produzem clique seco e zero release/água;
- [ ] `sprinkle.prepare`, `load.prepare` e `dry` são privados do executor em multiplayer;
- [ ] fill, commits, dock, retorno de água, undock e release são audíveis espacialmente por observadores;
- [ ] nenhuma família com mais de uma variante repete imediatamente na fronteira de ciclos;
- [ ] sons `1→4` comunicam magnitude crescente sem salto de volume desconfortável;
- [ ] troca de slot, dimensão, morte, logout e falha de cooldown não deixam cue tardio;
- [ ] animação, 36 gotas/seis pulsos, bridge, curvatura controlada, economia 4/16 e persistência não regrediram;
- [ ] registrar plataforma, saída de áudio, volume master, distância e resultado de cada família;

## Pipeline automatizado

`npm run check` deve cobrir:

- TypeScript contra `@minecraft/server` estável fixado;
- testes unitários do domínio;
- links e invariantes básicos da documentação;
- geração determinística de assets;
- bundle ESM;
- sintaxe, referências, manifests, geometrias, animações, partículas e PNGs.

`npm run package` também cria o `.mcaddon`, SHA-256 e relatórios oficiais em `dist/validation/<versão>/`.

### Evidência visual automatizada

`npm run capture:models -- --subject all` gera nove vistas fixas e uma prancha composta para o aspersório, a caldeirinha e a Mesa do Sacristão, vazias ou com o aspersório acomodado. O `capture-manifest.json` registra câmera, geometria, material, versão e opções. Essas imagens servem para revisão de silhueta, faces, UVs e comparação entre revisões; o gate dentro do Minecraft continua obrigatório para culling, shader, câmera, cache e integração reais.

`npm run capture:avatars -- --action sprinkle` monta a skin padrão no rig wide, vincula o attachable real a `rightItem` e captura dez tempos diagnósticos do swing vanilla + ação local. Para uma revisão de integração, gerar ao menos `front-right,grip-front,grip-inside,grip-outside,head` em terceira pessoa, `first-person` em `16:9`, o frame de release da aspersão e os pontos `0,46/0,54/0,78 s` da carga. Inspecione os PNGs macro individualmente em resolução integral; a prancha serve somente para trajetória. O manifest deve registrar `exactBinding: true`, `bindingError: 0`, `allFramesGripCentered: true`, `allFramesGripEngaged: true` e hashes idênticos quando os inputs não mudarem. `allFramesHeadClear` permanece um gate separado.

Checklist mínimo do Avatar Lab:

- [ ] preset padrão tem `128 × 128`, perfil wide e SHA-256 documentado;
- [ ] a vista `front` mostra rosto e frente da veste, `back` mostra nuca e costas, e direita/esquerda não estão trocadas;
- [ ] wide e slim mantêm seus pivôs próprios de `rightArm/rightItem`;
- [ ] `gripCenterOffset` permanece `[0,0,0]` em idle, carga e todos os frames da aspersão, com tolerância máxima de `0,05` unidade;
- [ ] `grip-front`, `grip-inside`, `grip-outside` e `grip-back` mostram couro/eixo atravessando o volume da mão; mero contato com a face externa reprova;
- [ ] `sprinkler_head` não intersecta `head/hat` em nenhuma amostra e a trajetória sai para fora do avatar;
- [ ] camadas externas não ocultam a mão nem o item;
- [ ] PBR e clássico usam a mesma geometria e pose;
- [ ] o viewmodel FP em `16:9` parte do canto inferior direito, cruza o centro na liberação e retorna continuamente;
- [ ] comparação antes/depois usa a mesma skin, modelo, ação, tempos, vistas, material, acabamento, resolução e flags;
- [ ] o pacote final repete FP/TP, Steve/Alex/Persona e clássico/Vibrant Visuals dentro do Minecraft.

`npm run render:cover -- --output out/cover-renders/<candidata>` monta uma capa autoral a partir da composição `docked` real e gera tanto a fonte em alta resolução quanto uma prova renderizada diretamente em `256 × 256`. Antes de aprovar uma candidata, verifique as duas imagens e confirme no `cover-manifest.json` a versão, geometria, câmera, acabamento, material, água, fonte e cobertura alfa. O comando não substitui `pack_icon.png`; depois de uma promoção explícita, o `.mcaddon` final ainda deve ser importado para conferir leitura, mipmapping e cache na interface real do Bedrock.

## Cobertura automatizada a expandir

### Cargas e políticas

- todas as 85 combinações de carga/água (`0..4 × 0..16`);
- normalização de negativos, frações, `NaN`, infinito, strings e valores acima do máximo;
- Survival/Adventure consomem; Creative retém; Spectator nega;
- zero cargas nunca asperge, inclusive em Creative;
- carga Creative parcial permanece parcial ao voltar a Survival;
- cálculo de load soma sobre o valor normalizado.

### Identidade e schema

- item bruto e schema ausente;
- migração `0 → 2` e `1 → 2`;
- schemas 2→3 e schema 3 normalizado;
- schema futuro preservado e sinalizado;
- clone de atualização preserva ID e propriedades;
- cópia independente recebe novo ID;
- lore `RawMessage` regenerada.

### Sessões e concorrência

- item A inicia e item B ocupa o slot;
- troca de slot, dimensão, modo, distância, morte e saída;
- bloco quebrado, substituído, esvaziado ou ocupado;
- duas tentativas do mesmo jogador;
- dois jogadores no mesmo bloco;
- rollback na falha da primeira e da segunda escrita;
- cleanup e expiração de sessões/locks.

### Aspersão e matemática

- reserva, commit no release e cancelamento pré/pós-release;
- cooldown vazio versus cooldown válido;
- 36 gotas, seis pulsos e valores finitos;
- leque horizontal simétrico e vertical limitado;
- slerp pelo menor arco, resposta e limite angular;
- primeiro pulso suavizado;
- transporte paralelo sem flip em olhar vertical;
- partículas emitidas não mudam com a câmera;
- troca de item/dimensão cancela apenas pulsos futuros.

### Docking

- transferência parcial conservativa nas 85 combinações `0..16 × 0..4`;
- snapshot V1 migra para zero e V2 preserva cargas restantes;
- nome, ID, cosmético, perfil e propriedades preservados;
- retirada com inventário cheio;
- quebra, explosão, reload e limpeza de snapshot;
- pistão recusado ou registro movido de forma íntegra.

### Personalização

- catálogo cartesiano `3 × 3`, resolução/fallback de IDs e paridade de índices;
- aquisição/liberação exclusiva por jogador e mesa;
- troca de tipo do ItemStack preservando ID, carga, nome e propriedades;
- atualização/rollback de snapshot e state visual;
- close versus concluir/retirar, quebra, inventário cheio e lifecycle cleanup;
- ausência da demonstração e invariantes de custo zero nas alterações reativas;
- freeze do perfil dentro de uma aspersão já iniciada.

## Gate de input v1.0.17a

- [ ] com caldeirinha livre, segurar o aspersório, agachar e usar acomoda o item e remove-o da mão;
- [ ] a confirmação “Aspersório acomodado na caldeirinha” aparece exatamente uma vez;
- [ ] usar sem agachar continua iniciando o carregamento e nunca acomoda acidentalmente;
- [ ] mão vazia numa caldeirinha ocupada retira exatamente um item preservado;
- [ ] repetir em teclado/mouse, controle e toque quando disponíveis;
- [ ] Content Log não registra erro de `onUseOn`, custom component ou acesso a `isSneaking`.

## Gate de persistência v1.0.17

- [ ] item antigo/schema 1 mantém carga e recebe lore traduzida após entrar no inventário;
- [ ] mudar o idioma do cliente entre `pt_BR` e `en_US` muda a lore sem recriar o item;
- [ ] item com nome customizado conserva nome e `instance_id` após acomodar, sair do mundo e retirar;
- [ ] cosmético/perfil e uma propriedade customizada de teste sobrevivem ao ciclo de docking;
- [ ] `water_level + charges > 16` recusa o encaixe sem mudar bloco ou item;
- [ ] bloco ocupado + aspersório informa ocupação; bloco ocupado + outro item solicita mão vazia;
- [ ] inventário cheio faz o item ser entregue na mão vazia, inventário ou chão sem perda;
- [ ] quebrar a caldeirinha ocupada entrega uma caldeirinha e exatamente um aspersório preservado;
- [ ] explosão e `/setblock ... destroy` não duplicam nem perdem o snapshot;
- [ ] pistão não move a caldeirinha;
- [ ] reload do mundo preserva snapshots; retirada limpa o shard correspondente;
- [ ] dois itens com ID duplicado no mesmo inventário terminam com IDs distintos;
- [ ] item com schema maior que 3 permanece byte-logicamente intocado e ações mutáveis são recusadas;
- [ ] Content Log não contém erro/warning de dynamic property, `RawMessage`, custom component ou loot.

## Smoke test por revisão

Antes de testes extensos:

1. remover packs antigos e fechar o jogo;
2. importar o `.mcaddon` exato da revisão;
3. criar mundo sem experimentos;
4. executar `/function aspergillum/dev_kit`;
5. confirmar item, bloco, receitas e Content Log sem erro;
6. preencher, carregar, aspergir quatro vezes, tentar vazio, acomodar, retirar e quebrar;
7. repetir uma vez em primeira pessoa e uma vez em terceira pessoa.

Se o smoke test falhar, interrompa a matriz e capture a menor reprodução possível.

## Gate de alinhamento Bedrock 26.40 — v1.0.18f

- [ ] importar somente `Aspergillum-1.0.18f.mcaddon` após fechar o jogo e remover revisões antigas;
- [ ] confirmar nos manifests importados `min_engine_version = [1, 26, 40]`, `@minecraft/server = 2.9.0` e `format_version = 2`;
- [ ] criar mundo sem Beta APIs, Upcoming Creator Features ou qualquer experimento;
- [ ] Content Log não contém erro de dependência, manifesto, custom component, Molang, animação, partícula ou som;
- [ ] repetir o smoke test 4/16 e as interações de aspersão, docking, retirada, quebra e reload;
- [ ] confirmar que binding, poses, grip, sessões, locks, snapshots, cooldown, 36 gotas/seis pulsos e bridge permanecem sem regressão;
- [ ] repetir primeira/terceira pessoa local e observador multiplayer disponível;
- [ ] registrar hash do `.mcaddon`, versão AppX/Bedrock e sinais observados antes de declarar GO.

## Gate do codec de água — v1.0.18g

- [ ] importar somente `Aspergillum-1.0.18g.mcaddon` após fechar o jogo e remover revisões anteriores;
- [ ] Content Log não contém `too many input elements`, `expected an object`, bloco/receita inexistente, componente não utilizado ou falha de `dev_kit`;
- [ ] `/function aspergillum/dev_kit` fornece item e caldeirinha sem erro;
- [ ] um balde produz 16 unidades e superfície cheia;
- [ ] quatro carregamentos completos produzem `16→12→8→4→0`, cada um concedendo `4/4`;
- [ ] docking com cargas parciais prova quantidades ímpares e atravessa corretamente a fronteira radix `8↔9`;
- [ ] quatro superfícies representam `1..4`, `5..8`, `9..12` e `13..16`;
- [ ] Criativo preserva água e carga; Survival/Adventure consomem; Spectator permanece negado;
- [ ] overflow acima de 16 é recusado sem alterar item, states ou snapshot;
- [ ] reload preserva exatamente a quantidade e não registra warning atribuível ao add-on;
- [ ] binding, poses, animações, 36 gotas/seis pulsos, bridge, sons e docking permanecem visualmente idênticos à 1.0.18f.

## Gate da revisão v1.0.18e — capacidade 4/16

- [ ] importar somente `Aspergillum-1.0.18e.mcaddon` após fechar o jogo e remover revisões antigas;
- [ ] um balde produz 16 unidades lógicas e a superfície cheia;
- [ ] quatro carregamentos completos produzem `16→12→8→4→0`, cada um concedendo `4/4`;
- [ ] as superfícies mudam em `13..16` cheia, `9..12` ¾, `5..8` ½, `1..4` ¼ e `0` vazia;
- [ ] aspersões mostram `4/4`, `3/4`, `2/4`, `1/4`, `0/4`, sem `%` residual;
- [ ] item schema 2 com três cargas torna-se schema 3 com `3/4`, sem receber carga gratuita;
- [ ] no Criativo, carregar preserva a água exata e aspergir preserva a carga finita;
- [ ] acomodar devolve `0..4` unidades; soma acima de 16 é recusada sem alterar item ou bloco;
- [ ] animações, partículas, sons, binding, grip, sessões e snapshots permanecem idênticos à 1.0.18d;
- [ ] Content Log não contém erro de block state, bone `water_high`, Molang, lore ou schema.

## Gate da correção v1.0.18d — placeholders e tipografia localizada

- [ ] importar somente `Aspergillum-1.0.18e.mcaddon` após fechar o jogo e remover revisões antigas;
- [ ] inspecionar itens com `0/4`, `1/4`, `2/4`, `3/4` e `4/4`: nenhum valor contém `%` antes do número;
- [ ] carregar e aspergir nas mesmas quatro cargas: action bar mostra somente `n/4`, sem `%` residual;
- [ ] as quatro linhas da lore usam peso normal, sem inclinação itálica herdada;
- [ ] cinza, cinza-escuro, azul-claro e vermelho preservam a hierarquia aprovada;
- [ ] repetir em `pt_BR` e `en_US`, incluindo item existente criado antes da atualização;
- [ ] “Tem Propriedades Personalizadas/Has Custom Properties” pode conservar o estilo vanilla, mas as quatro linhas do add-on devem permanecer normais;
- [ ] Content Log não contém `RawMessageError`, chave ausente ou erro de tradução.

## Gate da correção v1.0.18c — compatibilidade runtime e recuperação do carregamento

- [ ] importar somente `Aspergillum-1.0.18d.mcaddon` após fechar o jogo e remover revisões antigas;
- [ ] Content Log não contém `Precomputed cubic interpolation requires keyframes have constant data` nem outro erro em `animation.aspergillum.player.load`;
- [ ] confirmar novamente que item e mão permanecem visíveis em 100% da carga em primeira pessoa;
- [ ] em terceira pessoa frontal, traseira e lateral, gravar a 60 FPS o intervalo da saída da água até o repouso;
- [ ] o braço percorre um único retorno, desacelera e alcança a pose-base sem teleporte ou solavanco final;
- [ ] não há segundo extremo, overshoot, rebote nem prolongamento perceptível depois do settle;
- [ ] grip e cabeça permanecem solidários ao braço, sem atravessar rosto ou ombro;
- [ ] commit continua ocorrendo uma vez no tick 10 e o gesto autoritativo termina em 16 ticks;
- [ ] cancelar/trocar item ou dimensão continua sem duplicar água, carga, som ou microgotas;
- [ ] Content Log não acusa `query.anim_time`, `variable.attack_time`, `variable.is_first_person`, `math.hermite_blend` ou animação desconhecida.

## Gate da correção v1.0.18a — carregamento em primeira pessoa

- [ ] importar somente `Aspergillum-1.0.18e.mcaddon`, fechar e reabrir o jogo antes do teste;
- [ ] em primeira pessoa, manter a câmera imóvel e carregar três vezes: item e mão permanecem visíveis do início ao settle;
- [ ] repetir olhando levemente para cima, em frente e para baixo: o item não cruza a mira, borda superior nem desaparece;
- [ ] confirmar que não existe reset, dupla partida ou pop no começo/fim;
- [ ] em terceira pessoa traseira, frontal e lateral, o arco de carga continua legível e não atravessa rosto/ombro;
- [ ] água e cargas mudam uma única vez no tick 10; cancelamento anterior não altera recursos;
- [ ] as duas microgotas e o som de commit continuam ocorrendo somente em carga válida;
- [ ] aspersão, docking, retirada e quebra permanecem idênticos à 1.0.18;
- [ ] Content Log não contém erro de Molang, animação, bone ou recurso do add-on.

## Gate do Release Candidate v1.0.18

- [ ] importar `Aspergillum-1.0.18g.mcaddon` após remover packs antigos;
- [ ] selecionar o item mostra quatro linhas de lore, incluindo agachar + usar e mão vazia;
- [ ] `pt_BR` e `en_US` traduzem lore e todas as mensagens do action bar no cliente correspondente;
- [ ] carregar com sucesso mantém animação/estado anteriores e acrescenta apenas duas microgotas discretas dentro da caldeirinha;
- [ ] falha de apresentação nunca altera carga, água, snapshot ou cooldown;
- [ ] carregar, aspergir, vazio, encher, acomodar, retirar, overflow e concorrência mantêm um único feedback coerente;
- [ ] Content Log não contém `RawMessageError`, sound event ausente, particle effect ausente ou erro do add-on;
- [ ] profiler com 1, 4, 8 e 16 jogadores é registrado antes de qualquer decisão de LOD;
- [ ] SHA-256 do pacote testado coincide com o entregue;
- [ ] decisão go/no-go é registrada em `docs/RELEASE_CANDIDATE.md` ou relatório derivado.

## Baseline de animação v1.0.15d — aprovada fisicamente

- [ ] malha real aparece em escala correta nas duas perspectivas;
- [ ] bound root acompanha integralmente a mão direita;
- [ ] cabo atravessa o punho em terceira pessoa com pose efetiva `[35, 0, -12]`;
- [ ] primeira pessoa mantém posição inferior direita e não bloqueia a mira;
- [ ] nenhuma face desaparece durante órbita completa;
- [ ] cada ação válida emite uma única rajada de aproximadamente 36 gotas;
- [ ] leque é mais largo horizontalmente e não forma halo/domo;
- [ ] câmera lenta durante a emissão curva os pulsos de forma suave e controlável;
- [ ] giro rápido fica limitado, sem estalo, inversão ou vetor inválido;
- [ ] câmera imóvel produz trajetória reta e repetível;
- [ ] gotas já emitidas não giram com a câmera;
- [ ] troca de item/dimensão cancela pulsos futuros;
- [ ] Survival/Adventure consomem exatamente uma carga;
- [ ] Creative preserva carga real e água, mas zero continua vazio;
- [ ] Spectator não interage;
- [ ] troca de item/slot/dimensão durante carga cancela sem alterar recursos;
- [ ] dois jogadores não carregam simultaneamente no mesmo bloco.
- [ ] carregamento executa gesto próprio de 0,8 s e confirma a transferência na imersão do tick 10;
- [x] braço executa um único swing vanilla de 0,9 s, sem reset nem segunda coreografia corporal;
- [ ] ponte de recuperação permanece invisível em primeira pessoa e neutra durante a primeira metade do swing;
- [x] em terceira pessoa, o follow-through alcança um único extremo e retorna continuamente à neutralidade antes do reset nativo;
- [ ] Content Log não acusa `variable.attack_time`, `variable.is_first_person`, `math.hermite_blend` ou bone desconhecido;
- [ ] trocar de item antes do tick 5 não consome carga nem emite água;
- [ ] trocar depois do release conserva a carga consumida e cancela apenas pulsos restantes;
- [ ] atravessar o olhar vertical não inverte subitamente o leque;
- [ ] primeira pessoa mantém o item visível em 100% dos frames da aspersão;
- [x] terceira pessoa apresenta um único início e um único retorno, sem reset ou solavanco final;
- [ ] `aspergillum_action` produz flick curto sem o cabo abandonar o punho;
- [ ] o flick local preserva a agilidade e assenta naturalmente antes do fim do swing nativo;
- [ ] água, som e commit começam juntos no tick 5;
- [ ] controller não dispara em ataque vazio nem ao reequipar durante cooldown residual;

Esses três itens foram confirmados pelo usuário no pacote 1.0.15d. Os demais continuam como regressão manual recorrente, não como pendência estrutural da animação.

## Baseline VFX v1.0.16c

- [ ] `holy_water_release` nasce na face da cabeça em primeira pessoa;
- [ ] `holy_water_release` nasce na face da cabeça em terceira pessoa local;
- [ ] observador remoto vê a mesma origem e apenas uma aspersão;
- [ ] o bridge de quatro microgotas é uma conexão curta, não um segundo leque;
- [ ] cada ação válida mantém exatamente uma rajada balística de 36 gotas em seis pulsos;
- [ ] ataque vazio não toca splash, não cria bridge e não cria gotas;
- [ ] preparação e release têm um único som próprio cada, sem splash duplicado;
- [ ] gotas mantêm área aparente legível em trajetórias frontais, laterais e oblíquas;
- [ ] billboards próximos da câmera permanecem menores que a cabeça do avatar;
- [ ] micro-splash é discreto, aparece somente no contato e não cria gameplay;
- [ ] bridge, gota e splash já emitidos ficam em world-space;
- [ ] steering lento/rápido continua com resposta `0.8` e limite `30°`;
- [ ] Content Log não acusa locator, efeito, evento, som ou Molang desconhecido.
- [ ] Content Log não contém `We do not support rotation being true and position being false`;
- [ ] o leque principal recupera visibilidade e suavidade equivalentes à 1.0.15d;
- [ ] a velocidade aparente é agradável sem perda do alcance anterior;
- [ ] o bridge lento permanece subordinado ao leque e não parece uma segunda ação.
- [ ] bridge, gotas distantes e micro-splashes permanecem azuis, sem dominante verde/amarela;
- [ ] repetir o teste cromático em sol, sombra, junto a tocha/fonte quente e com Vibrant Visuals quando disponível;
- [ ] a retirada de lighting local não transforma a água em um efeito branco ou excessivamente emissivo no escuro;
- [ ] fade continua suave e natural, sem mudança de trajetória, velocidade, lifetime ou tamanho em relação à 1.0.16a.
- [ ] a gota nasce azul aquático saturado, não branca/cinza ou ciano lavado;
- [ ] observar especificamente os últimos frames: nenhuma chave pode ser interpretada como amarelo/verde;
- [ ] o micro-splash no chão usa o mesmo idioma azul e desaparece sem mudança de matiz;

## Matriz final manual

### Modelos e câmera

- [ ] Steve/wide, Alex/slim e Persona;
- [ ] primeira pessoa, terceira traseira, frontal e lateral exata;
- [ ] FOV mínimo, padrão e máximo;
- [ ] 16:9, ultrawide e tela mobile;
- [ ] mão canhota, se suportada pela configuração testada.

### Movimento

- [ ] repouso, caminhada, corrida, agachamento e salto;
- [ ] voo, queda, natação, elytra e montaria;
- [ ] carregar/aspergir olhando horizontalmente, verticalmente e em diagonais;
- [ ] girar câmera lenta e rapidamente durante os pulsos.

### Bloco e inventário

- [ ] colocar em bloco, laje, mesa e pedestal; validar 16 rotações;
- [ ] níveis exatos `0..16` e quartos visuais `0`, `1..4`, `5..8`, `9..12`, `13..16`;
- [ ] acomodar/retirar repetidamente com nome e propriedades;
- [ ] transferência parcial satura em 16 e preserva o restante sem perda;
- [ ] inventário cheio;
- [ ] quebrar vazio, cheio e ocupado;
- [ ] explosão, reload e tentativa de pistão.

### Gameplay e ciclo de vida

- [ ] ataque no ar, entidade e bloco sem dano, knockback ou quebra;
- [ ] Survival, Adventure, Creative, Spectator e troca de modo carregado;
- [ ] troca de slot, morte, respawn, logout e mudança de dimensão em cada fase;
- [ ] dois jogadores no mesmo bloco e aspersões simultâneas;
- [ ] mundo local, multiplayer e Realm quando disponível.

### Plataforma e desempenho

- [ ] mouse/teclado, controle e toque;
- [ ] gráficos convencionais e Vibrant Visuals;
- [ ] PC, console e celular de baixo desempenho;
- [ ] 1, 4, 8 e 16 jogadores: medir profiler antes de criar LOD;
- [ ] nenhuma emissão duplicada, vazamento de sessão ou crescimento persistente de registry.

## QA específico de animação

- [ ] carregamento conduz a cabeça para baixo/frente e confirma no tick de imersão;
- [ ] aspersão dura 18 ticks, tem preparação, arco, release, follow-through e retorno;
- [ ] braço e item começam/terminam juntos sem duplicar rotações;
- [ ] cabeça nunca cruza rosto, ombro, tórax ou câmera;
- [ ] cancelar antes do release não consome; depois do release não reembolsa;
- [ ] vazio toca feedback seco e nunca aciona partículas.
- [ ] captura a 60 FPS confirma variação aparente inferior a aproximadamente `10°` por frame;
- [ ] repetir três vezes em FP, TP frontal e TP lateral com Steve/wide e Alex/slim;

## QA específico de locator/VFX

- [ ] origem fica a no máximo `0.10` bloco da ponta renderizada;
- [ ] primeira e terceira pessoa usam origem correta;
- [ ] locator acompanha a ação, mas partículas emitidas ficam em world-space;
- [ ] steering entre pulsos é preservado;
- [ ] nenhuma gota nasce atrás do jogador ou dentro do corpo;
- [ ] tamanho próximo à câmera permanece menor que a cabeça do avatar;
- [ ] sprites não colapsam de perfil nem desaparecem em ângulos oblíquos;
- [ ] micro-splash é discreto e não duplica gameplay.
- [ ] bridge contém quatro microgotas e não duplica o leque de 36;
- [ ] sons próprios ocorrem uma vez nos tempos `0.08` e `0.25`;
- [ ] tentativa vazia conserva apenas o feedback seco.

## Content Log e profiler

Com cheats:

```text
/function aspergillum/dev_kit
/reload
/script profiler start
/script profiler stop
```

Limpe o histórico antes de cada revisão. Mensagens antigas como `q.particle_age`, `q.is_swinging` ou `controller.render.item_default` indicam pack antigo: essas expressões não existem na baseline atual.

## Formato mínimo do relatório

```text
Add-on: 1.0.x
Minecraft/plataforma:
Controle/FOV/modelo:
Perspectiva e modo:
Artefato/hash:
Pré-condição:
Passos mínimos:
Esperado:
Observado:
Timestamp/screenshot:
Content Log:
Reproduzibilidade:
```

Vídeo ajuda a medir pose e sincronização; o Content Log ajuda a identificar parsing/recursos; o pacote e seu hash provam qual artefato foi testado. Os três tipos de evidência se complementam.
