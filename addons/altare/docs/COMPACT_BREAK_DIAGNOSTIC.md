# Diagnóstico de poses legadas após quebra

Preparação isolada em 04/11/2026, sobre `c0d4310bb787fbee5b38efe160f22f2642f71e9a` (Altare 0.11.2). **Não é compactação, migração, release ou autorização para abrir saves com outro schema.** Nenhum arquivo de runtime, pack, geometria, textura, manifest ou versão foi alterado.

## Por que este diagnóstico existe

O candidato de compactação considera 28 poses locais para Atelier e 50 para a Mensa. Nem todo estado legado fora dessas tabelas veio de comandos: uma quebra normal após aplicar o acabamento pode produzi-lo. `withEdges()` conserva o papel dos Atelier legados e da Mensa; `BedrockSurfacePort.reconcileAround()` utiliza essa função quando atualiza o contorno.

Exemplo reproduzível no domínio da main:

1. Planejar 3×1 com `altare:a_pilaster_marble_agnus_none`, frente 0.
2. O módulo central tem `edges=5`, `role=1`.
3. Retirar o módulo oeste e reconciliar o centro.
4. O centro passa a `edges=13`, `role=1`. A tabela compacta não contém essa pose.

As quatro frentes têm casos equivalentes. A Mensa também produz poses rejeitadas. Recolocar o módulo pode restaurar o contorno anterior; reaplicar o acabamento recentraliza a composição, mas é uma operação explícita diferente de verificar um snapshot. O diagnóstico nunca a executa sobre uma entrada fornecida.

## Ferramenta somente de leitura

Na pasta `addons/altare`, com Node 24:

```sh
node --experimental-strip-types tools/audit-compact-compatibility.mjs --synthetic
node --experimental-strip-types tools/audit-compact-compatibility.mjs --snapshot /caminho/snapshot.json
node --experimental-strip-types --test tests/compact-compatibility-diagnostic.node.ts
```

O CLI escreve exclusivamente em stdout/stderr. Não recebe destino de escrita, não procura mundos, não abre LevelDB, não carrega Minecraft API, não instala packs e não emite estados convertidos. Redirecionar stdout para arquivo é uma decisão explícita do chamador. O modo snapshot calcula SHA-256 dos bytes lidos e preserva a entrada.

O arquivo fornecido deve ter até 16 MiB e até 100.000 entradas:

```json
{
  "schemaVersion": 1,
  "baselineCommit": "c0d4310bb787fbee5b38efe160f22f2642f71e9a",
  "entries": [{
    "dimension": "minecraft:overworld",
    "position": {"x": 1, "y": 64, "z": 0},
    "id": "altare:a_pilaster_marble_agnus_none",
    "states": {"altare:edges": 13, "altare:role": 1, "altare:facing": 0}
  }]
}
```

Esse envelope é um formato de **entrada de diagnóstico**, não um exportador de mundo implementado. Dimensão e coordenadas localizam o achado; a ferramenta não verifica a origem nem a cobertura da exportação. Entradas duplicadas no mesmo local são recusadas. States precisam ter exatamente as chaves do schema legado, sem strings numéricas, valores não finitos, campos ausentes ou mistura de índices compactos.

O relatório usa uma lista explícita de dados permitidos: índice, dimensão suportada, coordenadas numéricas `x/y/z`, ID conhecido do conjunto avaliado e diagnóstico. Metadados extras, chaves adicionais de `position`, states brutos e objetos de ID não são copiados. IDs fora do conjunto avaliado são emitidos como `null`, preservando a classificação `unassessed` ou `invalid` e o índice/local para investigação no arquivo original. Somente `minecraft:overworld`, `minecraft:nether` e `minecraft:the_end` são aceitas como dimensões; dimensões customizadas exigem revisão explícita do contrato antes de usar esta ferramenta.

Erros do CLI usam somente mensagens fixas da etapa que recusou a entrada. Trechos de JSON inválido, caminhos fornecidos pelo chamador, mensagens brutas de filesystem/loader e stack traces não são impressos. Isso minimiza reflexão acidental de dados, mas o relatório ainda contém as coordenadas e IDs conhecidos solicitados, além do hash da entrada; não é uma ferramenta de anonimização.

Resultados:

- `representable`: a pose consta da tabela de referência. Não prova equivalência visual ou segurança da migração.
- `normalization-required`: receita nua com papel legado diferente de zero. Uma conversão descartaria esse dado; o diagnóstico apenas informa, nunca normaliza.
- `incompatible`: pose válida no schema legado, ausente da tabela candidata.
- `invalid`: entrada não corresponde ao schema legado exigido.
- `unassessed`: ID fora dos 135 Atelier legados e `altare:mensa`. Não significa compatível nem inválido.

Exit codes: **0** para execução sintética concluída ou snapshot composto somente de poses representáveis; **2** quando um snapshot contém qualquer outra classificação; **1** para envelope, arquivo, argumentos ou baseline inválidos. Exit 0 não aprova migração, inclusive para envelope vazio. Todo relatório declara `migrationApproved: false`; snapshots também declaram `worldCoverageVerified: false`.

Os hashes de sete fontes da baseline são fixados em `tools/fixtures/compact-diagnostic-baseline.json`. O CLI recusa execução se elas divergirem. A referência Mensa de 50 poses está isolada em `tools/lib/compact-compatibility-diagnostic.ts`, com ordem protegida por teste e hash do estudo: `f66361d205f1805def0943dbb0a510e0b1808bafb53fa4cb99bb2c0764dccfbd` (serialização de objetos `edges`/`frontal`). Não é um codec publicado nem é importada pelo runtime. Mudar essas referências exige reavaliar o diagnóstico, não apenas atualizar números esperados.

O CLI valida o commit, a lista completa e exata das sete fontes e todos os hashes **antes do import dinâmico de qualquer módulo local**. Manifest vazio, parcial, ampliado, malformado ou fonte ausente impede o import. Somente módulos internos do Node são importados antes dessa barreira. Testes alteram cópias temporárias com efeitos sentinela para provar que a recusa acontece antes de executá-las; nunca alteram os arquivos de produção. Esse gate detecta divergência em um checkout confiável, não substitui um sandbox contra alteração concorrente de arquivos ou adulteração conjunta do CLI e seus hashes.

## Cobertura e resultado da matriz

Para cada um de cinco representantes, o modo sintético planeja todos os retângulos 1–16 × 1–8 nas quatro frentes: **512 disposições, 19.584 remoções únicas de células e 65.024 verificações de vizinhos sobreviventes**. Cada remoção começa do retângulo intacto; não é uma cadeia cumulativa.

| Representante | Verificações incompatíveis após quebra | Poses locais incompatíveis distintas |
| --- | ---: | ---: |
| Mensa clássica | 5.216 | 32 |
| Pilastras, mármore, Cordeiro | 928 | 12 |
| Ogivas, calcário, sem toalha, cruz | 928 | 12 |
| Cavaletes, nogueira, Floral, Cordeiro | 928 | 12 |
| Pilastras nuas sem aplique | 0 | 0 |

No representante nu, 2.040 verificações exigiriam normalização de papel. Os números contam estados observados repetidamente em ensaios sintéticos; **não estimam quantos blocos ou mundos reais estão afetados**. O relatório inclui testemunhos com dimensão do retângulo, frente, posição removida, sobrevivente e states antes/depois.

A enumeração independente do domínio cartesiano legado classifica:

| Domínio | Representáveis | Normalização exigida | Incompatíveis |
| --- | ---: | ---: | ---: |
| 135 Atelier, 34.560 estados | 14.688 | 1.728 | 18.144 |
| Mensa, 11.520 estados | 3.000 | 0 | 8.520 |

Os testes cobrem ainda todas as 135 receitas Atelier nos 512 layouts retangulares antes da quebra, sequências de quebra/JSON/recolocação/reaplicação, múltiplas quebras, recusa de entradas malformadas, hashes de baseline e preservação de bytes pelo CLI. Um vizinho desconhecido é mantido como desconhecido, nunca tratado como ar. O JSON round trip testa a representação de dados do domínio, **não** o salvamento Bedrock.

## Limites e reteste nativo necessário

O simulador usa as funções de domínio reais e espelha a ordem de `reconcileAround`, mas não instancia `BedrockSurfacePort` nem reproduz a ordem dos eventos, ticks, cache de permutações, descarregamento de chunks, falhas de escrita ou rede. A matriz de quebra única não prova fechamento do codebook sob todas as sequências de edição. As poucas sequências encadeadas dos testes são regressões específicas, não enumeração exaustiva.

Antes de qualquer migração, reproduzir num mundo descartável/copied com o pack antigo: aplicar 3×1, quebrar a lateral, esperar reconciliação, inspecionar states, salvar/reabrir e conferir novamente. Repetir em quatro frentes, Mensa/Guadalupe, centros divididos e bordas de chunk. Fazer a exportação com o schema antigo ainda ativo. Uma entrada incompatível deve bloquear conversão sem alterar arte, contorno ou papel silenciosamente.

Não presumir cobertura global a partir dos chunks carregados. A API oficial documenta que consultas com supressão de erros de chunks descarregados só examinam locais carregados. [Dimension.getBlocks](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/dimension?view=minecraft-bedrock-stable)

A referência de 65.536 trata do registro de combinações e de desempenho/Marketplace, não de quantidade de crafts nem de poses usadas por uma única construção. Este diagnóstico não muda o orçamento atual: Altare **78.432**, Aspergillum **9.744**, soma **88.176**. [Block States and Permutations](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockstatesandpermutations?view=minecraft-bedrock-stable)

Rollback verificável exige backup integral do mundo e packs correspondentes. Este trabalho não fornece exportador completo, importador, conversor ou mecanismo de rollback.

## Verificação desta preparação

- Dez novos testes de diagnóstico passaram, incluindo preservação do arquivo de entrada e exit codes do CLI.
- Typecheck estrito separado passou para a biblioteca e seus testes (essas pastas não fazem parte do tsconfig de runtime).
- `npm run check` do Altare passou: 141 testes, tipos, geração e validação estrutural; contagem emitida permaneceu em 78.432.
- `npm run check` da raiz passou: 123 testes Aspergillum, 101 testes viewer, documentação, geração e validadores. A primeira tentativa não encontrou a dependência `three` no worktree novo; foi repetida com as dependências locais existentes do viewer.
- O check da raiz reemitiria áudio com bytes diferentes no ambiente. Esses outputs de áudio e respectivos relatórios foram restaurados da baseline, fora do commit; a validação final foi repetida. Fontes/runtime/packs/arte/versões permanecem sem diferenças em relação à baseline.
- Nenhum `.mcaddon` novo, instalação, publicação, migração ou execução Minecraft foi realizado. Os testes automatizados não promovem os schemas compactos.

### Correção da revisão de segurança

- Quatorze testes de diagnóstico passaram após corrigir a ordem do import, a lista de dados permitidos no relatório e a sanitização dos erros. Os quatro testes novos cobrem sentinelas em metadados/IDs/JSON/caminhos, todas as sete fontes adulteradas, fonte ausente e manifests parciais/malformados/ampliados.
- A verificação observa ausência de arquivos sentinela, stdout vazio nas recusas, mensagens fixas, bytes de entrada preservados e ausência de dados privados sentinela nos relatórios e erros.
- Typecheck estrito separado da biblioteca e dos testes passou. Os checks gerais já concluídos acima não foram repetidos nesta correção restrita à ferramenta, seus testes e esta documentação.
- Nenhum save real foi acessado, e nenhuma mudança de runtime, pack, baseline ou mundo foi feita.
