# Evangeliário

Add-on independente para Minecraft Bedrock. O livro pode ser levado nas duas mãos, depositado fechado, colocado aberto, consultado e recolhido com a passagem preservada.

**Versão 0.2.5 — revisão de leitura e interface, 25/10/2026.** Página marfim, moldura vinho, navegação fixa, menus separados e campos com validação sem perder o texto digitado. Resultados e limites em [VERIFICATION.md](docs/VERIFICATION.md). O Aspergillum continua `1.2.5`.

![Modelo distribuído, captura diagnóstica](assets-src/branding/book-closed.png)

## Testar

Importe `dist/releases/Evangeliarium-0.2.5.mcaddon` e ative os packs de comportamento e recursos. Mínimo declarado: Bedrock `26.50`; alvo local de teste: `26.52`. APIs estáveis `@minecraft/server 2.10.0` e `@minecraft/server-ui 2.2.0`, sem experimentos.

```mcfunction
/give @s evangeliarium:book
```

- Use olhando para o ar para ler. `Leituras` oferece Hoje, Passagem, Data e Livro. Em Passagem, escolha o Evangelho/capítulo ou digite uma referência.
- Use sobre o topo de um bloco cheio de pedra ou madeira para colocar aberto. Agachar + usar deposita fechado.
- Use o livro colocado para abrir e ler. Agachar + usar, quebrar diretamente ou `Retirar` devolve o mesmo item se houver espaço.
- A consulta é privada. Em `Leituras > Livro`, `Marcar passagem` grava a referência; `Seguir hoje` retoma o calendário diário. Fechar fisicamente e Retirar também ficam em Livro.

O rito é romano, com calendário brasileiro e data de Brasília. A cobertura incorporada é **2026–2027**. Os quatro Evangelhos completos têm **89 capítulos e 3.779 versículos**, da **Bíblia Livre**, licenciada em CC BY 4.0. Não é a tradução litúrgica da CNBB. Tudo funciona offline no jogo.

O calendário deriva de referências públicas de uma fonte comunitária, com correções e proveniência documentadas; não constitui homologação litúrgica. Próprios diocesanos e paroquiais não estão incluídos. Fora da cobertura, a consulta por passagem continua disponível.

## Documentação

1. [Implementação, fontes e compatibilidade](docs/RUNTIME.md).
2. [Roteiro de teste no Minecraft](docs/TESTING.md).
3. [Verificação e limites da evidência](docs/VERIFICATION.md), [ferramentas de inspeção no jogo](docs/RUNTIME_DIAGNOSTICS.md).
4. [Histórico de versões](CHANGELOG.md).
5. [Conceito](docs/CONCEPT.md), [pesquisa litúrgica](docs/LITURGY_AND_CONTENT.md), [APIs](docs/BEDROCK_RESEARCH.md), [rig](docs/POSE_AND_MODEL_PLAN.md) e [roadmap](docs/IMPLEMENTATION_ROADMAP.md).

## Produção

Na pasta deste add-on:

```sh
npm ci
npm run check
npm run package
```

Node 24 e dependências instaladas da raiz são necessários para as ferramentas compartilhadas. `assets-src/` contém as fontes autorais; `packs/`, `out/`, `dist/` e `src/generated/` são gerados. `npm run render` reproduz os ícones e vistas do modelo; `npm run capture:pose` captura rigs wide/slim. Essas capturas não substituem o Minecraft.

O protótipo web anterior permanece em [prototype/](prototype/README.md), como histórico de UX. O jogo usa formulários estáveis com [JSON UI próprio](docs/UI_LAYOUT.md). RPs que substituam o mesmo ponto `server_form` podem disputar prioridade. Os identificadores e UUIDs estão em [RUNTIME.md](docs/RUNTIME.md); não reutilizam os do Aspergillum ou da Aurifrita.
