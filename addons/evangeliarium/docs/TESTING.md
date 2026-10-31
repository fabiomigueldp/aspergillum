# Teste no Minecraft — Evangeliarium 0.2.5

Este é o roteiro de aceitação do candidato integrado. Checks automatizados e capturas externas já existem; **input, renderização, encaixe dos braços e Content Log ainda precisam deste teste no jogo**.

## Teste inicial

1. Use Minecraft Bedrock **26.52**, a versão instalada identificada durante a pesquisa. O mínimo do manifest é 26.50. Crie um mundo de teste, com comandos habilitados para obter o item.
2. Importe `dist/releases/Evangeliarium-0.2.5.mcaddon`. Ative **Evangeliário — Comportamento** e **Evangeliário — Recursos**. Não é necessário habilitar experimentos. Não ative cópias antigas ou diagnósticos do mesmo pack.
3. Execute `/give @s evangeliarium:book`. Selecione o item e observe a elevação dos dois braços, a capa vertical, o contato das mãos e a linha de visão utilizável, em primeira pessoa e nas duas câmeras de terceira pessoa.
4. Olhe para o ar e use. O leitor deve abrir diretamente na passagem de hoje em Brasília. Navegue por todas as páginas. Em `Leituras > Passagem > Digitar referência`, leia `Jo 3,16-21`; marque e reabra.
5. Use sobre a face superior de um bloco cheio de **pedra ou tábuas**, com ar acima. O item deve sair do inventário e aparecer aberto sobre o bloco. Use-o para ler a referência marcada.
6. Agache e use o livro colocado. O mesmo exemplar deve voltar ao inventário. Repita usando `Retirar` dentro do leitor. Com inventário cheio, a retirada deve falhar e o livro permanecer no mundo.
7. Agache ao colocar: ele deve ficar fechado. Use-o para abrir e ler. Em `Leituras > Livro > Fechar livro`, confirme fechamento físico. Fechar apenas a janela deve deixar o livro no mundo.
8. Deixe o livro colocado, salve, saia e reentre. Leia, recolha e confirme a mesma marcação. Caminhe, corra, agache, pule e troque de item para conferir entrada, movimento e saída da pose.

O item também possui receita na bancada: cinco pepitas de ouro, dois corantes vermelhos, um livro e um couro, no padrão `GGG / RBR / GLG`.

## Content Log

Ative o log de conteúdo nas opções de Criador. Ao carregar o mundo, deve aparecer uma única mensagem informativa:

```text
[Evangeliarium] 0.2.5 ready; 3779 verses; Brazil 2026-2027; stable APIs.
```

Não devem aparecer erros de script, módulo indisponível, custom component não registrado, Molang inválido, geometria/textura não encontrada, render controller ausente ou exceção de formulário. Os quatro avisos de links vanilla descritos no relatório são do **validador offline**, não erros que se espera aceitar no Content Log do jogo.

Para relatar um problema, registre a versão exata do Minecraft, versão do pack, perspectiva, skin wide/slim, gráficos, modo de jogo, outros RPs ativos e o trecho correspondente do Content Log. Para ajuste de pose, vistas frontal, lateral e primeira pessoa do mesmo estado permitem distinguir binding, apresentação e animação.

## Matriz de aceitação

### Revisão de interface 0.2.5

1. Abrir o livro: deve haver apenas uma moldura marfim, sem janela cinza sobreposta. Título, filete, corpo e rodapé não se cruzam.
2. Conferir todos os botões sem passar o mouse: os rótulos precisam estar visíveis. Ao focar, fundo vinho e letras claras. Os extremos da paginação sem destino ficam ocultos, conservando Leituras ao centro.
3. Abrir Passagem, selecionar João e consultar capítulo/versículos. Voltar de Data ou Referência deve conservar a página anterior. Digitar `Jo 99` deve mostrar erro curto com o campo preservado.
4. Ler uma passagem curta, um capítulo inteiro e a Paixão. Rolar até o fim e avançar/voltar: nenhum trecho perdido, cortado permanentemente ou sobreposto ao rodapé. Testar também uma referência descontínua longa.
5. Abrir Livro e Créditos. Marcar, Seguir hoje, Fechar livro e Retirar ficam fora da página principal e conservam os contratos de persistência.
6. Repetir leitura, menu e formulário numa janela menor e com a escala usada pelo jogador. Mouse/teclado verificados não equivalem a certificação para toque/gamepad.
7. Executar `/scriptevent evangeliarium:inspect ui-native`: a primeira janela e seu campo de texto devem usar a aparência vanilla, sem moldura ou texto duplicado do Evangeliário.

O X e Escape fecham a leitura; em uma busca ou menu, voltam ao nível anterior. O fechamento da UI nunca fecha fisicamente o objeto.

| Área | Exercício | Resultado esperado |
| --- | --- | --- |
| Leitura | `Jo 3`, `Mt 5,1-12`, `Mc 14,1-15,47`, `Lc 1,1-4;4,14-21` | Texto completo, páginas consecutivas, nenhuma perda ou repetição |
| Referências inválidas | `Jo 99`, `Jo 3,21-16`, `Jo 3,16a` | Erro curto, campo preservado e nenhum texto fabricado |
| Marca | Consultar outra passagem sem marcar, recolher, reabrir | A marca original continua no objeto |
| Hoje | Trocar marca por `Seguir hoje` | Data civil de Brasília, independentemente do tempo do mundo |
| Virada de dia | Manter uma leitura aberta à meia-noite de Brasília | Paginação permanece estável; `Hoje`/`Seguir hoje` consulta o novo dia |
| Datas | 12/10/2026, 25/12/2026, 27/03/2027 e uma data em 2028 | Aparecida; opções de Natal; Sábado Santo/Vigília; aviso de falta de cobertura |
| Versículos parciais | 01/11/2026 ou outra referência indicada no manifest | A legenda identifica expansão para versículos completos quando aplicável |
| Superfícies | Pedra/tábuas; laje/escada; baú/porta; bloco de outro add-on | Coloca somente no suporte aceito; preserva interações próprias dos demais |
| Metadata | Nomear livro em bigorna, marcar, colocar e retirar | Nome e referência conservados |
| Recuperação | Retirar o suporte; descarregar e recarregar chunk | Um exemplar recuperado, sem visual órfão ou duplicação observada |
| Concorrência | Dois jogadores leem e tentam retirar o mesmo livro | Consultas privadas; somente uma retirada válida |
| Callback antigo | Trocar de slot, dimensão, morrer ou substituir livro com UI aberta | Sessão deixa de alterar a instância anterior |
| Modos | Sobrevivência, Criativo, Aventura e Espectador | Os dois primeiros movem item real; Aventura lê; Espectador não opera |
| Primeira pessoa | Olhar cima/baixo, FOV usual e amplo, caminhar e agachar | Livro legível como objeto, mãos encaixadas, visão utilizável |
| Terceira pessoa | Wide/slim; frente/lado/costas; caminhada e salto | Livro vertical, mãos sustentam a base, porte erguido diante do rosto, sem clipping grave |
| Cancelamento | Escudo na mão secundária, nadar, planar, montar, dormir, emote | Suspende porte bimanual; ao retornar, retoma sem braços presos |
| Multiplayer | Observador chega perto ou entra após o porte já começar | Pose e livro aparecem coerentes no cliente observador |
| Gráficos | Clássicos e Vibrant Visuals | Couro/papel legíveis; ouro sem emissão; nenhuma face piscando |
| UI | Mouse/teclado, controle, toque e escalas de UI | Texto acessível, foco correto, navegação e fechamento funcionam |
| Compatibilidade RP | Outros packs que alteram braços/controller FP | Registrar conflito de prioridade; testar também com apenas este RP |

A Bíblia Livre é identificada no leitor e em Créditos. Ela não deve aparecer rotulada como tradução CNBB. O calendário cobre 2026–2027 e não incorpora próprios diocesanos ou paroquiais.

## Critério para promoção

O candidato só recebe aceitação de runtime depois de importado, com o percurso inicial aprovado, os casos relevantes da matriz executados e ausência de novos erros do add-on no Content Log. Uma pose que falhe deve gerar uma calibração controlada e **outra versão**; não substituir silenciosamente o arquivo já testado.

Relatórios automáticos: `dist/validation/0.2.5/`. Hash e tamanho exatos do pacote: `release-summary.json` e `dist/releases/Evangeliarium-0.2.5.mcaddon.sha256`. Capturas Three.js não comprovam paridade Bedrock.


Ferramentas de inspeção: [RUNTIME_DIAGNOSTICS.md](RUNTIME_DIAGNOSTICS.md). Após entrar ou trocar a câmera, aguarde até três segundos para a renovação do porte. Registre o tronco além da cabeça: o jogador vanilla pode manter a cabeça girada em relação ao corpo.
