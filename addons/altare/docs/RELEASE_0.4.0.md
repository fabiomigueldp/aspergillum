# Altare 0.4.0 — toalhas e cores para teste

Data: 30/10/2026. Polimento dos tecidos da coleção arquitetônica e paleta Floral IHS nas oito cores, três estruturas e três materiais. Mantém altura de um bloco, referência de sete blocos de frente e apoio livre acima do altar. A revisão está empacotada e validada para teste; renderização, multiplayer e Content Log dentro do Minecraft permanecem pendentes.

## Artefato exato

- [Altare-0.4.0.mcaddon](../dist/releases/Altare-0.4.0.mcaddon)
- SHA256: `b394b0d23b22f1581c4950ab8d1af34de529a570d3d33f8a7a6d7ec9c55232ee`
- 10.792.393 bytes; 612 arquivos.
- Canal `diagnostic`, família `modular-altar`; BP/RP `[0,4,0]`, mesmos UUIDs públicos.
- Engine mínima 1.26.40; Script API 2.9.0 e UI 2.1.0 estáveis; sem dependência experimental nova.
- [Resumo oficial](../dist/validation/0.4.0/release-summary.json), [relatório HTML](../dist/validation/0.4.0/altare-0.4.0.report.html), [correspondência das capturas](../dist/validation/0.4.0/capture-parity.json).

## Mudanças e limites

Fonte de bordados v2, bainha com cordão, trama discreta nos normais, dobras menos pronunciadas e cantos com tiras inclinadas finas. O linho superior tem espessura de 0,09 unidade sobre tampo estrutural independente; termina em y=16. O recorte continua alpha-test e o tecido permanece estático. Esses aprimoramentos afetam os quatro temas arquitetônicos anteriores.

**Floral IHS · cores litúrgicas** oferece branco, vermelho, verde, roxo, róseo, preto, dourado e prateado festivos. A máscara recolore o fundo, preserva ouro/flores opacos e reutiliza alpha/normal/MER. O tampo permanece branco. A família tem 72 escolhas de cor/estrutura/material, sempre sem aplique adicional no corpo. As outras combinações de tecidos/apliques continuam disponíveis nos menus anteriores.

Vermelho reutiliza nove IDs antigos; as demais cores acrescentam 63. O codec compacto tem 112 estados por ID novo. Não altera states publicados. Há 198 receitas arquitetônicas mais o bloco clássico, 188 geometrias, até 50 cubos por modelo, 66 texture sets e 142 PNGs únicos: 33.292.288 bytes (31,75 MiB) RGBA, sem mipmaps/ícones. Altare usa 53.136 permutações; com o Aspergillum local são 62.880, reserva de 2.656 no orçamento compartilhado. Outros add-ons precisam de contagem própria.

## Verificações executadas

`npm run package` passou tipos, **30 testes**, geração, validação estrutural e Creator Tools 0.17.7 sobre o arquivo final: **zero erros e zero warnings**. Sem whitelist. Log: `out/package-0.4.0.log`.

`node tools/verify-baseline.mjs`: **89 arquivos clássicos idênticos byte a byte** ao arquivo 0.2.1, incluindo Guadalupe; identidade e atlas preservados. `node tools/verify-world-compatibility.mjs`: **136 blocos da 0.3.0** conservam IDs e schemas ordenados de states/defaults, com UUIDs dos packs preservados. Os materiais/geometrias arquitetônicos são refinados intencionalmente. Relatórios: `out/legacy-regression-0.4.0.json` e `out/world-compatibility-0.4.0.json`.

`npm run check` na raiz também passou: 107 testes do Aspergillum, 54 do viewer e validadores. Log: `out/aspergillum-check-0.4.0.log`. Alterações de produto desta iteração ficaram em `addons/altare/`; os documentos preexistentes da raiz foram preservados.

## Capturas reproduzíveis

[Paleta](../out/palette-0.4.0/index.html): 48 vistas de 12 configurações, todas as cores em sete blocos e variações 1/3/4/8 nas quatro orientações. [Coleção](../out/collection-0.4.0/index.html): 48 vistas, três estruturas, três materiais, quatro temas, apliques e larguras 1/3/4/5/7/8/16. [Guadalupe](../out/legacy-0.4.0/index.html): oito vistas em sete e oito blocos. Frente/oblíqua, cor/PBR, 2000×1000, com as mesmas opções da comparação anterior.

A inspeção individual incluiu branco 1×1, roxo de sete, roxo de oito, róseo em mesa de quatro, dourado frontal de sete e Cordeiro/ogivas de sete. A paleta dourada foi escurecida para distinguir bordado e fundo. Os encontros de canto e a união do símbolo em largura par foram conferidos nas vistas aproximadas.

`node tools/verify-captures.mjs out/palette-0.4.0 out/collection-0.4.0 out/legacy-0.4.0` confirmou **104 capturas** correspondentes aos materiais/modelos do pacote final, incluindo referências compartilhadas dos texture sets e todos os **612 arquivos distribuídos**. Three.js/SwiftShader não prova equivalência de iluminação, física ou renderização com Bedrock.

## Teste mínimo no Minecraft

1. Importar o artefato acima em cópia de teste; ativar BP/RP `[0,4,0]`, sem outra revisão Altare concorrente. Executar `/function altare/dev_kit`.
2. Montar 7×2 com altura de um bloco. Usar **Acabamento do altar → Floral IHS · cores litúrgicas**, alternar as oito cores e reabrir o menu. Conferir ouro/flores, centro, recorte, tampo branco e quatro cantos.
3. Colocar pedra e caldeirinha sobre a toalha; trocar cor/estrutura, salvar/reabrir. Objetos, apoio e interação devem permanecer. Repetir centro dividido em 8×2 e mesa 1×1, nas quatro direções e nos dois modos gráficos.
4. Conferir Content Log: nenhum novo erro de geometria, Molang, materiais, texture sets, colisão, dependências, componentes ou `[Altare]`. Executar concorrência, chunks e ciclo de vida conforme [TESTING.md](TESTING.md).

Não há aprovação física nesta sessão. Persistem os limites de retângulos, quatro apoios de canto na mesa, ausência de solver e necessidade de suporte próprio para itens não colocáveis. Atualização/downgrade em [MIGRATION_0.4.0.md](MIGRATION_0.4.0.md); contrato de cores e contornos em [TEXTILES_0.4.0.md](TEXTILES_0.4.0.md).

Fonte artística pela ferramenta imagegen integrada: [original v2](../assets-src/atelier/embroidery-plates-v2.png) e [prompt integral/proveniência](../assets-src/atelier/SOURCE_V2.md). Mapas do pack são compilados de forma reproduzível; sem edição manual dos PNGs distribuídos.
