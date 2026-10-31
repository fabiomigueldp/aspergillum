# Personalização e catálogo 0.5.0

A ferramenta passa a uma tela nativa: Estrutura, Toalha e Frontal. Modelo, material, desenho, cor e relevo têm responsabilidades próprias. Não há mais uma entrada de cores paralela aos modelos. Rubi e paleta são apresentados como um único Floral IHS; os IDs publicados continuam iguais.

| Modelo | Construção | Materiais | Toalhas | Frontal |
| --- | --- | --- | --- | --- |
| Clássico | corpo fechado e moldura contínua | mármore, calcário, pedra escura | linho liso/bordado, curto/longo | Guadalupe |
| Pilastras | corpo recuado, bases, fustes e capitéis | mármore, calcário, nogueira | Cordeiro, Floral IHS, Faixa verde IHS, Cruzes em prata | cruz ou Cordeiro |
| Ogivas | arcadas com impostas e fecho, corpo recuado | os mesmos três materiais | os mesmos quatro desenhos | cruz ou Cordeiro |
| Cavaletes | mesa aberta, sapatas, montantes, escoras e travessas | os mesmos três materiais | os mesmos quatro desenhos | cruz ou Cordeiro sobre suporte |

Todos aceitam sem toalha e mantêm apoio em y=16. O Floral IHS oferece oito cores. Relevo adicional é compatível com o floral vermelho; as outras cores conservam o catálogo publicado sem relevo. O controle mostra essa restrição e mantém a escolha no rascunho: ela retorna ao selecionar vermelho ou outro desenho compatível. Isso não acrescenta uma combinação inexistente ao pacote. As opções clássicas e arquitetônicas também são lembradas ao alternar modelos durante a edição.

`domain/customization.ts` é a fonte das capacidades, conversão do acabamento atual e resolução do rascunho. O editor nativo e o estúdio usam o mesmo módulo. As constantes de `catalog.ts` continuam definindo a identidade persistente. `customizationFinish` valida todas as escolhas e resolve apenas receitas reais; não grava preferências suspensas no mundo.

## Aplicação e ciclo de vida

O formulário usa `CustomForm` e observables da API estável instalada 2.1.0, como a interface já existente do Aspergillum. Referência primária: [CustomForm](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/customform?view=minecraft-bedrock-stable). Não utiliza componentes marcados como preview.

Todo valor ligado a dropdown/toggle deve ser `clientWritable`, inclusive nas listas fixas desabilitadas ou ocultas. Flags de visibilidade permanecem somente de escrita do servidor. Os valores fixos não participam do rascunho nem autorizam mudanças de acabamento. A [correção 0.11.1](EDITOR_FIX_0.11.1.md) registra a falha nativa e sua regressão automatizada.

As seleções editam um rascunho. **Aplicar** retorna o acabamento para o mesmo preflight, revalidação tardia e rollback existentes. **Cancelar** ou fechar não escreve blocos. **Restaurar escolhas** recupera o altar aberto, não um padrão global. Não há prévia que escreva no mundo sob a tela.

`EditSessions.onRelease` fecha a tela quando seu lock é invalidado, liberado ou expira; não há polling, novo `runInterval` ou extensão automática do prazo. Callbacks são removidos no fechamento. A autoridade de commit continua na infraestrutura. Os testes de apresentação usam uma simulação mínima de controles, sem alegar paridade de layout, foco, mouse, toque ou controle no Bedrock.

## Construção estável

`assets-src/atelier/structure-profiles.mjs` reúne as cotas do tampo, linho, corpo e arco. Na 0.4.2, a altura das ogivas era reduzida conforme a queda da toalha, comprimindo a arquitetura. Agora as mesmas peças estruturais são usadas com todos os tecidos. A toalha cobre a construção; não a redimensiona. Bases, sapatas, vãos, colisões, pilastras e Guadalupe são preservados.

Regressão: cada membro estrutural é comparado nas três famílias × cinco tecidos × três relevos × quatro frentes. Mantêm-se 199 blocos, 53.136 estados, 188 geometrias, máximo 50 cubos, 142 PNGs e 31,75 MiB de mapas. Todos os IDs, UUIDs e valores/defaults publicados de states são preservados. Não há migração de mundo.

## Estúdio 1.5.0

Uma coluna de controles tem abas Altar, Cena e Imagem; a prévia ocupa o restante. Quatro miniaturas são capturas dos modelos reais. As composições ficam recolhidas no painel. **Desfazer** e **Refazer** mantêm até 40 configurações na sessão, incluindo escolhas suspensas; Ctrl+Z e Ctrl+Y funcionam fora dos campos. A seleção de estrutura mantém material, tecido e cor compatíveis. Botões de cor atualizam também a identificação da composição personalizada.

O formato de cena continua schema 1 e aceita os nomes antigos ruby/palette. O arquivo salva a aparência efetiva; a memória temporária de escolhas e o histórico não são exportados. Coordenadas de câmera são serializadas com nove casas decimais para permitir reabertura estável, sem deriva de ponto flutuante.

## Limites que permanecem explícitos

Retângulos de até 16×8 e altura 1; queda fixa por desenho; duas armações de extremidade nos cavaletes, sem apoios intermediários adaptativos. Guadalupe permanece ligado ao corpo clássico. L, curvas, altura fracionária, comprimentos livres de toalha e cruz sobre todas as cores exigem outro contrato de geometria/estados. O total com Aspergillum já é 62.880 estados; esta revisão não aumenta esse orçamento. A próxima expansão deve tratar esses limites na autoria e no codec, sem disfarçá-los com controles sem efeito.
