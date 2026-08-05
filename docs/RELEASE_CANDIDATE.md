# Runbook do Release Candidate

## Identidade

- Release Candidate: `1.0.18`.
- Revisão dos packs: `[1, 0, 25]`.
- Baseline física herdada: `1.0.17a`, validada pelo usuário.
- Experimentos: nenhum.
- Autoridade: servidor para estado; cliente somente para apresentação.

Este RC não reabre binding, grip, poses, animação, steering, partículas principais, schema ou snapshots. Seu objetivo é provar que a V1 já existente pode ser instalada, compreendida e usada sem regressão, com mensagens, áudio e evidência de release coerentes.

## Preflight automatizado

```powershell
npm ci
npm run check
npm run package
npm run validate:release
```

O gate falha quando versões divergem, catálogos `pt_BR`/`en_US` deixam de ser equivalentes, mensagens ou sons ignoram seus coordenadores, a lore perde instruções, surge `runInterval` ilimitado ou a documentação não identifica o RC.

## Instalação limpa

1. Registrar o SHA-256 do artefato.
2. Fechar o Minecraft e remover os dois packs antigos em Armazenamento.
3. Importar somente `Aspergillum-1.0.18.mcaddon`.
4. Criar ou duplicar um mundo de teste sem experimentos.
5. Limpar o Content Log antes de entrar.
6. Executar `/function aspergillum/dev_kit`.

## Caminho crítico

| Caso | Critério de aprovação |
| --- | --- |
| Encher | água aparece, balde/política Creative corretos, mensagem localizada única |
| Carregar | commit no tick 10, duas microgotas discretas dentro do vaso, sem recurso duplicado |
| Aspergir | animação e 36 gotas preservadas, carga/cooldown corretos |
| Vazio | clique seco e mensagem localizada; nenhuma água |
| Acomodar | agachar + usar funciona uma vez, preserva identidade e recusa overflow |
| Retirar | mão vazia devolve exatamente o item preservado |
| Quebrar/reload | snapshot não duplica nem desaparece |
| Idioma | mudar `pt_BR`/`en_US` muda lore e HUD sem recriar o item |

## Desempenho

Não criar LOD por intuição. Registrar `/script profiler start` e `/script profiler stop` com 1, 4, 8 e 16 jogadores executando três aspersões. Anotar plataforma, gráficos, pico, média, sessões remanescentes e contagem observada de rajadas. Somente uma regressão reproduzível autoriza perfil reduzido, e esse perfil deve preservar estado, timing e origem.

## Go / no-go

**Go** exige:

- `npm run check` e `npm run package` verdes;
- Content Log sem erro ou warning atribuível ao add-on;
- caminho crítico aprovado em primeira e terceira pessoa;
- smoke test em `pt_BR` e `en_US`;
- nenhum item, água ou snapshot perdido/duplicado;
- desempenho aceitável na plataforma-alvo disponível.

**No-go** ocorre diante de perda/duplicação, erro de conteúdo, falha de input, regressão visual bloqueante, mensagem não localizada ou degradação mensurável. A correção deve virar uma revisão RC incremental; não se altera silenciosamente o artefato já assinado.

## Registro da decisão

```text
Artefato/hash:
Minecraft/plataforma:
Mundo limpo ou migrado:
Controles/modelos/perspectivas:
Content Log:
Profiler:
Casos aprovados:
Casos reprovados:
Decisão: GO | NO-GO
Responsável/data:
```
