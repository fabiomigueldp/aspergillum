# Verificação — 0.2.5

Revisão de 25/10/2026 no cliente **Minecraft Windows 26.52**, AppX `1.26.5203.0`, mundo **devtest**, modo Criativo e skin clássica do usuário. A aceitação desta revisão é da interface. O modelo, as texturas físicas, as poses, o corpus e o calendário conservam a base 0.1.5, cuja inspeção está preservada em [VERIFICATION_0.1.5.md](VERIFICATION_0.1.5.md).

## Resultado no Minecraft

A página própria aparece sozinha, sem a janela vanilla sobreposta. Título e navegação permanecem fixos; o corpo tem largura limitada, margens e rolagem próprias. Botões sem destino desaparecem, campos inválidos conservam o rascunho e o retorno do menu preserva a página da leitura. Os formulários sem os marcadores do livro conservam a apresentação nativa.

Os percursos completos abaixo foram executados na revisão diagnóstica 0.2.3, em janelas de aproximadamente 1913 × 1025 e 951 × 761 pixels. A composição JSON UI dessas telas é a mesma na 0.2.5. A revisão final foi novamente importada, aberta e observada em janela pequena e maximizada, com nova confirmação da leitura, menus, créditos e Content Log. Isso não equivale a repetir todos os percursos na versão final.

| Percurso observado | Resultado e captura real |
| --- | --- |
| Evangelho do dia | Mateus 22,34–40, 25/10/2026; texto completo em uma página, sem moldura duplicada. `0.2.5-reader-951x761.png` e `0.2.5-reader-1920x1032.png` |
| Menus | Texto visível também sem foco; descrições vazias não deixam linhas extras. `0.2.5-menu-1920x1032.png` |
| Seleção guiada | João, capítulo 3, versículo 16; seletor, campo e Ler acessíveis. `0.2.3-chapter.png` e `0.2.3-john-3-16.png` |
| Referência inválida | Jo 99 retorna erro e mantém o texto; correção para Jo 3,1–36 abre a leitura. `0.2.3-invalid-reference-951x761.png` |
| Leitura longa | Jo 3,1–36 em cinco páginas; rolagem chega ao último trecho visível sem mover título/rodapé. `0.2.3-long-reading-951x761.png` e `0.2.3-scroll-end-951x761.png` |
| Retorno à leitura | Avanço a 2/5, abertura de Leituras e Escape retornam a 2/5. `0.2.3-page-two-951x761.png` |
| Data | 25/12/2026 abre João 1,1–18; quatro alternativas do Natal aparecem com referências. `0.2.3-date-951x761.png` e `0.2.3-celebrations-951x761.png` |
| Livro colocado | Menu reúne marca, fechamento físico, retirada e créditos. `0.2.3-book-menu-951x761.png`; navegação reconferida na 0.2.5 |
| Créditos | Fonte consistente com as outras telas após simplificação de símbolos; texto e Voltar alcançáveis por rolagem. `0.2.5-credits-951x761.png` e `0.2.5-credits-scroll-1920x1032.png` |
| Formulários alheios | ActionFormData e ModalFormData sem marcador mantêm a moldura vanilla, sem página marfim. `0.2.3-native-action.png` e `0.2.3-native-modal.png` |

As capturas estão em `out/runtime/screenshots/`, acompanhadas de JSON com hora e janela. São screenshots do cliente obtidos por Computer Use, sem composição de uma interface simulada. O mundo foi salvo com o livro aberto sobre o suporte verde e configurado para o Evangelho do dia; o cliente foi encerrado para descarregar o log.

## Falhas encontradas e corrigidas

- A 0.2.0 mostrava a moldura vanilla sobre a página e o rodapé fora da borda. O encaminhamento passa por um contêiner nativo com condição explícita, e o rodapé tem limites próprios.
- A 0.2.1 ocultava rótulos sem foco atrás do fundo dos botões. A camada do texto foi corrigida.
- A 0.2.2 cortava o envio do seletor de capítulo. A altura disponível foi ampliada; descrições vazias deixaram de reservar espaço.
- A 0.2.3 apresentou fonte substituta pequena nos créditos. A retirada de dois símbolos, preservando a atribuição, eliminou esse efeito nas capturas da 0.2.5. Não foi introduzida uma fonte global.
- O carregamento da 0.2.3 registrou `InvalidEntityError` ao ler propriedades de uma entidade visual expirada. Um teste reproduziu a falha antes da correção; os dois acessos agora verificam `Entity.isValid`. A simulação confirma recuperação sem trocar a identidade do livro nem produzir outro item. O aviso não apareceu na sessão final.

As versões intermediárias numeradas permanecem preservadas para rastreabilidade. Não receberam a aceitação final desta entrega.

## Pacote e auditoria

- Pacote: `dist/releases/Evangeliarium-0.2.5.mcaddon`, 317.216 bytes, 44 arquivos.
- SHA-256: `d2d2a9994b6ccced199f1c048bc43340839b0eee582a3d2cddb9f84ffc43c647`.
- Instalado em Shared e nos packs locais do **devtest** pelo gerenciador, com backup da instalação anterior e preservação dos outros packs.
- Registro: `out/addon-manager/runs/2026-10-25T05-47-23.419Z-evangeliarium-0.2.5.json`.
- Content Log: `ContentLog2026-10-25_02-47-42_1.txt`, intervalo integral de 2.110 bytes, sem erros ou avisos. A inicialização às 02:48:47 registra explicitamente **0.2.5**, 3.779 versículos e Brasil 2026–2027.
- `dist/validation/0.2.5/runtime-audit.json` confirma `installedMatches: true`, `uniqueReferences: true` e `no-errors-in-captured-interval`. O log está arquivado integralmente em `runtime-content-log.txt`.

## Verificação automatizada

- `npm run package` executado: build, tipos, **42 testes**, validação estrutural e empacotamento.
- Casos incluem referência e calendário, transferências, persistência, leitor assíncrono, recuperação da pose, continuidade de parágrafos, títulos longos e entidade visual expirada.
- Quatro Evangelhos, 89 capítulos, 3.779 versículos e 730 datas de 2026–2027 com referências resolvidas no corpus.
- Microsoft Creator Tools: zero Error/Failure e zero aviso inesperado. Os quatro avisos offline sobre ingredientes vanilla da receita permanecem identificados; não são avisos do runtime.
- `npm run check` da raiz aprovado: 107 testes de domínio/ferramentas, 54 testes do viewer, documentação e validadores do Aspergillum 1.2.5. Nenhum código ou pack do Aspergillum foi alterado nesta revisão.

## Limites da aceitação

Não foram testados gamepad, toque, cliente remoto, todas as escalas de GUI, todos os formatos de tela nem a pilha de resource packs de terceiros. Campos e seletores preservam controles nativos. O ponto compartilhado `server_form.main_screen_content` pode disputar prioridade com outro pack que o substitua; o diagnóstico sem marcadores comprova o encaminhamento padrão observado, não compatibilidade universal.

A última página e o fallback de títulos extensos têm cobertura automatizada, mas não foram novamente observados no cliente nesta revisão. Marcação, fechamento físico, retirada e poses têm evidência histórica 0.1.5 e testes de regressão; não foram inteiramente reexecutados na 0.2.5. As limitações físicas documentadas naquele relatório continuam válidas.

O texto é Bíblia Livre, CC BY 4.0, e não a tradução litúrgica da CNBB. O calendário brasileiro incorporado não inclui próprios diocesanos e cobre até 31/12/2027; a consulta dos quatro Evangelhos é independente dessa cobertura.

Construção e limites da interface: [UI_LAYOUT.md](UI_LAYOUT.md). Roteiro manual: [TESTING.md](TESTING.md). Auditoria reproduzível: [RUNTIME_DIAGNOSTICS.md](RUNTIME_DIAGNOSTICS.md).
