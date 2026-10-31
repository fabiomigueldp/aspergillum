# Verificação — 0.1.5

Revisão de 24/10/2026 feita no cliente **Minecraft Windows 26.52**, pacote AppX `1.26.5203.0`, mundo **devtest**, modo Criativo, skin clássica wide do usuário e gráficos usados nessa sessão. A inspeção do cliente usa Computer Use; as capturas Three.js são evidência separada.

## Resultado no Minecraft

As sessões 0.1.4 e **0.1.5** passaram sem erros ou avisos no Content Log. O relatório final compara todos os arquivos dos packs instalados com o build, confirma os UUIDs e uma única referência de cada pack na pilha do mundo. A 0.1.5 preserva o modelo, texturas, poses e comportamento físico da 0.1.4 e retira o fechamento duplicado da interface.

| Verificação executada | Evidência |
| --- | --- |
| Entrada no mundo e recuperação após F5 | Pose automática; não depende de `inspect replay` |
| Primeira pessoa | Livro vertical centralizado, duas mãos aproximadas da base e mira livre |
| Terceira pessoa | Livro erguido diante do corpo, sustentado pelas duas mãos; câmera alinhada ao tronco |
| Troca de slot | Braços liberados no slot vazio e retomados ao selecionar o livro |
| Hoje | Lc 13,1–9 em 24/10/2026, data de Brasília, páginas navegáveis |
| Colocação | Item sai da barra e aparece aberto no topo do concreto verde já existente |
| Leitura colocada | Formulário abre a partir do objeto no mundo |
| Referência livre e marca | Jo 3,16 aberto e marcado pelo formulário |
| Fechamento físico | Capa fecha, livro permanece sobre o suporte |
| Retomada na 0.1.5 | Livro fechado e marca Jo 3,16 preservados ao reabrir o mundo |
| Retirada na 0.1.5 | Objeto removido do suporte; item retorna à barra e mantém Jo 3,16 ao abrir na mão |
| Leitor na 0.1.5 | X nativo fecha; não há botão Fechar duplicado; Seguir hoje restaura Lc 13,1–9 |
| Porte na 0.1.5 | Primeira e terceira pessoa observadas novamente, com retomada automática após retirada |

Capturas reais em `out/runtime/screenshots/`, com arquivos JSON de hora/janela:

- `0.1.5-first-person.png` e `0.1.5-third-person.png`: poses na revisão final instalada.
- `0.1.5-persisted-closed.png`, `0.1.5-persisted-mark.png`, `0.1.5-retrieved.png` e `0.1.5-held-mark.png`: persistência e retorno ao inventário.
- `0.1.5-today.png`: data de Brasília, paginação e fechamento nativo.
- `0.1.4-placed-open.png`, `0.1.4-reader-placed.png`, `0.1.4-reference-john.png` e `0.1.4-placed-closed.png`: colocação, leitura e fechamento físico antes da atualização.

A pose de terceira pessoa da 0.1.3 foi mantida em 0.1.4/0.1.5. Cabeça e tronco vanilla podem apontar em direções diferentes; uma vista frontal do olhar nem sempre é frontal ao livro. Ao terminar, a câmera de diagnóstico foi restaurada, o livro foi deixado na primeira posição da barra em Seguir hoje e o mundo foi salvo.

Log de aceitação **0.1.5**: `ContentLog2026-10-24_18-05-04_1.txt`, 2.576 bytes, arquivado integralmente em `dist/validation/0.1.5/runtime-content-log.txt`, após sair do mundo e encerrar o cliente para descarregar o buffer do log. O relatório `runtime-audit.json` confirma `installedMatches: true`, `uniqueReferences: true` e `no-errors-in-captured-interval`. O startup às 18:09:09 registra a versão 0.1.5; não há erro ou aviso no intervalo completo capturado.

A aceitação 0.1.4 também permanece arquivada: `ContentLog2026-10-24_17-56-26_1.txt`, 2.110 bytes, em `dist/validation/0.1.4/`. As sessões anteriores revelaram erros reais e não receberam aceitação: seus pacotes numerados foram preservados.

## Verificação automatizada

- Tipos, 36 testes de domínio, transferências, adaptadores simulados, leitor e recuperação de pose, além de validação estrutural.
- 4 Evangelhos, 89 capítulos e 3.779 versículos; 730 datas de 2026–2027 com referências resolvidas no corpus.
- 31 cuboides, raiz vinculada neutra, 3 mapas de 256 px; captura de ícone com cobertura alfa verificada.
- `npm run check` da raiz aprovado: 107 testes de domínio/ferramentas, 54 testes do viewer, documentação e validadores do Aspergillum 1.2.5. Nenhum código ou pack do Aspergillum foi modificado.
- `.mcaddon` validado por Microsoft Creator Tools: zero Error/Failure e zero aviso inesperado. Quatro avisos offline sobre ingredientes vanilla da receita são conhecidos; não são aceitos como avisos de runtime.

Pacote, tamanho e hash exatos: `dist/validation/0.1.5/release-summary.json`. Ferramentas reproduzíveis: [RUNTIME_DIAGNOSTICS.md](RUNTIME_DIAGNOSTICS.md). A correção do erro da mitra pertence ao **Aurifrita 0.1.2**, instalado separadamente, sem alteração da sua arte.

## Limites da aceitação

A inspeção não cobre multiplayer, cliente remoto, Persona, rig slim dentro do jogo, todos os FOVs/escalas, gamepad/toque, Vibrant Visuals, interrupção abrupta do processo ou a matriz inteira de movimentos incompatíveis. As simulações e capturas slim externas não substituem esses testes. Há até três segundos de recuperação do porte após carregamento ou mudança de perspectiva. Os braços vanilla são rígidos, sem cotovelo articulável.

A largura e tipografia do leitor são as do CustomForm nativo. A tradução incorporada é Bíblia Livre CC BY 4.0; o calendário comunitário brasileiro não constitui homologação litúrgica e não inclui próprios locais. A cobertura diária termina em 31/12/2027; os quatro Evangelhos continuam consultáveis depois disso.

[Relatório histórico da concepção e primeira implementação](VERIFICATION_0.1.0.md). O histórico contém pendências daquela etapa; a evidência atual é a deste documento e do relatório de runtime da versão instalada.
