# Verificação do candidato 0.4.0

- Artefato: `dist/releases/Evangeliarium-0.4.0.mcaddon`, **2.038.632 bytes**, **89 arquivos**, **10.729.225 bytes descompactados**.
- SHA-256: `c1efc9f87059db1daa7e53db61962d5c17f2a5ab754eb8df677b56b5328ee0b9`.
- Revisão independente somente leitura comparou as 766 chaves diretamente ao ZIP original, incluindo oito complementos e duas montagens de Missas noturnas; 12 testes específicos passaram, sem discrepâncias. O runtime compartilhado é profundamente igual ao catálogo integral.
- Os 89 arquivos foram comparados byte a byte com os packs atuais; ambos os manifests são 0.4.0.
- Build, TypeScript estrito e validação estrutural passaram; rodada final com **119 testes aprovados**, sem skips ou falhas.
- Cobertura inclui textos literais dos 766 formulários, recorte de Evangelhos/alternativas, oito notas editoriais, IDs estáveis, compartilhamento de blocos sem alteração do catálogo, paginação sem títulos órfãos, partes contextualizadas, busca incremental/cancelamento, retorno à mesma lista, marcas e troca de sessão.
- Transferência do Lecionário, identidade, nome, marca, visual e tipo sobrevivem a colocação, reinício e retirada nos mocks. Fluxos anteriores dos outros livros permanecem cobertos.
- Check da raiz também passou: 123 testes Vitest, suíte viewer, docs, build e validadores. Os arquivos de áudio incidentalmente regravados por esse build foram restaurados ao estado inicial, deixando mudanças restritas ao Evangeliarium.
- Microsoft Creator Tools 0.17.7: **zero Error/Failure**, **zero aviso inesperado**, **16 avisos documentados de ingredientes vanilla não resolvidos offline**. Relatório em `dist/validation/0.4.0/`.
- O primeiro Creator Tools usou fallback obsoleto 1.26.0 por HTTP 502 e rejeitou o formato 1.26.50 já usado nas versões anteriores. A repetição usou `MCT_TEST_PINNED_MC_VERSION=1.26.60.5`, mesma versão oficial fixada e documentada na verificação 0.3.2. Nenhum teste foi excluído nem formato reduzido. Cache/HOME em diretório temporário gravável.
- Notices de atribuição/proveniência estão em comentário no JS distribuído; não geram arquivo extrínseco inválido nem indicação de tradução na interface.

## Reprodução

Na raiz do add-on:

1. `python3 tools/import_lectionary.py` lê somente os dados do ZIP, sem executar seus scripts.
2. `npm run check` recompila fontes e verifica tipos, testes e estrutura.
3. `HOME=<diretório gravável> MCT_TEST_PINNED_MC_VERSION=1.26.60.5 node tools/package.mjs` empacota e valida. Se estiver substituindo um candidato local já gerado, use `--replace` somente deliberadamente.

## Limites

Este é um candidato validado por ferramentas, não uma aprovação dentro do jogo. Importação, Content Log, controle, animação, desempenho, memória/watchdog e coexistência com outros packs dependem de teste nativo. Calendário do ZIP não executado ou integrado; novos formulários são escolhidos explicitamente pelo índice. O Evangeliário conserva seu calendário diário anterior.

Modelo e renders: `LECTIONARY_MODEL.md`. Escopo, custo observado e roteiro nativo: `LECTIONARY_0.4.0.md`.
