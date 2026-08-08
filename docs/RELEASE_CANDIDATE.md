# Runbook do Release Candidate

## Identidade

- Release Candidate: `1.1.7`.
- Revisão dos packs: `[1, 1, 10]`.
- Baseline funcional herdada: `1.0.20`, validada pelo usuário.
- Experimentos: nenhum.
- Autoridade: servidor para estado; cliente somente para apresentação.

Esta revisão preserva binding, grip, envelope físico, poses, animações, steering, partículas, áudio, docking parcial e a cabeça simples da v1.1.6. Na caldeirinha, estrutura e aspersório acomodado usam `opaque`; somente a água usa `blend`, conforme a composição B aprovada na matriz física 1.1.7a/b/c.

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
3. Importar somente `Aspergillum-1.1.7.mcaddon`.
4. Criar ou duplicar um mundo de teste sem experimentos.
5. Limpar o Content Log antes de entrar.
6. Executar `/function aspergillum/dev_kit`.

## Caminho crítico

| Caso | Critério de aprovação |
| --- | --- |
| Encher | água aparece, balde/política Creative corretos, mensagem localizada única |
| Carregar | item sempre visível em FP, dip e retorno contínuos em TP, commit no tick 10, duas microgotas discretas dentro do vaso e nenhum recurso duplicado |
| Aspergir | animação e 36 gotas preservadas, carga/cooldown corretos |
| Órbita visual | item e composição acomodada correspondem; água permanece translúcida, estrutura opaca e os degraus superiores/inferiores permanecem contínuos até junto ao plano próximo |
| Vazio | clique seco privado e mensagem localizada; nenhuma água ou release |
| Áudio | 15 famílias/48 variantes legíveis, sem duplicação, com prepare privado e commits espaciais |
| Acomodar | agachar + usar funciona uma vez; `12+4→16+0`, `14+4→16+2` e `16+4→16+4` conservam o total |
| Retirar | mão vazia devolve exatamente o item, inclusive cargas restantes do snapshot V2 |
| Quebrar/reload | snapshot não duplica nem desaparece |
| Idioma | mudar `pt_BR`/`en_US` muda lore e HUD sem recriar o item |
| Mesa | dezesseis rotações, vazio/ocupado, item correto sobre veludo, aro sem faixa preto/prateada em movimento e materiais legíveis em clássico/Vibrant Visuals |
| UI | cinco espaçadores, somente um divisor final, três perfis, 3×3 acabamentos, restauração, conclusão e **Fechar** localizados e legíveis |
| Custo zero | edição não altera carga, água, item, XP ou cooldown real |
| Concorrência | somente um editor por mesa; fechar, concluir, quebrar, morrer, sair ou trocar dimensão liberam a sessão |
| Compatibilidade | mundo/item 1.0.20 assumem aparência clássica e continuam carregando, aspergindo e acomodando sem perda |

## Desempenho

Não criar LOD por intuição. Registrar `/script profiler start` e `/script profiler stop` com 1, 4, 8 e 16 jogadores executando três aspersões. Anotar plataforma, gráficos, pico, média, sessões remanescentes e contagem observada de rajadas. Somente uma regressão reproduzível autoriza perfil reduzido, e esse perfil deve preservar estado, timing e origem.

## Go / no-go

**Go** exige:

- `npm run check` e `npm run package` verdes;
- Content Log sem mensagem atribuível ao add-on além das duas ocorrências conhecidas de `MaterialInstances` registradas para o perfil `opaque`/`blend`;
- caminho crítico aprovado em primeira e terceira pessoa;
- smoke test em `pt_BR` e `en_US`;
- nenhum item, água ou snapshot perdido/duplicado;
- desempenho aceitável na plataforma-alvo disponível.

**No-go** ocorre diante de perda/duplicação, erro de conteúdo novo, falha de input, regressão visual bloqueante, mensagem não localizada ou degradação mensurável. As duas mensagens conhecidas de `MaterialInstances` não autorizam outras exceções. A correção deve virar uma revisão RC incremental; não se altera silenciosamente o artefato já assinado.

Publicação comercial também é **no-go** enquanto os 48 SFX desta RC free-tier não forem regenerados/substituídos sob licença ElevenLabs paga. Para teste não comercial, manter a atribuição “Generated with ElevenLabs”.

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
