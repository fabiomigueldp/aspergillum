# Aspergillum Model Lab

Viewer web 3D isolado para inspecionar as geometrias, texturas, bones e locators do add-on. A pasta não altera `src/`, `packs/`, os manifests ou o build do Bedrock.

## Rodar localmente

Requer Node.js 20.19+.

```powershell
cd viewer-3d
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite, normalmente `http://127.0.0.1:4173`.

O comando `sync-assets` lê os arquivos atuais em `../packs/resource/models` e `../packs/resource/textures`, além dos JSONs de attachables, render controllers, animações e texture sets. Ele gera um catálogo temporário em `public/asset-library/`. Esse diretório é ignorado pelo Git para evitar duplicar PNGs gerados e modelos derivados.

## O que já está disponível

- catálogo automático de todos os `*.geo.json` dentro do Resource Pack;
- Aspersório e Caldeirinha com textura real do pack;
- 16 variações do arquivo de rotações da Caldeirinha, selecionáveis no inspetor;
- níveis de água e estado de aspersório acomodado para a geometria da Caldeirinha;
- órbita, zoom, enquadramento, grade, eixos, wireframe e seleção de bones;
- inspeção de pivôs, rotações, cubos, locators, dimensões e fonte;
- importação temporária de Bedrock Geometry, `.gltf` e `.glb` por botão ou arraste;
- suporte a teclado: `F` enquadra, `R` reseta, `G` grade, `A` eixos, `W` wireframe, `Esc` limpa seleção.

## Renderer Bedrock Fidelity

Abra `bedrock-renderer.html` ou clique em **Renderer Bedrock** no topo do Model Lab. Essa é uma segunda entrada, separada do viewer original, que resolve o caminho do pack na ordem:

`attachable → render controller → material/textures → geometry → animations`

Ele aplica as poses reais de primeira/terceira pessoa do attachable, permite amostrar a animação de aspersão, alterna o material clássico com o caminho PBR baseado em `normal` e `metalness_emissive_roughness` e expõe a resolução no painel de diagnóstico. Os modelos que não são attachables continuam disponíveis como geometrias diretas.

No modo `PBR / VV`, o `color` é tratado como sRGB, enquanto `normal` e `MERS` são tratados como dados lineares. O MER técnico é decomposto antes de chegar ao material em três mapas escalares: canal R para metalness, G para emissive e B para roughness. Isso evita que a aparência magenta/azul do arquivo de diagnóstico seja confundida com a cor do modelo. A cena usa um ambiente IBL neutro e luzes sem tintas cromáticas para que metais não recebam uma dominante artificial do próprio preview.

## Limite deliberado

O viewer original reproduz a geometria Bedrock e seus pivôs em uma cena standalone. O **Bedrock Fidelity Renderer** aproxima também a cadeia de resolução, animações e mapas do pack, mas não substitui o cliente Minecraft: o shader proprietário, a iluminação do mundo, o jogador/skin, a câmera completa, partículas e comportamento final continuam sendo validados no jogo conforme `docs/TESTING.md`. Portanto, ele é um preview de alta fidelidade e uma ferramenta de diagnóstico, não uma prova de equivalência visual de 100%.

Para uma revisão visual reproduzível, registre a versão do pack, a variação selecionada, a perspectiva desejada e o hash do pacote testado. O viewer é uma ferramenta de diagnóstico, não uma nova fonte autoritativa de assets.
