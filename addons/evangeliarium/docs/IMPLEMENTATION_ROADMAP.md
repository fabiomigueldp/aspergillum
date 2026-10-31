# Implementação e critérios de entrega

Revisão 2, 24/10/2026. O usuário autorizou a construção completa. A versão `0.1.0` implementa modelo, atlas, braços, leitor, persistência e calendário e entrega um `.mcaddon` integrado para teste. A implementação efetiva está em [RUNTIME.md](RUNTIME.md); o roteiro de aceitação está em [TESTING.md](TESTING.md).

A sequência abaixo registra os gates de qualidade do conceito. O candidato reúne sua implementação, mas os gates físicos de pose, formulário e runtime e a revisão litúrgica humana integral permanecem abertos. Não confundir a existência de um pacote com a aprovação desses gates. A versão 0.1.0 usa expansão explícita para versículos completos em recortes a/b/c e uma extensão condicional do render controller FP; as duas decisões estão documentadas no runtime.

## Sequência

| Etapa | Entrega concreta | Critério para avançar |
| --- | --- | --- |
| 0. Concepção | Fluxos, objeto, conteúdo, APIs e riscos documentados | Decisões coerentes com rito, runtime e pedido |
| 1. Diagnóstico de pose | Pack isolado com livro simples, braços e FP/TP | Wide/slim, offhand, caminhada, equipar e cancelar sem clipping grave |
| 2. Diagnóstico de leitor | CustomForm com capítulo curto, longo e Paixão | Teclado, controle, toque, escala de UI, foco e navegação íntegros |
| 3. Diagnóstico de objeto | Colocar aberto/fechado, recolher, metadata e reload | Uma instância por transferência, recovery testado |
| 4. Arte de produção | Fonte mestre, atlas, PBR, animações e ícones | Capturas comparáveis e pacote real sem faces instáveis |
| 5. Conteúdo | Quatro Evangelhos licenciados e calendário Brasil versionado | Corpus íntegro e calendário editorial revisado |
| 6. Integração | Casos de uso e apresentação coordenados | Fluxo completo e concorrência testados |
| 7. Release | `.mcaddon`, hash, relatórios, runbook e changelog | Tipos/testes/validador verdes e QA físico registrado |

Os diagnósticos têm identidade própria e não reutilizam os UUIDs do Aspergillum ou Aurifrita. Não distribuir vários packs de diagnóstico ativos simultaneamente. As versões numéricas não serão reaproveitadas após importação.

## Organização proposta

```text
addons/evangeliarium/
  assets-src/          modelo, atlas, referências e fontes de som
  content-src/         corpus, licenças, calendários e proveniência
  src/domain/          referências, seleção, data, paginação, políticas
  src/application/     colocar, abrir, ler, marcar, recolher, recuperar
  src/infrastructure/  Script API, repositórios, locks e relógio
  src/presentation/    formulários, sons e animações
  src/bootstrap/       composição, eventos e componentes
  packs/               saídas geradas e manifests próprios
  tools/               geração, validação e empacotamento
  docs/                contratos, pesquisa e relatórios
```

A baseline proposta do novo projeto é Creator `1.26.50`, `@minecraft/server` `2.10.0` e `@minecraft/server-ui` `2.2.0`, fixados e verificados em diagnóstico. O Minecraft local pesquisado é `1.26.5203.0` (26.52). Isso não autoriza atualizar dependências do Aspergillum em conjunto. Ver [fontes e diferenças entre release/stable/RC](BEDROCK_RESEARCH.md).

## Testes de domínio antes da integração

- Referências válidas, inexistentes, invertidas, descontínuas e entre capítulos; partes de versículo sem mapa devem falhar claramente.
- Paginação recompõe exatamente o conteúdo, preserva Unicode e não perde nem duplica fragmentos.
- Datas: ano bissexto, fevereiro inválido, meia-noite em Brasília, virada do Advento, cobertura e mudança de data com sessão aberta; ausência de leitura diurna no Sábado Santo distinta da Vigília e da falta de cobertura.
- Seleção: seguir hoje versus marca fixa; mudar consulta privada não altera seleção pública.
- Transações: falha injetada após cada escrita, eventos duplicados, inventário cheio, instância trocada durante animação e schema futuro.
- Concorrência: dois leitores, dois pedidos de retirada, marca alterada por outro jogador, fechar/abrir fisicamente com consultas privadas em curso e retirada enquanto callback de formulário chega atrasado.
- Recuperação: registry sem bloco, bloco sem renderer, renderer duplicado, reload em cada fase registrada, suporte removido e destruição autorizada.

## Captura e arte

Aplicar [MODEL_CAPTURE_TOOL.md](../../../docs/MODEL_CAPTURE_TOOL.md). Registrar opções e hashes idênticos para comparações. As ferramentas genéricas de asset/avatares precisam reconhecer o projeto antes de uso; não declarar que os comandos funcionam só porque o diretório existe.

Capturas de objeto: frente, verso, ambos lados, topo, base e oblíquas em estados fechado/aberto, gráficos de diagnóstico clássico/PBR. Capturas de avatar: wide/slim, FP e TP frontal/lateral/traseira, macros de ambas as mãos, amostragem de equipar/andar/colocar/recolher. O viewer atual precisa de extensões descritas no [plano de pose](POSE_AND_MODEL_PLAN.md).

## QA mínimo no Minecraft

Em cada diagnóstico, informar versão exata, SHA-256, plataforma e tipo de input. Usar mundo de teste sem experimentos e somente o pacote correspondente, com log limpo.

1. Obter um livro, renomear e selecionar. Ver duas mãos apoiadas, capa correta e rosto livre.
2. Alternar FP/TP, wide/slim, FOV baixo/alto; andar, agachar, saltar e trocar slot.
3. Repetir com offhand ocupado, emote, voo, natação e observador remoto.
4. Colocar aberto; ler o trecho completo, escolher outro capítulo e fechar só a UI.
5. Marcar uma passagem; recolher, colocar novamente, sair e entrar. A marca e o nome permanecem.
6. Depositar fechado e abrir depois; retirar por gesto e pelo formulário.
7. Encher inventário: retirada é recusada sem desaparecer ou derrubar o livro.
8. Dois jogadores leem independentemente; um recolhe e o callback antigo do outro não muda nenhum item.
9. Quebrar/remover suporte, testar explosão e `/setblock destroy`; conferir número exato de drops e metadata. Testar `replace` separadamente, sem presumir que tem a mesma semântica.
10. Mudar a data no adaptador diagnóstico, sem mexer no relógio do sistema: hoje muda na nova sessão; passagem marcada e sessão aberta permanecem.
11. Conferir calendário em datas de referência: Advento, Natal com variantes, Tríduo, Páscoa, Ascensão/Corpus Christi segundo Brasil, 12 de outubro, Todos os Santos e mudança de ano.
12. Repetir leitura longa em controle/toque, UI ampliada e cliente remoto. Comparar cada intervalo à edição licenciada.

Content Log: zero erros atribuíveis ao namespace do novo projeto, manifests, custom components, Molang, bones, animações, geometria, texturas, propriedades, formulários e scripts. Ausência de erro não basta para aprovar pose ou leitura. Não haverá marcador artificial de sucesso como substituto de observação.

## Empacotamento

Antes de uma revisão distribuível: rodar `npm run check` da raiz para regressões, checks próprios do subprojeto, empacotamento próprio e inspeção de `dist/releases/` e `dist/validation/<versão>/` do novo add-on. Criar scripts próprios antes de anunciar comandos ainda inexistentes. Atualizar changelog, versão, contratos e relatório na mesma mudança distribuível. Não publicar o pacote antigo do Aspergillum como evidência deste produto.

## Pendências explícitas desta fase

- Modelo/atlas Bedrock ainda não produzidos.
- Porte bimanual e FP ainda não comprovados no jogo.
- CustomForm para leitura extensa ainda não avaliado fisicamente.
- Calendário brasileiro 2026/2027 ainda não compilado/revisado.
- Tradução litúrgica oficial depende de autorização de redistribuição; a alternativa aberta será identificada como tal.
- Política de recovery após encerramento abrupto precisa de provas específicas, não apenas rollback em memória.
- Nenhum `.mcaddon` Evangeliário foi produzido ou instalado nesta etapa.
