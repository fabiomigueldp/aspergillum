# Aspergillum 3D Workbench

Bancada web integrada e toolchain headless para inspecionar geometrias, texturas, bones, locators, render paths, materiais, jogadores e animações do add-on. A pasta não altera `src/`, `packs/`, os manifests ou o build do Bedrock.

## Rodar localmente

Requer Node.js 20.19+.

```powershell
cd viewer-3d
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite, normalmente `http://127.0.0.1:4173`. Use `?tool=model`, `?tool=bedrock` ou `?tool=avatar` para criar um link direto para qualquer laboratório. A barra superior permanece montada durante a troca, e voltar/avançar funciona sem navegação de documento.

O comando `sync-assets` lê os packs dos projetos registrados no gerenciador, incluindo modelos, texturas, attachables, render controllers, animações e texture sets. Ele gera um workspace temporário em `public/asset-library/`. Um projeto externo registrado cujo `package.json` não esteja disponível recebe um aviso e é omitido do viewer; o gerenciador de instalações mantém sua validação estrita. O diretório gerado é ignorado pelo Git para evitar duplicar PNGs e modelos derivados.

## O que já está disponível

- shell persistente para Model Lab, Bedrock Renderer e Avatar Lab, com estado preservado entre alternâncias;
- carregamento de CSS no `<head>`, primeiro paint escuro e isolamento da folha de estilos da ferramenta ativa;
- catálogo automático de todos os `*.geo.json` dentro do Resource Pack;
- Aspersório e Caldeirinha com textura real do pack;
- 16 variações do arquivo de rotações da Caldeirinha, selecionáveis no inspetor;
- níveis de água e estado de aspersório acomodado para a geometria da Caldeirinha;
- órbita, zoom, enquadramento, grade, eixos, wireframe e seleção de bones;
- inspeção de pivôs, rotações, cubos, locators, dimensões e fonte;
- importação temporária de Bedrock Geometry, `.gltf` e `.glb` por botão ou arraste;
- suporte a teclado: `F` enquadra, `R` reseta, `G` grade, `A` eixos, `W` wireframe, `Esc` limpa seleção;
- controles de viewport: botão esquerdo orbita, botão direito desloca e roda do mouse amplia no ponto sob o cursor;

## Avatar Lab

Abra `?tool=avatar` ou selecione **Avatar Lab**. A cena monta um rig de jogador wide/slim, aplica a skin padrão **Batina preta com pelerine** ou um PNG importado e vincula a geometria real do aspersório a `rightItem`. O painel executa as poses de hold, carga e aspersão, alterna primeira/terceira pessoa e expõe a cadeia de matrizes, pivôs, locators, esqueleto e receita de cena.

Model Lab, Fidelity Renderer e Avatar Lab compartilham `src/shared/bedrock-geometry.js`; não existem três conversores geométricos independentes. O contrato completo, a relação com o projeto Sacristia e os limites de paridade estão em `../docs/AVATAR_LAB.md`.

## Renderer Bedrock Fidelity

Abra `?tool=bedrock` ou selecione **Bedrock Renderer**. Esse laboratório resolve o caminho do pack na ordem:

`attachable → render controller → material/textures → geometry → animations`

Ele aplica as poses reais de primeira/terceira pessoa do attachable, permite amostrar a animação de aspersão, alterna o material clássico com o caminho PBR baseado em `normal` e `metalness_emissive_roughness` e expõe a resolução no painel de diagnóstico. Os modelos que não são attachables continuam disponíveis como geometrias diretas.

A barra inferior do viewport também controla rapidamente a grade, eixos, pivôs/locators e wireframe. Os mesmos atalhos `G`, `A`, `P` e `W` funcionam no Bedrock Fidelity Renderer, sem expandir o painel lateral.

No modo `PBR / VV`, o `color` é tratado como sRGB, enquanto `normal` e `MERS` são tratados como dados lineares. O MER técnico é decomposto antes de chegar ao material em três mapas escalares: canal R para metalness, G para emissive e B para roughness. Isso evita que a aparência magenta/azul do arquivo de diagnóstico seja confundida com a cor do modelo. A cena usa um ambiente IBL neutro e luzes sem tintas cromáticas para que metais não recebam uma dominante artificial do próprio preview.

Os materiais sólidos usam descarte de faces front-side como o caminho opaco do Bedrock, em vez de `DoubleSide`. O catálogo também audita UVs: Box UV combinado com qualquer dimensão menor que uma unidade é marcado como inseguro; `uv_size` inválido ou colapsado é erro, enquanto uma face ausente é contabilizada separadamente como omissão autoral deliberada. A geometria oficial do aspersório usa somente as faces visíveis explícitas, footprints inteiros de pelo menos um texel e padding dilatado de dois texels no atlas.

Os três laboratórios compartilham o mesmo adaptador Bedrock → Three.js para evitar divergência entre motores. Ele respeita a ordem real dos vértices de cada face do `BoxGeometry`, associa `+Z` a `south` e `-Z` a `north` e preserva o sinal de `uv_size` para espelhamento. Assim, cada texel ocupa um quadrilátero contínuo da face, sem a antiga cisão diagonal que fazia pixels escuros parecerem losangos. Execute `npm test` para validar esses contratos sem abrir o navegador.

## Arquitetura da bancada

`index.html` é a entrada humana canônica. O shell resolve `?tool=...` pela History API, importa o módulo real de cada laboratório somente na primeira visita e estaciona sua árvore DOM quando ele fica inativo. Esse ciclo preserva o estado sem manter render loops invisíveis. O registro compartilhado em `src/shared/workbench-contract.js` concentra rotas e superfícies; ele não conhece geometria, shaders ou regras do add-on.

As páginas `model-lab.html`, `bedrock-renderer.html` e `avatar-lab.html` são adaptadores autônomos intencionais. Capturadores e agentes podem continuar abrindo essas entradas diretamente e usando as mesmas APIs globais, sem depender do shell. Isso mantém a interface humana coesa sem fragilizar os fluxos headless existentes.

Valide os dois contratos com:

```powershell
npm test
npm run smoke:workbench
```

O smoke test verifica primeiro paint, navegação sem reload, estado preservado, isolamento de CSS, acessibilidade básica e prontidão das páginas autônomas.

## Capturas para agentes

O renderer expõe uma API interna de captura e o CLI `capture-models.mjs` a utiliza em Chromium headless. O comando padrão captura os cinco assuntos visuais do projeto, incluindo a Mesa do Sacristão vazia ou ocupada, em nove direções fixas:

```powershell
# na raiz do projeto
npm run capture:models -- --subject all

# exemplo rápido e direcionado
npm run capture:models -- --subject docked --views front,right,back,top --size 768
```

Cada assunto produz PNGs individuais e uma `contact-sheet.png` rotulada. A raiz da execução também recebe `capture-manifest.json`, com versão do pack, opções, câmera e arquivos gerados. Sem `--output`, a evidência é escrita em `out/model-captures/<timestamp>/`, ignorada pelo Git. Use `npm run capture:models -- --help` para consultar materiais, água, pose, animação, wireframe e resolução.

O CLI requer o Chromium gerenciado pelo Playwright. Depois de instalar as dependências do viewer, execute `npx playwright install chromium` dentro de `viewer-3d` caso o browser ainda não esteja disponível na máquina do agente.

Para jogador + skin + attachable, use o capturador dedicado:

```powershell
npm run capture:avatars -- --action sprinkle --views front-right,grip,head
```

Ele gera frames por vista e tempo, uma prancha rotulada e um manifest com hashes da skin, geometria, attachable, animações e configuração.

As capturas usam somente cubos visíveis para enquadrar a câmera, ocultam a interface e mantêm direções estáveis. Isso permite comparar revisões sem depender de órbita manual, mas não transforma o preview Three.js em evidência do shader ou da câmera proprietária do Minecraft.

## Cover Renderer

O `cover-renderer.html` usa o mesmo Bedrock Fidelity Renderer como fonte transparente e monta uma capa quadrada determinística com o modelo real `docked`, iluminação cinematográfica, cenário de pedra, moldura de latão e o título local Bowlby One SC. O CLI gera a arte principal e uma prova renderizada diretamente em `256 × 256`:

```powershell
# na raiz do projeto
npm run render:cover -- --output out/cover-renders/candidate-01

# opções, acabamentos e resolução
npm run render:cover -- --help
```

Cada execução também grava `cover-manifest.json` com versão, preset, câmera, geometria resolvida, acabamento, material, nível de água, tipografia, tamanho e SHA-256 de cada PNG. Uma checagem de cobertura alfa interrompe o processo caso o render 3D esteja vazio ou incompleto. A fonte e sua licença OFL ficam em `public/fonts/bowlby-one-sc/`, portanto a composição não depende de rede.

O comando não modifica `assets-src/`, `packs/` nem `dist/`. As candidatas em `out/cover-renders/` são evidência para aprovação; a promoção para `pack_icon.png` é uma mudança distribuível separada. A candidata aprovada para a 1.2.1 foi copiada para `assets-src/branding/` e passou a alimentar o gerador oficial. O contrato completo está em `docs/COVER_RENDERER.md`.

## Convites locais

`npm run render:invitation -- --help` mostra as opções do renderer de convites. Ele combina um avatar e equipamento do workspace com título, celebrante, celebração, local e horário, e grava um PNG em `out/invitation-renders/`. O preset usa Ornatum; esse projeto precisa estar disponível no registro local para gerar o convite padrão. A ferramenta não altera os packs do Aspergillum.

## Limite deliberado

O **Model Lab** reproduz a geometria Bedrock e seus pivôs em uma cena standalone. O **Bedrock Fidelity Renderer** aproxima a cadeia de resolução, animações e mapas; o **Avatar Lab** acrescenta rig wide/slim, skin, holder e animações coordenadas. Nenhum deles substitui o cliente Minecraft: shader proprietário, iluminação do mundo, Persona, câmera completa, partículas, cache, culling e comportamento final continuam sendo validados no jogo conforme `docs/TESTING.md`. São ferramentas de diagnóstico, não prova de equivalência visual de 100%.

Para uma revisão visual reproduzível, registre a versão do pack, a variação selecionada, a perspectiva desejada e o hash do pacote testado. O viewer é uma ferramenta de diagnóstico, não uma nova fonte autoritativa de assets.
