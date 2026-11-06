# Auditoria das leituras votivas — 2026-11-05

## Resultado
23 formulários reais no grupo Missas Votivas, excluído o índice. Das 766 entradas do Lecionário, nenhuma é catalogada como conjunto votivo. `votive-reading-audit.json` inventaria todos; `votives.json` contém sete propostas com remissão oficial e pelo menos um destino local disponível. Nenhum arquivo runtime foi modificado e nenhum código do ZIP foi executado.

## Evidência e limite editorial
Fonte principal: https://liturgia.pt/leccionarios/MissasRituais/Lec8_MissasVotivas.pdf (Secretariado Nacional de Liturgia, Portugal). O acesso direto retornou 403; remissões abaixo foram verificadas em trechos indexados retornados pela pesquisa. Não se contornou a restrição. Isto comprova remissões na edição portuguesa, não aprovação da CNBB nem equivalência integral entre edições.

- Trindade: leituras da solenidade nos ciclos A/B/C.
- Anjos: festa dos arcanjos, 29/9.
- José: 19/3 ou 1/5; apenas 19/3 está no catálogo.
- Todos os Apóstolos: Simão e Judas, 28/10.
- Pedro e Paulo: dedicação das basílicas, 18/11; ausente.
- Todos os Santos: solenidade de 1/11, chave `todos`.

São Pedro: https://www.liturgia.pt/santos/santo_v.php?cod_santo=40, página da Cátedra, remissão explícita indexada a suas leituras; acesso direto 403. Destino local `proprio/02-22`.

São Paulo: https://www.liturgia.pt/santos/santo_v.php?cod_santo=19, HTML aberto integralmente; rubrica após Mc 16,15-18 explicitamente estende as leituras às votivas. Destino local `proprio/01-25`; At 22,3-16 ou At 9,1-22; Sl 116(117),1.2; Mc 16,15-18.

## Ausências
15 formulários permanecem sem vínculo aprovado nesta auditoria: Misericórdia; Sumo e Eterno Sacerdote; Santa Cruz; Eucaristia; Nome de Jesus; Sangue de Cristo; Sagrado Coração; Espírito Santo A/B/C; Maria Mãe da Igreja; Nome de Maria; Rainha dos Apóstolos; João Batista; Um Santo Apóstolo. Além deles, Pedro e Paulo possui remissão conhecida, mas destino ausente. Não significa inexistência das leituras oficiais: faltam conjunto local e/ou validação suficiente para sincronizar.

## Critérios para implementação
- Nunca associar por título semelhante (Misericórdia não autoriza Domingo da Misericórdia; Pedro e Paulo não autoriza 29/6).
- `readingKeys` múltiplas são alternativas explícitas, não concatenação nem seleção silenciosa.
- Fonte PT deve aparecer como tal. Se o produto exigir estritamente validação CNBB, manter as sete propostas pendentes até revisão brasileira.
- A escolha de leituras do dia é liturgicamente possível em determinados casos, mas é política distinta: não apresentá-las como leituras próprias da votiva. Referência: https://www.usccb.org/prayer-and-worship/the-mass/votive-masses-and-various-needs/masses-for-current-events
- Elegibilidade por data é outro contrato, sujeito ao calendário e às normas aplicáveis; a existência de vínculo não concede elegibilidade.

## Verificação realizada
Python padrão leu apenas JSON. Confirmados 23 IDs de formulários; 7 registros propostos; todos os `missalId` e `readingKeys` propostos existem nos catálogos. Preservados IDs reais, inclusive `missal--santissima-eucaristica`. Ausência de `proprio/05-01` e `proprio/11-18` comprovada nas chaves de provenance.json.
