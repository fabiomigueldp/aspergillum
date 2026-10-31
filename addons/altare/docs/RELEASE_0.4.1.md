# Altare 0.4.1 — bordados e encontros das toalhas

**Retorno posterior:** o Content Log de 30/10 confirmou a rejeição das definições de cavaletes por `collision_box` em formato incompatível. O artefato abaixo permanece como histórico imutável; para reteste usar [0.4.2](RELEASE_0.4.2.md). [Diagnóstico da causa](STRUCTURES_0.4.2.md).

Data: 30/10/2026. Revisão visual da coleção arquitetônica: desenhos, contornos, encontros e materiais das quatro famílias de toalhas. Mantém a frente principal de sete blocos, altura de um bloco, oito cores da família Floral IHS e apoio livre acima do altar. Pacote validado para teste; aprovação visual, multiplayer e Content Log no Minecraft permanecem pendentes.

## Artefato exato

- [Altare-0.4.1.mcaddon](../dist/releases/Altare-0.4.1.mcaddon)
- SHA256: `576612a9e18fc0e0375ac528a5b729f3b9ce59e0e7de87c2986cdede25d05349`
- 10.077.606 bytes; 612 arquivos.
- Canal `diagnostic`, família `modular-altar`; BP/RP `[0,4,1]`, UUIDs preservados.
- Engine mínima 1.26.40; Script API 2.9.0 e UI 2.1.0 estáveis.
- [Resumo oficial](../dist/validation/0.4.1/release-summary.json), [relatório HTML](../dist/validation/0.4.1/altare-0.4.1.report.html), [correspondência das capturas](../dist/validation/0.4.1/capture-parity.json), [limites das alterações distribuídas](../dist/validation/0.4.1/presentation-parity.json).

## Correções

Repetição espelhada a partir de trechos autorados substitui a mistura que duplicava folhas e hastes nas junções. A composição floral conserva pétalas inteiras. Faixas e símbolos usam um domínio independente da curva do festão, mantendo escala uniforme; a faixa verde fica reta e há tecido livre antes da bainha.

As faces das dobras e os encontros dos cantos passam pelos mesmos extremos em toda a altura. A espessura fica para dentro, eliminando os deslocamentos que criavam frestas. Mantém a ondulação lateral, a silhueta recortada e o topo em y=16.

Máscaras ovais limpam o entorno do IHS e do Cordeiro. Removem o remendo retangular visível nas cores claras, fragmentos laterais e divisores da fonte abaixo dos símbolos. Fios prateados recebem resposta PBR própria; o fundo preto permanece fosco. Sem emissividade nova.

A [fonte artística v2](../assets-src/atelier/embroidery-plates-v2.png) permanece intacta, SHA256 `0e8ecc51228d03e4153452d95f00a60336b649a5825b6654f3ac98208b21654b`. Alterações feitas no compositor e na fonte geométrica; nenhum PNG distribuído editado manualmente. [Diagnóstico, critérios e implementação](CLOTH_POLISH_0.4.1.md).

## Verificações

`npm run package` passou tipos, **33 testes**, geração, validação estrutural e Creator Tools 0.17.7 sobre o `.mcaddon` final: **zero erros e zero avisos**, sem whitelist. Log: `out/package-0.4.1.log`.

`verify-polish` comparou os dois arquivos distribuídos: **386 arquivos idênticos**; diferenças restritas a 144 geometrias arquitetônicas, 76 mapas de tecido, dois manifests e quatro traduções de versão. Bundle, blocos de comportamento, colisões, catálogo e demais recursos permanecem idênticos à 0.4.0.

`verify-world-compatibility`: **199 blocos publicados** preservam IDs, states ordenados/defaults e UUIDs. `verify-baseline`: **89 arquivos clássicos**, incluindo Guadalupe, são idênticos à 0.2.1. Relatórios: `out/world-compatibility-0.4.1.json` e `out/legacy-regression-0.4.1.json`.

Orçamentos preservados: 53.136 permutações Altare; 62.880 com Aspergillum local; 188 geometrias, até 50 cubos; 66 texture sets e 142 PNGs, 31,75 MiB RGBA antes de mipmaps/ícones. Nenhuma nova identidade ou conversão de mundo nesta revisão.

`npm run check` na raiz também passou: 107 testes do Aspergillum, 54 do viewer e validadores. Log: `out/aspergillum-check-0.4.1.log`. As mudanças de produto ficaram em `addons/altare/`; alterações preexistentes da raiz foram preservadas.

## Evidência visual

[Comparação antes/depois](../out/cloth-comparison-0.4.1/index.html): **16 pares** de vistas de centro/canto das quatro toalhas, cor/PBR, câmera e enquadramento idênticos. Os dois conjuntos correspondem aos respectivos `.mcaddon`; controle deslizante, seleção, imagens locais e largura móvel passaram na conferência da página, sem erros JavaScript.

[Paleta](../out/palette-0.4.1/index.html): 48 vistas. [Coleção](../out/collection-0.4.1/index.html): 48 vistas. [Guadalupe](../out/legacy-0.4.1/index.html): oito vistas. [Detalhes e cantos](../out/cloth-review-0.4.1/index.html): 16 vistas. Total **120 capturas**, 2000×1000, verificadas por hash contra fontes/mapas e todos os **612 arquivos** do pacote final.

A inspeção incluiu os quatro centros e cantos, IHS branco em 1×1, roxo de sete e oito blocos e o recorte final do Cordeiro. Capturas Three.js/SwiftShader são evidência diagnóstica offline; não demonstram paridade de iluminação ou renderização com Bedrock.

## Teste mínimo no Minecraft

1. Importar o arquivo acima em cópia de teste, ativando BP/RP `[0,4,1]` sem outra revisão Altare concorrente. Executar `/function altare/dev_kit`.
2. Montar 7×2 com altura de um bloco. Conferir as quatro toalhas, junções, quatro cantos, faixa verde e medalhões. Em **Floral IHS · cores litúrgicas**, alternar as oito cores; observar especialmente branco/prateado e o contorno oval do IHS. Repetir em 8×2 e 1×1, nas quatro orientações e nos dois modos gráficos.
3. Colocar pedra e caldeirinha sobre a toalha, trocar acabamento e salvar/reabrir. Objetos, apoio e interação devem permanecer. O Content Log deve ficar sem novos erros de geometria, Molang, materiais, texture sets, colisão, componentes, dependências ou `[Altare]`. Concorrência e ciclo de vida conforme [TESTING.md](TESTING.md).

Não há teste físico nesta sessão. A toalha continua estática, com variação de queda por tema; permanecem os limites de retângulos, quatro apoios na mesa aberta e suporte próprio para itens não colocáveis. Atualizar 0.4.0 → 0.4.1 não exige conversão; voltar à 0.4.0 reverte a apresentação. Para versões anteriores à paleta, seguir [MIGRATION_0.4.0.md](MIGRATION_0.4.0.md).
