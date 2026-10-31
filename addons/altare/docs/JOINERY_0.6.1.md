# Marcenaria sacra — Altare 0.6.1

Revisão de 31/10/2026. Duas estruturas novas, em nogueira, conservam a mesa de um bloco de altura e as dimensões de 1×1 a 16×8. O tampo continua em y=16 e o linho tem 0,09 unidade. São modelos decorativos, sem inventário, dobradiças ou simulação mecânica.

## Construção

**Arca:** corpo fechado, rodapé contínuo, painéis rebaixados 0,9 unidade, montantes verticais e travessas horizontais. Os montantes recebem as travessas sem faces frontais sobrepostas. Os fechamentos internos alcançam a célula vizinha; o rebaixo pertence somente ao perímetro. A repetição produz caixotões proporcionais, sem esticar um painel sobre toda a largura.

**Balaústres:** mesa aberta com pés quadrados, haste inferior, colar facetado a 45°, haste superior, saia sob o tampo e travessas inferiores. Cada módulo exposto tem um apoio: uma frente de sete blocos tem sete apoios, evitando uma mesa de sete metros sustentada só nas pontas. As travessas respondem ao contorno: continuam até ±8 nas junções internas e terminam contra a peça perpendicular nos cantos. A estrutura se repete; não é uma simulação de cálculo de cargas.

O gerador em `assets-src/atelier/joinery.mjs` separa a marcenaria dos tecidos. O atlas adicional `joinery_walnut_horizontal` deriva da mesma fonte procedural da nogueira e orienta o veio horizontalmente nas travessas. Montantes e painéis mantêm o veio vertical. Nenhuma textura anterior é alterada.

## Personalização e persistência

Os dois modelos aceitam sem toalha, Cordeiro, Floral IHS nas oito cores, faixa verde IHS e cruzes em prata. Seus materiais são nogueira, sem aplique adicional no corpo. A interface mostra o material efetivo e oculta o relevo incompatível; escolhas de pedra/relevo ficam suspensas no rascunho e voltam ao selecionar um modelo compatível. O estúdio 1.6.0 oferece seis miniaturas e duas composições novas.

São 24 IDs novos `altare:j_<estrutura>_<tecido>[_<cor>]`. Os 22 vestidos usam o código compacto já testado de shape/detail/facing: 112 estados por ID. Os dois sem toalha usam somente edges/facing: 64 estados por ID, sem centro fictício. A normalização de contorno, revalidação tardia, preflight, rollback e locks existentes são mantidos. Não há entidade, propriedade dinâmica ou tarefa recorrente nova.

Nos balaústres, o compilador escolhe uma geometria por máscara de contorno. Isso muda somente o corte das travessas, sem novo state. As colisões agrupam os segmentos dos apoios e acompanham as travessas recortadas: até 13 caixas `origin/size`, mantendo o meio aberto e o tampo íntegro. A arca conserva colisão sólida.

## Orçamentos e compatibilidade

223 blocos, 222 receitas arquitetônicas, 528 geometrias, até 50 cubos por geometria; 67 conjuntos de materiais, 145 PNGs e 31,9375 MiB de mapas únicos antes de mipmaps. A geometria do tecido, os modelos anteriores e seus materiais são reutilizados.

Altare usa 55.728 estados; com os 9.744 do Aspergillum local, são **65.472**, restando somente **64** sob a referência de 65.536. Outros add-ons não estão incluídos nessa soma. Não expandir novamente o catálogo cartesiano: outra coleção exige primeiro reorganizar a distribuição ou um plano explícito de migração/codec. Esta revisão não garante o orçamento de um mundo com todos os packs de igreja do usuário.

`verify-joinery.mjs` exige identidade byte a byte de todos os blocos, colisões, modelos e texturas anteriores em relação a 0.5.0. Somente manifesto, idiomas, bundle e índices globais podem mudar. Os 199 IDs anteriores e seus states/defaults continuam intactos. A geração inicial 0.6.0 fica como diagnóstico interno; o pacote entregue 0.6.1 inclui os encontros corrigidos das travessas.

Fontes primárias consultadas: [caixas de colisão estáveis](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_collision_box?view=minecraft-bedrock-stable) e [orçamento de permutações](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockstatesandpermutations?view=minecraft-bedrock-stable). A nota histórica sobre Holiday Creator Features da segunda página não é requisito adotado. O alvo continua 1.26.40, sem experimentos.

## Verificação

- `npm run package`: tipos, 51 testes, geração, estrutura e validação oficial.
- `node tools/verify-world-compatibility.mjs dist/releases/Altare-0.5.0.mcaddon` e `node tools/verify-joinery.mjs`: contratos e recursos anteriores.
- `node tools/capture.mjs --matrix joinery --views front,oblique --profiles classic --width 1600 --height 1000 --output out/joinery-0.6.1`: larguras 1/3/7/8/16, quatro frentes e centro dividido.
- `node tools/verify-captures.mjs out/joinery-0.6.1`: correspondência com o arquivo final.

O renderer externo é diagnóstico. A aparência, colisão, apoio de vasos e Content Log no Minecraft ainda precisam do [reteste do pacote exato](RELEASE_0.6.1.md).
