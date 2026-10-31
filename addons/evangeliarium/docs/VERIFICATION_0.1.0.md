# Verificação — candidato 0.1.0

## Implementação integrada em 24/10/2026

O add-on agora possui modelo de produção, texturas, porte dos braços, colocação/retirada, leitor nativo e calendário. O `.mcaddon` próprio é gerado em `dist/releases/`. A descrição atual está em [RUNTIME.md](RUNTIME.md) e o roteiro físico em [TESTING.md](TESTING.md).

- `npm run check` do subprojeto: tipos, 31 testes de domínio, transferências, adaptadores simulados e formulários, mais validação estrutural.
- Corpus: 4 Evangelhos, 89 capítulos, 3.779 versículos; validação e paginação sem perda no conjunto verificado.
- Calendário: 730 datas consecutivas de 2026–2027; referências resolvidas na edição incorporada. A verificação automatizada não constitui revisão litúrgica humana integral.
- Assets: 31 cuboides, 9 bones no attachable, atlas color/normal/MER de 256 px, UVs inteiros e raiz vinculada neutra.
- Capturas do modelo fechado/aberto, ícones nativos de 64/256 px e seis vistas do rig wide/slim. Geometria e textura de origem possuem hashes no manifest. São evidência diagnóstica Three.js.
- `npm run check` da raiz: 107 testes em 25 arquivos, 54 testes do viewer, 46 documentos e validadores de build aprovados. Nenhum pack ou código do Aspergillum precisou ser modificado.
- Microsoft Creator Tools no arquivo final: relatório em `dist/validation/0.1.0/`; exige zero Error/Failure e zero aviso inesperado. Somente quatro avisos offline sobre ingredientes vanilla da receita são aceitos.

**Pendente:** importar o `.mcaddon` no Minecraft, executar o roteiro de input/leitura/poses/persistência e verificar Content Log. Nenhuma captura externa é apresentada como prova de encaixe perfeito dentro do jogo. Pacote, hash e evidências finais estão em `release-summary.json`.

Arquivo entregue: `Evangeliarium-0.1.0.mcaddon`, **251.680 bytes**, 36 arquivos, SHA-256 `a98ede424fa3a3aa49222f908c5e94092feb4575684f9f934c839a870663c319`. A leitura integral do ZIP confirmou CRCs e igualdade byte a byte com os packs gerados. Os hashes dos assets e capturas coincidem com o manifest de render. Os links locais da documentação foram conferidos.

## Histórico: etapa anterior de concepção

O registro abaixo descreve o estado **antes da implementação 0.1.0**. Suas pendências de construção foram substituídas pela implementação acima; preserva-se a evidência da pesquisa e do protótipo.

Data: 24/10/2026, etapa anterior. Documentou o novo produto, produziu arte conceitual e preparou uma demonstração de leitura. Não é um relatório de aceitação do add-on dentro do Minecraft.

## Repositório existente

Antes do trabalho, o Git já continha alterações em `CHANGELOG.md`, `docs/PROJECT_STATUS.md`, `docs/TESTING.md` e o subprojeto não rastreado `addons/aurifrita/`. Essas alterações foram preservadas. Os arquivos novos deste trabalho ficam em `addons/evangeliarium/`.

`npm run check` da raiz passou:

- TypeScript sem erros.
- 25 arquivos de teste, 107 testes aprovados.
- 54 testes do viewer aprovados.
- Validação de documentação existente: 46 arquivos Markdown.
- Build e validação de 130 JSONs, 5 UUIDs e 149 texturas.
- Validações de coreografia, VFX, áudio, inventário 3D e release readiness da versão `1.2.5` aprovadas.

Esses checks protegem a baseline Aspergillum. Não demonstram implementação ou correção do futuro gameplay do Evangeliário. A execução não acrescentou alterações rastreadas a código ou packs existentes.

## Revisão do conceito

Pesquisa dividida entre objeto litúrgico/conteúdo, APIs atuais e rig/captura. Uma revisão cruzada encontrou e corrigiu divergências entre documentos: altura do livro, prioridade da marca persistente, retirada com inventário cheio, superfície inicial, papel da entidade visual e export do livro colocado fechado.

Também foram definidos fechamento físico durante consultas privadas, invalidação por revisão e resultado explícito sem leitura diurna para Sábado Santo. O contrato consolidado é `CONCEPT.md`; os demais documentos registram evidências e limites.

Links locais dos documentos foram verificados. A prancha possui proveniência e SHA-256 em `assets-src/concept/PROVENANCE.md`.

## Demonstração de leitura

O importador do protótipo confirmou quatro Evangelhos, 89 capítulos e 3.779 versículos, sem referências duplicadas ou lacunas inesperadas. A reprodução de `data.js` e manifesto foi comparada byte a byte; `node --check` aprovou os scripts. O maior versículo tem 277 caracteres, abaixo do orçamento de página do estudo.

No navegador integrado, a revisão observou:

- Lucas 13,1–9 em duas páginas, com ausência de Anterior na primeira e de Próxima na última.
- Escolha de João 3; intervalo invertido `20-16` recusado sem trocar o texto anterior.
- João 3,16 em página única, sem navegação redundante.
- Marcação de João 3,16, recarregamento e retomada correta.
- Consulta posterior de João 1 completo: sete páginas, sequência observada de 1 a 51, sem números repetidos ou ausentes.
- Novo recarregamento preservou João 3,16, comprovando que a consulta privada de João 1 não alterou a marca.
- Largura de 390 px: leitura e controles visíveis sem sobreposição na tela conferida; viewport normal restaurado ao terminar.

Captura da demonstração: [reader-preview.jpg](../prototype/reader-preview.jpg). A imagem mostra o navegador, não um formulário renderizado pelo Bedrock. A revisão não comprova suporte de gamepad/toque dentro do Minecraft. A marca de teste pertence apenas à origem local do navegador usada nesta revisão.

## Limites da evidência

- Não houve importação de Evangeliário no Minecraft nem coleta de Content Log desse produto.
- Não há prova física de porte bimanual, encaixe, abertura ou UI nativa.
- Não foi gerado `.mcaddon` nem executado empacotamento do Aspergillum como substituto do novo produto.
- Calendário brasileiro completo e texto litúrgico CNBB autorizado continuam pendentes.
- A demonstração web tem validação e limites próprios em `prototype/README.md`; não é executada pelos testes do add-on existente.
