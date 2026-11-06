# Polimento do candidato 0.3.1

## Leitura

- `Ir para página` permite saltar dentro da leitura atual dos três livros. O número é validado, erros preservam o rascunho e cancelar mantém a página. Navegar não grava marca no exemplar.
- Missal/Pontifical retornam à mesma página da lista ou busca de origem. Resultados mostram consulta, intervalo e total; uma busca vazia orienta a tentar outras palavras.
- `Textos relacionados` abre destinos internos verificados sem rede. `Voltar à leitura anterior` restaura seção, página e caminho de origem. Destinos repetidos/ausentes não viram botões. Referências sem destino offline verificado são avisadas, sem adivinhar URLs de hosts antigos.
- O runtime conserva todos os grupos de cada seção, inclusive leituras compartilhadas das ordenações. Busca inclui todos os grupos e os rótulos de apresentação.

## Ajustes editoriais rastreáveis

O catálogo de origem, títulos e blocos litúrgicos permanecem intactos. Os geradores `tools/liturgy-labels.mjs` e `tools/liturgy-navigation.mjs` acrescentam somente metadados de apresentação.

- Sete títulos `Missa do Dia`/`Missa da Vigília` recebem a solenidade que os antecede no índice [Próprio do Tempo](https://missalromano-mine.blogspot.com/p/proprio-do-tempo.html): Natal, Epifania, Ascensão e Pentecostes. Dois rótulos jubilares usam o primeiro heading da própria página.
- Seis orações eucarísticas são associadas a `Orações Eucarísticas` pelas labels do [índice](https://missalromano-mine.blogspot.com/p/oracoes-eucaristicas.html) e títulos dos destinos. Dois prefácios recebem `Prefácios` pelos títulos próprios, conservando a duplicata publicada do Comum IX.
- Primeiras leituras e aclamações da dedicação recebem `Dedicações` por seus títulos e pelo índice do [Lecionário](https://pontificalromano-mine.blogspot.com/p/lecionario.html). A Oração Eucarística IV para ordenação de presbítero (`..._13`) recebe `Ordenação dos Presbíteros`, conforme o título específico.
- O índice de Orações Eucarísticas aponta erroneamente as labels de diversas circunstâncias II/III para Reconciliação. Somente essas duas combinações exatas recebem destinos `...para-diversas_29` e `...para-diversas_56`, cujos títulos identificam II e III. Outras URLs não são remapeadas por semelhança.
- As demais seções sem associação comprovada permanecem no grupo original. Textos idênticos de orações infantis II/III não foram corrigidos editorialmente.

## Modelo

As quatro abas do corte do Missal agora entram no papel; os marcadores curtos azul/violeta ficam entre as assinaturas, sem flutuar. Cubos, faces, binding e pose permanecem iguais. Blender, exportação e ícone foram atualizados juntos. Evidência: `assets-src/liturgical-books/reports/polish-2026-11-04.json`.

## Reteste nativo

Importar exatamente o pacote 0.3.1 e confirmar Content Log. Exercitar salto inválido/válido, Cancelar, ida/volta da busca na segunda página, referência interna e retorno ao rito, marca explícita e troca de livro com formulário pendente. Conferir títulos das missas, leituras compartilhadas em todas as ordenações e aviso de referências não resolvidas. Observar abas/marcadores do Missal aberto e fechado, incluindo toque/gamepad e primeira/terceira pessoa. Renderização diagnóstica e mocks não comprovam a apresentação no Minecraft.

## Verificação executada

- `npm run check`: build, TypeScript estrito, 72 testes e validação estrutural aprovados.
- Microsoft Creator Tools 0.17.7: zero Error/Failure e zero aviso inesperado; 12 links vanilla de ingredientes não resolvidos offline. A ferramenta recebeu a mesma versão oficial fixada `MCT_TEST_PINNED_MC_VERSION=1.26.60.5` da validação anterior; consultas dos registros npm retornaram HTTP 502, sem falha estrutural.
- Pacote: `dist/releases/Evangeliarium-0.3.1.mcaddon`, 1037986 bytes, 74 arquivos. SHA-256: `e98b449d309220e0eb0fa0e7224f0993a874c5cd272f99ddb7661b070369fa23`.
- Quatro geometrias do Missal e ícone final comparados byte a byte entre arquivos gerados/fontes e o ZIP.
- Nenhum teste foi excluído. O typecheck passa a resolver imports JS dos geradores usados nos testes (`allowJs`), mantendo `strict`; nenhum critério foi relaxado.
- O check da raiz não foi repetido nesta revisão. Nenhuma publicação, instalação em mundo ou teste nativo foi realizado.
