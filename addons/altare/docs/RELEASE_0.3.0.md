# Altare 0.3.0 — entrega diagnóstica

Data: 30/10/2026. Três estruturas, três materiais, quatro tecidos ornamentados/sem toalha e três escolhas de aplique: 135 receitas novas. Tampo na altura de um bloco. Coleção clássica/Guadalupe preservada. Pronto para teste do usuário; não há aprovação física nem Content Log do Minecraft nesta sessão.

## Artefato exato

- [Altare-0.3.0.mcaddon](../dist/releases/Altare-0.3.0.mcaddon)
- SHA256: `374de6e433904fb7f553d2b871bebb8294d55b8e629e8b2903297badb622152b`
- 7.195.239 bytes; 493 arquivos.
- Canal `diagnostic`, família `modular-altar`; BP/RP `[0,3,0]`, mesmos UUIDs públicos.
- Engine mínima 1.26.40, Script API 2.9.0 e UI 2.1.0 estáveis. Nenhuma dependência experimental adicionada.
- [Resumo oficial](../dist/validation/0.3.0/release-summary.json), [relatório HTML](../dist/validation/0.3.0/altare-0.3.0.report.html), [correspondência de capturas](../dist/validation/0.3.0/capture-parity.json).

## Verificação executada

`npm run package` concluiu tipos, 24 testes, build, validação estrutural e Creator Tools 0.17.7 sobre o arquivo final: **zero erros e zero warnings**. Log em `out/package-0.3.0.log`. Não há whitelist de avisos.

O catálogo emite 136 blocos ao todo, 188 geometrias, máximo de 50 cubos por geometria, 46.080 permutações possíveis e 38 conjuntos/114 mapas. Custo RGBA decodificado: 25.952.256 bytes (24,75 MiB), sem mipmaps/ícones. O validador verifica todas as condições novas, contorno, centros, bounds pós-rotação, UVs, alpha binário, materiais e colisões. Caixas multipartes da mesa permanecem dentro da célula com tampo contínuo em y=16.

`node tools/verify-baseline.mjs` comparou **89 arquivos** com o arquivo 0.2.1: bloco clássico, oito geometrias, 20 texture sets e 60 PNGs idênticos byte a byte. Entradas do atlas, UUIDs, módulos, engine e dependências estáveis preservados. O bundle de gameplay foi ampliado intencionalmente para reconhecer as receitas; não é apresentado como idêntico. Relatório: `out/legacy-regression-0.3.0.json`.

`npm run check` na raiz passou: 107 testes do Aspergillum, 54 do viewer e seus validadores. Log em `out/aspergillum-check-0.3.0.log`. Alterações de produto desta iteração estão em `addons/altare/`; alterações preexistentes nos documentos da raiz foram preservadas.

## Inspeção visual reproduzível

[Coleção](../out/collection-0.3.0/index.html): 48 vistas de 12 configurações, frente/oblíqua em cor/PBR; cobre três estruturas, três materiais, quatro tecidos, sem toalha, apliques, orientações 0–3, larguras 1/3/4/5/7/8/16. [Guadalupe](../out/legacy-0.3.0/index.html): oito vistas de sete/oito blocos. PNGs em 2000×1000.

Inspeção individual incluiu pilastras/rubi em sete e oito, ogivas/Cordeiro e preto, mesa branca/verde, mesa descoberta e módulo 1×1. A revisão corrigiu a ordem UV dos painéis que dividia os símbolos, a altura das ogivas sob quedas longas e o encontro interno dos corpos recuados. A placa em centro par mantém as duas metades da imagem; a mesa pequena tem quatro apoios; a frente de 16 conserva escala do símbolo.

`node tools/verify-captures.mjs out/collection-0.3.0 out/legacy-0.3.0` confirmou **56 capturas** e os 493 arquivos distribuídos, com hashes de fontes/modelos/PNGs correspondentes. O capturador importa geometria Bedrock e avalia as condições emitidas; Three.js/SwiftShader não reproduz o renderizador ou a física do Minecraft.

## Uso mínimo e pendências físicas

Importar o arquivo exato em cópia de teste, selecionar ambos os packs `[0,3,0]` sem cache/revisão concorrente e executar `/function altare/dev_kit`. Montar 7×2 e usar **Acabamento do altar**: escolher estrutura, depois aparência. Experimentar arcadas/mármore/preto/cruz e mesa/nogueira/branco sem aplique.

Colocar pedra e caldeirinha sobre a toalha, converter famílias, salvar/reabrir; verificar apoio e estado dos objetos. Repetir centro par em oito, quatro frentes, recortes e colisão aberta. O Content Log não deve apresentar novos erros de geometria, material, Molang, texture sets, collision_box, componentes, dependências ou `[Altare]`. Roteiro de concorrência, chunks, input e desempenho: [TESTING.md](TESTING.md).

O tecido é estático, os apliques figurativos são placas texturizadas com espessura, e a mesa usa quatro apoios sem pernas intermediárias adaptativas. O orçamento de permutações é compartilhado com os outros packs. A revisão não inclui formas em L, altura fracionária ou acomodação de itens de inventário. [Migração/downgrade](MIGRATION_0.3.0.md) e [contrato de extensão](COLLECTION_0.3.0.md).

Fonte artística gerada pela ferramenta imagegen integrada, com prompt integral e referências em [assets-src/atelier/SOURCE.md](../assets-src/atelier/SOURCE.md). O arquivo original fica em [embroidery-plates-v1.png](../assets-src/atelier/embroidery-plates-v1.png); os mapas distribuídos são compilados de modo reproduzível.
