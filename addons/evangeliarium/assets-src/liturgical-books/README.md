# Missal e Pontifical — modelos originais para Evangeliarium

Missal e Pontifical autorais, acompanhados da cena de inspeção do Evangeliário existente, produzidos e renderizados no Blender 4.3.2 a partir de cuboides editáveis. O desenho conserva a linguagem do Evangeliário existente: couro, papel marfim, douração contida e construção Minecraft. O Evangeliário conserva a planta 5 × 7; o Missal usa 3,90 × 5,65 e o Pontifical 3,70 × 5,55, conforme o estudo documentado em `../../docs/BOOK_PROPORTIONS.md`. A revisão da abertura dos três livros está documentada em `../../docs/OPEN_BOOK_REBUILD.md`; a arte das capas é preservada e o corte lateral do Evangeliário recebe orientação correta das linhas de folhas.

## Entrega

- `blender/evangeliarium.blend`, `blender/missal.blend` e `blender/pontifical.blend`: cuboides nomeados, UVs explícitas, materiais PBR com imagens incorporadas, hierarquia e câmeras de inspeção.
- Saída regenerável `bedrock/models/entity/`: oito geometrias 1.16.0, nas poses `held`, `closed`, `open` e `animated`.
- Saída regenerável `bedrock/textures/entity/`: color, MER, normal e texture-set 1.16.100 por livro, 256 × 256.
- `design.mjs`, `*.author.json` e `*.palette.json`: adaptador Node, cuboides e paleta de produção.
- `source/`: geradores autorais, produção Blender, exportador de edições e testes.
- Saída regenerável `renders/`: cinco vistas 1200² por livro, ícones 64², atlas ampliados e prancha comparativa.
- `reports/validation.json`: validação estrutural, contagens e hashes.

## Desenho

**Missal:** couro vermelho, cruz latina em baixo relevo, mandorla estampada, cinco fitas de seda guardadas entre folhas, com pontas discretas, e quatro índices finos de tecido fosco no corte. Três cadernos por metade produzem um corte escalonado discreto. Espessura entre capas: 1,44 unidade.

**Pontifical:** couro vinho profundo, mitra episcopal desenhada originalmente, báculo, cruz e ínfulas estampados; orfrés da mitra em relevo. Três fitas guardadas entre folhas e menor espessura, 0,96 unidade. Não usa os quatro símbolos dos Evangelistas que identificam o Evangeliário.

As marcas das páginas são ornamentais: **não são transcrição, tradução ou edição de texto litúrgico**. A leitura real pertence à interface nativa do add-on. Não há fontes tipográficas externas, arte baixada ou geometria de terceiros nestes modelos.

## Polimento de encadernação — 04/11/2026

No Missal, os quatro índices laterais entram 0,09–0,12 unidade no papel, conservando a extremidade externa em x=5,13. As fitas azul e violeta saem de cadernos internos, em vez de aparecer como tiras curtas soltas sobre a página aberta. Edição realizada nos cuboides do Blender, conferida pelo exportador e incorporada ao gerador procedural. Nenhum cuboide, face, material, UV, pivô ou animação foi acrescentado. Esta foi uma correção inicial; a revisão estrutural posterior dos três livros está descrita em `../../docs/OPEN_BOOK_REBUILD.md`.

`source/validate.mjs` verifica inserção dos índices, silhueta e assentamento das fitas. As vistas de conferência ficam em `renders/polish/`, usando as mesmas câmeras e parâmetros Cycles 96 spp/1200² da baseline. A aceitação visual no Minecraft continua pendente.

## Custo e contratos

| Livro | Cuboides | Quads visíveis | Triângulos | Atlas PBR |
|---|---:|---:|---:|---|
| Missal | 56 | 286 | 572 | 3 × 256² RGBA |
| Pontifical | 47 | 239 | 478 | 3 × 256² RGBA |
| Evangeliário | 39 | 234 | 468 | 3 × 256² RGBA |

A revisão de abertura acrescenta somente cuboides e articulações para a lombada e cada ponta de marcador; não cria texturas ou materiais. Cada conjunto PBR ocupa 768 KiB brutos sem mipmaps. Um material por livro; não há transparências, subsurf, dependência de partículas, mesh arbitrária ou múltiplos atlas. Os normal maps do Missal/Pontifical são neutros; o Evangeliário conserva microgrão discreto no couro, com ouro liso. A leitura física principal vem dos volumes e das máscaras MER.

Preservados: `evangeliarium_bound`, binding exato `q.item_slot_to_bone_name(context.item_slot)`, grip `[-6,24,1]`, `book_presentation`, `book_action`, nomes de capa/páginas e abertura de 177°. A raiz vinculada não recebe cubos, rotação ou compensação artística. Os bounds de `held` foram ampliados por deslocamento de seu centro para conter os vértices Y≈31, sem alterar a pose.

## Integração no add-on

O adaptador e os quatro JSONs já estão nesta pasta, integrados ao build. `assets-src/books-design.mjs` reexporta:

```js
export * from './liturgical-books/design.mjs';
```

O módulo exporta `ATLAS`, `tiles`, `paint(id,x,y,w,h,bookId)` e `geometry(kind,bookId)`. Usar o módulo novo somente para `missal` e `pontifical`; manter o módulo atual do Evangelho intacto. É necessário iterar **os tiles deste módulo**, pois há fitas e corte vertical próprios.

IDs de geometria: `geometry.evangeliarium.missal.<kind>` e `geometry.evangeliarium.pontifical.<kind>`. Texturas: `textures/entity/missal` e `textures/entity/pontifical`. Os ícones de produção ficam em `../branding/missal-item-64.png` e `../branding/pontifical-item-64.png`; o script de render reproduz as fontes em `renders/`.

## Reprodução

```sh
python source/build_assets.py
node source/prepare_gospel.mjs
node source/validate.mjs
python source/validate_textures.py
blender -b --python-exit-code 1 --python source/build_blender.py -- --views open,low,mid
blender -b --python-exit-code 1 --python source/finalize_blends.py
blender -b --python-exit-code 1 --python source/render_icons.py
blender -b --python-exit-code 1 --python source/validate_open_blender.py
# Após renderizar open,low,mid para os três livros:
python source/prepare_open_review.py
```

Requer Python com Pillow, Node com módulos nativos e Blender 4.3.2. O render usa Cycles CPU, 96 amostras, resolução 1200², AgX e a mesma iluminação para os três livros. O binário disponível não inclui OpenImageDenoise, portanto não há dependência de denoise. `-- --draft` gera testes 600²/16 amostras numa pasta separada; não é a evidência final.

## Edição no Blender

Frame 1: fechado em pé. Frames 36–60: aberto e deitado. A lombada flexível e os terminais das fitas têm animação própria, com escala neutra no frame 1. Há seis câmeras nomeadas. A rotação de apresentação entre esses frames serve apenas para inspeção; o runtime usa suas poses próprias.

Cada cuboide é um objeto com UVs e propriedades `bedrock_origin`, `bedrock_size`, `surface` e `source_cube_name`. Para exportar mudanças de posição/escala/vértices que continuem formando cuboides alinhados aos eixos:

```sh
blender -b blender/missal.blend --python source/export_blender_edits.py -- --output /tmp/missal.author.json
```

Revisar o JSON e substituir a fonte de cuboides correspondente no add-on, depois executar seu build. O exportador rejeita mudanças da hierarquia, pivôs, raízes, UVs, materiais e malhas arbitrárias em vez de aproximá-las silenciosamente. Edições de arte devem ser feitas no gerador de textura. `build_assets.py` reconstrói o desenho procedural original; ele não deve sobrescrever um JSON editado que se deseje conservar.

## Verificação e limites

Verificados: paridade Python/Node das oito geometrias, dimensões positivas, UVs explícitas inteiras, atlas dentro dos limites, padding de 2 px sem colisão, binding, pivôs, abertura, custo, suporte acima do plano e inspeção das vistas Blender. Corrigidas margens expostas dos cadernos e orientação das linhas na espessura.

**Não validado no cliente Minecraft.** Blender prova construção e apresentação diagnóstica, não paridade com o jogo. Aceitar no pacote integrado: Content Log limpo; primeira e terceira pessoa com os dois livros; troca de item; abrir/fechar/retirar; orientação nas quatro direções; mesa/altar sem recorte; culling em movimento; inventário 64²; repetição e reload. A espessura diferente requer conferir o porte em mãos, inclusive skins slim/Persona. Não foi publicado ou instalado nenhum add-on por esta entrega de modelos.

### Auditoria completa de faces
`source/audit_faces_blender.py` valida cada face das três cenas e testa a cobertura de faces omitidas com nove amostras em cinco poses de abertura. O relatório fica em `reports/face-coverage-blender.json`. A revisão remove sobreposições coplanares das cantoneiras, cruz e nervuras do Evangeliário, sem alterar sua silhueta, e reduz o excesso de relevo da normal do couro e do ouro.

### Terminais da lombada
As faces curtas superior/inferior do núcleo e da coroa usam couro, sem repetir a cruz e os filetes do painel vertical. A correção é somente de UV por face: não altera cuboides, relevo, pivôs, animação, paleta ou atlas. Testes em `tests/open-model.node.ts` protegem as quatro geometrias de cada livro.
