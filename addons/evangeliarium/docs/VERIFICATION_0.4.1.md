# Verificação do candidato 0.4.1

- Artefato `dist/releases/Evangeliarium-0.4.1.mcaddon`: 2,042,914 bytes, 89 arquivos, comparados byte a byte com os packs finais.
- SHA-256: `72b584b9583eab8f0d43d108f62b82c7faa0c3280543bab526bf116897b53bf0`.
- `FULL_CALENDAR_SWEEP=1 npm run check`: build, TypeScript, **144 testes aprovados, zero falhas e zero skips**, validação estrutural.
- Varredura integral reproduzível: **3.074.246 datas** (1583–9999), zero chaves ausentes e zero rótulos de projeção incorretos. Relatório `out/calendar-coverage-1583-9999.json`, gerado por `npm run calendar:audit`.
- Década 2026–2035: **3.652 datas**, tabelas oficiais independentes de festas móveis/ciclos, precedência brasileira, transferências e casos de fronteira. Integridade de chaves não certifica história, calendários locais ou decretos futuros.
- Testes UI: abertura direta sem avisos genéricos; consulta privada por data; preservação de marcas; reabertura após meia-noite de Brasília; projeção sinalizada de forma mínima; vigília separada; Corpus 24/06/2038 direto e transferência de João somente nos dias candidatos 23/25; callbacks obsoletos, troca de exemplar e persistência.
- Creator Tools oficial **0.17.7**, `MCT_TEST_PINNED_MC_VERSION=1.26.60.5`, HOME temporário gravável: **zero Error/Failure, zero aviso inesperado, 16 avisos documentados de ingredientes vanilla não resolvidos offline**. Nenhum teste excluído ou formato rebaixado.
- O primeiro ensaio sem versão fixada usou fallback obsoleto 1.26.0; a repetição seguiu o procedimento documentado em `VERIFICATION_0.4.0.md`. Consultas de registry retornaram HTTP 502 durante a execução offline; o relatório completo permanece em `dist/validation/0.4.1/`.
- Nenhum código do ZIP recebido executado. Modelos, UUIDs e contratos de mundo não mudaram.

## Limites e reprodução

`FULL_CALENDAR_SWEEP=1 npm run check`, depois `HOME=<temporário gravável> MCT_TEST_PINNED_MC_VERSION=1.26.60.5 node tools/package.mjs --replace` para substituir deliberadamente o candidato local.

O pacote foi validado por ferramentas, não dentro do Minecraft. Importação, Content Log, layout em janela estreita, controles, watchdog e coexistência dependem de teste nativo. A fonte recebida não concede automaticamente licença pública de redistribuição. Nenhum push, instalação ou publicação foi realizado nesta tarefa.

Contrato e fontes: `DAILY_SELECTION_0.4.1.md`.
