# Toalhas universais — Altare 0.9.0 / Estúdio 2.0.0

## Resultado e critério de aceitação

Os sete modelos usam a mesma coleção: sem toalha, linho curto/longo, bordado curto/longo, Cordeiro, Floral IHS, faixa verde IHS, preto/prata e renda floral. Trocar a estrutura conserva o tecido escolhido. Floral IHS oferece as oito cores também no Clássico e na Colunata. Guadalupe é independente da toalha no Clássico. Material e relevo incompatíveis continuam suspensos no rascunho, sem substituir a escolha do tecido.

A versão é diagnóstica. Tipos, testes, gerador, arquivo distribuído, validação oficial, migração de cenas e renders externos são verificáveis; suporte real, input nativo, Content Log e desempenho precisam de reteste no Minecraft. Não há simulação física ou entidades de tecido.

## Construção comum

`assets-src/atelier/garment.mjs` reúne cobertura, dobra superior, duas facetas por lado e costura de quina. O tampo termina em 16; linho em 15,91–16, dobra em 15,84–15,91 e queda ancorada em 15,85. A borda exterior vai até 8,40. Nenhum vértice entra na célula superior.

Os modelos de contorno dinâmico usam centro, quatro retornos e quatro cantos de cobertura com visibilidade pelo perímetro. As dobras param nos limites das células internas. A costura diagonal fecha o pequeno encontro sob o canto superior. A Colunata e os Balaústres podem compilar o contorno: sua cobertura é um único volume ajustado às bordas expostas, evitando geometria redundante. A Colunata mantém afastamento das colunas/cornija, com terminações de quina em 8,34 e profundidade 8,38. As outras estruturas terminam em 8 no eixo longitudinal e unem os lados por costura diagonal.

Caimentos em unidades de modelo: linho/bordado curto 3,25; longo 10,50; Cordeiro 6,75; Floral 5,50; faixa verde 7,25; preto/prata 4; renda 4,50. Os desenhos existentes conservam seus domínios e proporções. Relevos sob toalha longa diminuem proporcionalmente nos dois eixos para caber no campo exposto acima da base; não são cortados. As estruturas anteriores e suas colisões são preservadas.

A renda é uma textura de recorte binário, normal e MER, com rede fina, rosetas abertas de oito pétalas, folhas, ramos, cordões e picôs. O desenho usa coordenadas físicas para evitar flores achatadas. Repetição em 128 e festões a cada 32; a bainha acompanha `92 + 34 sen(πt)`. O acabamento permanece branco e fosco. Não há malha geométrica para cada fio. As costuras não esticam uma coluna de bordado: usam linho ou um mapa estreito de fundo e cordão da família correspondente.

## Identidade e migração

As 225 definições anteriores conservam IDs, ordem/defaults dos states, UUIDs e colisões. A alteração intencional de geometria têxtil aparece nos altares existentes após atualizar o pack; seus membros estruturais e a arte de Guadalupe permanecem. A renda antiga mantém `altare:s_colonnade_lace` e seu índice lógico histórico. `textileOf` traduz essa exceção somente para o editor.

172 IDs adicionais completam as combinações ausentes. `edges`: 16 contornos × 4 frentes = 64; `compact`: 28 poses × 4 = 112; `symmetric`: 16 contornos. O Clássico com tecido ornamentado/renda usa `classic_textile`: 54 pares alcançáveis de papel de toalha e papel Guadalupe, ×4 frentes ×3 pedras = 648. Cada eixo possui no máximo 16 valores.

A tabela explícita `classic-textile-layout.ts` é append-only e tem default isolado sem motivo. `textileRole` é independente de `frontal`; comparação tardia e rollback consideram ambos. Mudança de contorno não representável retorna à repetição sem motivo; reaplicar recompõe o centro. Converter para outra família remove o papel específico. Um módulo padrão colocado ao lado herda o acabamento, mas zera ambos os papéis centrais antes de resolver a permutação; isso evita copiar meia figura para uma pose isolada inválida. Não há alteração automática de IDs nos mundos.

O Estúdio 2.0.0 exporta cenas schema 2. Importação schema 1 conserva a aparência: Clássico deriva a toalha do número legado, Colunata interpreta o antigo tecido não vazio como renda. Cenas schema 2 guardam a escolha universal. `cloth`, `ruby`, `palette` e o antigo comando `ornateLace` ainda têm adaptação de entrada. Desfazer/refazer acompanha o rascunho completo. Downgrade do mundo exige backup anterior à 0.9.0, pois IDs novos não existem nos packs antigos.

## Custos e exceção diagnóstica

| Família | Blocos | Combinações declaradas |
| --- | ---: | ---: |
| Clássico | 13 | 19.296 |
| Pilastras | 111 | 18.192 |
| Ogivas | 111 | 18.192 |
| Cavaletes | 111 | 18.192 |
| Arca | 17 | 1.616 |
| Balaústres | 17 | 1.616 |
| Colunata | 17 | 1.328 |
| Total Altare | 397 | 78.432 |

Com Aspergillum local (9.744), a soma conhecida é 88.176. A referência Microsoft de 65.536 é excedida em 22.640 na soma; Altare sozinho excede em 12.896. A Microsoft documenta aviso de desempenho e impedimento de envio ao Marketplace acima da referência, não um limite de crafting. Esta revisão autoral preserva o registro anterior e adiciona codecs compactos, sob exceção diagnóstica explícita: até 80.000 no Altare e 90.000 nos dois packs conhecidos. Não é aprovação de desempenho nem distribuição Marketplace. Outros add-ons aumentam a contagem. [States e permutações](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockstatesandpermutations?view=minecraft-bedrock-stable).

1.228 geometrias, no máximo 50 cubos fora da Colunata; Colunata até 107 registros/399 faces, sob limites 112/400. A recomendação oficial é manter blocos em até 50 cubos; a exceção da Colunata exige profiling. O relatório preserva cada aviso GEOMETRY 501, somente quando caminho, identidade, contagem e faces correspondem aos modelos autorizados. Nenhum erro ou outro aviso é aceito. [Orientações de desempenho](https://learn.microsoft.com/en-us/minecraft/creator/documents/practices/improvingperformanceandresourceusage?view=minecraft-bedrock-stable).

81 conjuntos, 171 PNGs de material únicos, 34.593.792 bytes RGBA (32,9912 MiB), sem mipmaps/ícones. Limite continua 33 MiB. As oito cores compartilham normal/MER. As novas costuras são 9 color maps 4×64 e um par comum normal/MER, acrescentando apenas 11 KiB. A textura de renda continua 256×256. O aumento maior é de definições/geometrias, não de memória de texturas.

## Evidência reproduzível

- `npm run check`: tipos, 79 testes, geração e validação de todas as combinações emitidas.
- `node tools/capture.mjs --matrix universal --views oblique,detail,corner --profiles classic,pbr --output out/universal-textiles-0.9.0`: sete estruturas, outros tecidos na Colunata, cores, pares/ímpares e renda em tamanhos distintos.
- `node tools/audit-variations.mjs`: total por família.
- `node tools/verify-universal-textiles.mjs`: compara o arquivo final com 0.8.3; bloqueia regressões de states/defaults, UUIDs, colisões, estrutura e texturas protegidas.
- `npm run package`: artefato oficial, hash e relatório. Antes de publicar a versão imutável, validar ZIP temporário em `out/`.
- Viewer: `npm run build`, `node scripts/prepare-studio.mjs`, `node scripts/smoke-studio.mjs --built`, `node scripts/smoke-workbench.mjs --built`.

As capturas usam o importador Bedrock compartilhado e os recursos reais, mas não provam paridade com o jogo.

## Verificação desta revisão

Arquivo final: `Altare-0.9.0.mcaddon`, 13.872.113 bytes, 1.894 entradas. SHA-256 `f28f4247787d5a15ea1ae1e6d2377fdcec21b9441569c7388b12d8283779690d`.

Creator Tools: zero erros, 110 avisos de complexidade da Colunata estritamente conferidos, nenhum aviso inesperado. Auditoria do arquivo final: 225 definições publicadas, 560 estruturas de geometria e 157 mapas anteriores protegidos; 1.878 recursos de render confrontados por hash com 162 capturas. Relatórios em `dist/validation/0.9.0/`.

79 testes do add-on, 76 do viewer e 107 do Aspergillum passaram. Build do viewer e smokes compilados do estúdio/Workbench passaram, incluindo a abertura real de arquivos schema 1 do Clássico e da Colunata, cenas schema 2, histórico, quatro ambientes, downloads PNG/JSON e viewport de 390 px. O estúdio local serve o catálogo 0.9.0. Content Log nativo, apoio efetivo e profiling continuam pendentes; os itens abaixo não foram executados no Minecraft.

## Reteste mínimo do pacote exato

1. Em cópia do mundo, importar Altare-0.9.0.mcaddon e ativar somente BP/RP `[0,9,0]`. Conferir um altar antigo antes de aplicar a ferramenta: conservar modelo, material, Guadalupe e objetos. Sem pack/cache Altare concorrente.
2. Montar 7×2×1; escolher renda no seletor Desenho. Aplicar em cada um dos sete modelos. Conferir malha/flores, festões, verso, transição do tampo, cantos e emendas em movimento, de perto e à distância, em modo clássico e com PBR.
3. Na Colunata, alternar linho curto/longo, bordado, Cordeiro, faixa verde e preto/prata. Testar as oito cores do Floral IHS. Voltar às outras estruturas e verificar que o tecido acompanha a escolha.
4. No Clássico, combinar renda e depois Floral com Guadalupe ligado/desligado e as três pedras. Conferir o programa de sete blocos e os centros de 8 blocos nas quatro frentes. Colocar blocos e vasos sobre o tampo e alternar os tecidos: os objetos devem permanecer.
5. Testar 1×1, 3×2, 8×2 e 16×8, quebrar/repor um módulo e reaplicar. Editar em dois clientes, cancelar/restaurar, salvar/reabrir o mundo. Nenhuma escrita parcial ou alteração superior.
6. Exportar Content Log. Não admitir erros novos do Altare, componentes ausentes, consultas a states inexistentes ou rollback. Registrar eventual aviso global de permutações; o CLI não mede carregamento/desempenho do mundo. Medir tempo de carga, FPS e memória com vários altares e outros packs antes de promover a revisão.
