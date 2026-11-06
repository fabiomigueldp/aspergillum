# Verificação — candidato 0.3.0

## Artefato

- `dist/releases/Evangeliarium-0.3.0.mcaddon`: **1.029.180 bytes**, **74 arquivos**.
- SHA-256: `649009e97d385efe1501865af9d1d9e5b6c598ac8c0eb1e124cf7aee525df7b7`.
- Três famílias físicas com seus itens, blocos, visuais e texturas; UUIDs do add-on preservados.
- Modelos/fontes editáveis: `assets-src/liturgical-books/blender/missal.blend` e `pontifical.blend`.

## Verificações executadas

- Build, TypeScript e **60 testes** do add-on aprovados.
- Revisão independente confirmou tipos/testes, integridade dos textos, paginação e correções de cancelamento por dimensão e isolamento de registros futuros.
- Check da raiz aprovado: **123 testes** do Aspergillum/ferramentas, **101 testes** do viewer, documentação, build e validadores. Saídas de áudio regeneradas por esse check foram restauradas; nenhum arquivo de outro add-on foi alterado.
- Catálogo: **360 seções**, **1.540.545 caracteres**, **2.120 páginas** de até 850 caracteres. Todos os blocos/runs e a paginação foram comparados sem perda de caracteres não brancos.
- Corpus do Evangelho preservado: 89 capítulos, 3.779 versículos e 730 datas 2026–2027.
- Modelos Blender reabertos, imagens incorporadas, UVs e normais verificadas; exportação de volta aos cuboides confirmada. Missal: 46 cubos/240 quads. Pontifical: 39 cubos/201 quads. Fontes, scripts e relatórios acompanham os modelos.
- Microsoft Creator Tools 0.17.7: **zero Error/Failure**, **zero aviso inesperado**. Doze avisos documentados referem-se somente aos ingredientes vanilla das três receitas, não resolvidos pelo modo offline.

## Revisão local de persistência

A colocação recusa uma posição cujo diário persistente ainda esteja presente, inclusive se não puder ser carregado e o bloco estiver vazio. Dois testes de regressão, inicialmente falhando, verificam a preservação do diário ilegível/não reconhecido e do novo item. Não foi acrescentado mecanismo de migração. O check do add-on e o empacotamento com Creator Tools foram repetidos após a correção; a verificação da raiz acima refere-se à integração original.

## Condição da validação offline

A primeira execução não conseguiu consultar `raw.githubusercontent.com` e os registros npm (HTTP 502). O fallback interno do validador era 1.26.0 e rejeitou incorretamente os formatos 1.26.50 já usados pelo Evangeliário original.

O [version.json oficial da Mojang](https://github.com/Mojang/bedrock-samples/blob/main/version.json) foi consultado independentemente pelo GitHub: `latest.version = 1.26.60.5`, data 27/10/2026, blob `f3df233dd29f36912ffb32d494501ab3b19a9cbd`. A repetição usou a variável existente do Creator Tools `MCT_TEST_PINNED_MC_VERSION=1.26.60.5`. Nenhum teste foi excluído, erro reclassificado ou formato do pacote reduzido. O HOME do processo foi um diretório temporário gravável para o cache do validador.

O resultado final está em `dist/validation/0.3.0/`; a tentativa com fallback permaneceu em `out/validation-attempts/0.3.0-network-fallback/`. Falhas de consulta dos registros npm ainda constaram como diagnóstico da ferramenta, não como falhas estruturais do pacote. As dependências estáveis permanecem fixadas em `@minecraft/server 2.10.0` e `@minecraft/server-ui 2.2.0`.

## Não executado

**O candidato 0.3.0 não foi importado nem validado no cliente Minecraft nesta execução.** Content Log, leitura com toque/gamepad, encaixe dos braços, culling, abertura física e apresentação nativa dos rótulos/rubricas permanecem pendentes. Capturas Blender, mocks e validação estrutural não substituem o [roteiro nativo](TESTING.md).

Nenhum mundo, instalação Shared, servidor, pack de outro projeto ou versão publicada foi alterado por esta implementação. O pacote é candidato para teste, não aprovação de runtime.
