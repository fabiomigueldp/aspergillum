# Coleção arquitetônica 0.3.0

Objetivo autorizado: ampliar estruturas, frontais e toalhas a partir das oito novas referências, mantendo a altura de um bloco e apoio no plano y=16. É uma revisão diagnóstica; aprovação no pacote importado e Content Log pertencem ao teste do usuário.

## Composição e identidade

Três estruturas independentes: corpo com pilastras, arcadas ogivais em relevo e mesa aberta com cavaletes. Três materiais: mármore, calcário e nogueira. Cinco escolhas de tecido: sem toalha, branco/Cordeiro, vermelho/IHS, verde/IHS e preto/cruzes. Três frontais: sem aplique, cruz em relevo e placa do Cordeiro. Clássico/Guadalupe continuam disponíveis com seus estados e identidade anteriores.

`src/domain/catalog.ts` compila 135 receitas em IDs determinísticos `altare:a_<estrutura>_<material>_<tecido>_<frontal>`. Cada ID possui apenas `edges` (16), `facing` (4) e `role` (4): 34.560 combinações novas. Somadas às 11.520 clássicas, são **46.080**, sob o teto interno de 49.152. O teto global de 65.536 é compartilhado pelo mundo. Não acrescentar eixos de aparência ao bloco clássico nem multiplicar o catálogo indiscriminadamente.

`role`: 0 = repetição, 1 = centro inteiro, 2 = primeira metade na travessia do domínio, 3 = segunda metade. A primeira metade corresponde à direita visual nas UVs norte. O compositor e os testes consideram esse espelhamento nas quatro direções. Comprimentos 1–16 não esticam o símbolo: alteram a quantidade de preenchimentos.

O codec puro separa a identidade da receita de seus estados locais. O domínio compara também `design` na revalidação. A aplicação explícita da ferramenta converte IDs no mesmo retângulo, com os locks, preflight e rollback existentes, sem writes acima do tampo. Não há migração automática nem inventário de vasos. Ver [migração](MIGRATION_0.3.0.md).

## Forma

- `geometry.mjs` gera 180 geometrias: estrutura × tecido × aplique × frente. O material não duplica modelos. Junto às oito geometrias clássicas, são 188; máximo **50 cubos por modelo**, incluindo ocultos.
- Pilastras e pés aparecem nos quatro cantos externos, não nas emendas entre módulos. O núcleo recuado dos corpos sólidos possui extensões internas condicionais para não abrir fendas a cada célula.
- Ogivas são segmentos geométricos rotacionados, com altura adaptada à queda escolhida. A conjugação da rotação para cada lateral e a conversão de base Bedrock ocorrem uma única vez.
- Mesa aberta: tampo, longarinas periféricas, pés, travessas e amarrações de ponta. Quatro apoios de canto em qualquer comprimento; pernas intermediárias adaptativas não foram implementadas.
- Cruz e placa têm espessura; na mesa aberta recebem uma prancheta suspensa. Metades pares são recortadas nos limites do módulo. A placa do Cordeiro é retangular, com a imagem figurativa em material, não escultura volumétrica.
- Cada queda usa quatro facetas estáticas e arremate superior; os cantos têm acabamento próprio. Nenhum vértice ultrapassa y=16. Apoio superior permanece contínuo.
- Colisão dos corpos sólidos é completa. Na mesa aberta, deriva dos volumes estruturais visíveis, com até 16 caixas por célula; o relevo decorativo não acrescenta barreiras. Seleção continua cúbica.

## Tecidos e mapas

`profiles.mjs` define a queda e a curva do festão. `materials.mjs` compõe repetição/centro/metades no domínio físico. A barra e o alpha usam a mesma curva; período de meio módulo permite unir centros pares sem deslocar a silhueta. A ordenação UV dos quatro painéis foi corrigida e tem teste baseado na base real de importação.

Fonte imutável: `embroidery-plates-v1.png`, 1536×1024, SHA256 `4adb47b83a242d4c4922ab3737e5ad71a7988de30163ce3aaa4ebcfe4cd46004`. Duas colunas (repetição/centro) × quatro temas. Fonte e prompt do imagegen integrado: [SOURCE.md](../assets-src/atelier/SOURCE.md).

A pintura mantém o aspecto físico dos símbolos, adapta o fundo às emendas e compila cor/normal/MER da mesma função. As máscaras de ouro/tecido e o relevo fino são aproximações autoradas. Todas as instâncias dos novos blocos usam **alpha_test**, com alpha binário somente no color map dos tecidos. Clássico/Guadalupe conservam `opaque`. Não há mistura de métodos dentro do mesmo bloco, blend, solver ou entidades auxiliares.

Total: **38 conjuntos**, **114 PNGs de mapas**, **25.952.256 bytes = 24,75 MiB RGBA decodificados**, sem mipmaps/ícones; teto local 26 MiB. Cada camada tem no máximo 256 KiB. A nova família reutiliza os materiais clássicos de pedra/linho/ouro.

## Como acrescentar um estilo

1. Escolher o eixo correto: arte de tecido, perfil de queda, estrutura ou aplique. Não acrescentar state sem recalcular a cardinalidade total e compatibilidade.
2. Preservar todas as receitas públicas existentes; reservar IDs novos. Um novo eixo pode exigir outra estratégia de catálogo antes de caber no orçamento.
3. Guardar a fonte e sua proveniência em `assets-src/`; parametrizar cor/alpha/relevo juntos. Nunca editar PNGs, modelos rotacionados ou arquivos distribuídos manualmente.
4. Alterar o gerador apropriado e o catálogo, acrescentar nomes pt_BR/en_US, verificar todos os materiais e traduções emitidos.
5. Validar limites de cubos, vértices, atlas, colisão, emendas e centros. Manter o topo em 16 e a geometria confinada ao limite lateral de 8,5 unidades.
6. Compilar, capturar modelos reais, inspecionar vistas individuais, empacotar com zero erros/avisos oficiais. Validar o pacote exato no Minecraft antes de promover a revisão.

## Aceitação

Os 24 testes e o validador abrangem domínio 1–16/quatro direções, conversões e rollback, codec, silhueta/UV, todas as 34.560 combinações novas, caixas de colisão e limites. A galeria compara três estruturas, quatro tecidos, ausência de tecido, materiais, centros pares/ímpares, quatro orientações e comprimentos extremos.

Teste físico: importar arquivo exato, montar 7×2, converter estilos com objetos apoiados, conferir 3/4/8 blocos e 1×1, transparência, colisão aberta, reload, concorrência e Content Log. O roteiro completo está em [TESTING.md](TESTING.md). As referências definem o vocabulário visual, não dimensões nem autenticidade documental da decoração.
