# Execução dos testes e capturas 3D

Os CLIs Playwright do viewer e `addons/altare/tools/capture.mjs` usam
`viewer-3d/scripts/lib/render-browser.mjs`. O modo padrão tenta Chromium completo
em headless com GPU (`channel: chromium`, `--enable-gpu`). Antes de abrir o
projeto, verifica WebGL2, identifica o renderer e testa leitura de pixels.
Não instala browsers, altera drivers ou muda configurações globais do Windows.

Diagnóstico rápido sem carregar cenas: `npm --prefix viewer-3d run renderer:check`.

## Seleção do backend

```powershell
# Padrão: GPU verificada, com fallback explícito no log se indisponível.
node viewer-3d/scripts/smoke-studio.mjs --built

# Exigir GPU: falha se não houver aceleração verificável.
$env:ASPERGILLUM_RENDER_BACKEND = 'hardware'
node viewer-3d/scripts/smoke-studio.mjs --built

# Referências reproduzíveis pelo renderer anterior.
$env:ASPERGILLUM_RENDER_BACKEND = 'software'
node viewer-3d/scripts/smoke-studio.mjs --built
Remove-Item Env:ASPERGILLUM_RENDER_BACKEND
```

`auto`, `hardware` e `software` são os únicos valores aceitos. Instale o Chromium
completo com `npx playwright install chromium` dentro de `viewer-3d` caso só o
headless-shell esteja disponível. A ausência do Chromium completo permite
fallback em `auto`; não é necessário Chrome/Edge pessoal.

O fallback só ocorre durante inicialização/prova de capacidade. Erros de teste,
asserções ou da página não disparam uma segunda execução silenciosa. O modo
software preserva o headless-shell e os flags SwiftShader anteriores.

## Responsividade

No Windows, o fallback software recebe prioridade BelowNormal e afinidade de
quatro processadores lógicos, somente nos processos do browser criado pelo CLI.
O controle é reaplicado após inicializar WebGL e verificado a cada cinco segundos
para cobrir reinícios do processo gráfico. Novos filhos herdam a afinidade do browser. Em uma CPU de 12 processadores lógicos,
isso evita que esse browser ocupe todos eles. O Node, outros programas e drivers
não são modificados. A limitação pode aumentar o tempo do fallback; não reduz
geometria, resolução, sombras, amostras ou cobertura. Para outro orçamento:

```powershell
$env:ASPERGILLUM_SOFTWARE_CPUS = '4' # inteiro de 1 a 32, limitado à afinidade disponível
```

Em outras plataformas, aplica prioridade reduzida, sem prometer limite rígido de
CPU. Falha ao aplicar o controle de recursos encerra o browser e é reportada.
Esses limites são por browser: evite lançar várias matrizes pesadas simultâneas.

## Evidências e compatibilidade visual

Os logs `[render]` identificam backend efetivo, versão do Chromium, renderer,
limite de textura, motivo do fallback e orçamento aplicado. Manifests das
capturas/renderizações e relatório do smoke registram `backend`; o smoke inclui
`elapsedMs` (a inspeção de objetos mantém seu array de manifesto e acrescenta
`renderer.json`). O cache de miniaturas também considera a política e o modo pedido.

GPU e SwiftShader podem diferir em arredondamento, rasterização e antialiasing.
Comparações de regressão visual devem fixar backend, versão do browser, driver,
cena, resolução e hashes das fontes. Não compare hashes PNG de backends diferentes
como se fossem a mesma baseline. O modo software continua disponível exatamente
para preservar esse fluxo. Não foram reduzidas as asserções do smoke nem as
resoluções, materiais, cenários, alfa, sombras ou amostras de exportação.

## Medição local de 31/10/2026

Dell Vostro 3520, i7-1255U, 16 GB, Intel Iris Xe/D3D11, Chromium 145.0.7632.6.
O smoke compilado completo, sem mudança do bundle durante a comparação:

- execução anterior em SwiftShader sem limite: 102,3 s, processo gráfico observado
  em 85,4% da CPU total; duração obtida do histórico do chat;
- execução com GPU: 17,7 s, aproximadamente 5,8 vezes mais rápida;
- fallback software limitado e monitorado: 144,0 s, todos os asserts passaram;
  amostra do processo gráfico em 30,2% da CPU total (afinidade de quatro lógicos);
- todos os asserts passaram, incluindo exportação 1920×1080, alfa e quatro ambientes;
- 11 PNGs comparados, dimensões iguais e nenhum canal alfa alterado; diferença
  absoluta média por canal entre 0,071 e 0,173 em escala 0–255;
- inspeção visual da exportação Full HD não revelou perda de composição/detalhes.

São medições locais, não garantia de ganho em toda GPU. A primeira comparação
inclui variação de carga/cache entre execuções. Evidências ficam em
`out/renderer-performance/`, fora do Git. Não equivalem a validação no Minecraft.

## Referências

- [Playwright: Chromium e novo headless](https://playwright.dev/docs/browsers#chromium)
- [Chromium: GPU em headless](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/using-gpu-hardware-in-headless-chrome.md)
- [SwiftShader: implementação gráfica na CPU](https://swiftshader.googlesource.com/SwiftShader)

## Verificação da implementação

`npm run check`: 107 testes de domínio + 83 do viewer, documentação, build e
validadores aprovados. Build do viewer aprovado; smoke da bancada em desenvolvimento
e compilado aprovado; 14 capturas Altare clássico/PBR em GPU aprovadas.
O smoke da bancada agora respeita `--built`; as páginas declaram explicitamente
que não têm favicon para eliminar a requisição 404 feita pelo Chromium completo,
sem filtrar ou ignorar erros de console.
