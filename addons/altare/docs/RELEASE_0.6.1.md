# Altare 0.6.1 — Arca e Balaústres

[Pacote](../dist/releases/Altare-0.6.1.mcaddon) · [Validação oficial](../dist/validation/0.6.1/release-summary.json) · [Modelos em várias dimensões](../out/joinery-0.6.1/index.html) · [Construção, orçamento e compatibilidade](JOINERY_0.6.1.md).

O pacote acrescenta duas famílias de marcenaria. Altare 0.5.0 é a referência preservada; Aspergillum permanece 1.2.5. O estúdio é 1.6.0. Nenhuma instalação ou mundo foi atualizado automaticamente.

## Evidência da revisão

51 testes Altare, 107 testes da raiz e 74 testes do viewer passaram. `npm run check`, build do viewer, smoke do Workbench e smoke do estúdio compilado passaram. O teste de UI inclui os novos modelos, material/relevo suspensos, cores, desfazer/refazer, exportação e reabertura de cenas, quatro ambientes e mobile.

Arquivo final: 11.010.631 bytes, 980 arquivos, SHA-256 `e91f2e69774c5b8af063fee7ad7945fff9edf93a71c390850ae0e701bb4dd431`. Creator Tools: zero erros e zero avisos. Comparação: 603 arquivos anteriores byte-idênticos; 368 recursos novos. Os nove arquivos globais restantes mudam apenas conforme o contrato de release.

44 capturas possuem hashes conferidos contra o pacote final, sendo 40 sem PBR e quatro com PBR. [Duas renders em cenário, 1920×1080](../../../out/altar-renders/joinery-0.6.1/index.html). São imagens externas ao jogo; aceitação no Minecraft continua pendente.

## Reteste mínimo no Minecraft

1. Importar o arquivo 0.6.1 sem revisão Altare concorrente. Num altar 7×2, abrir a ferramenta e escolher Arca ou Balaústres.
2. Primeiro aplicar sem toalha. Conferir painéis e juntas da arca; nos balaústres, olhar frente, verso e laterais, vãos entre apoios e encontros das travessas nos cantos.
3. Aplicar cada toalha, incluindo Floral IHS verde/roxo/vermelho. A estrutura mantém suas medidas e o centro fica único; em 8×2, as metades do bordado se encontram.
4. Repetir em 1×1 e 3×2, girar as quatro frentes e colocar um objeto permitido sobre o tampo. Trocar o acabamento com objetos apoiados: não devem mover, cair ou ser recriados. As caixas inferiores não devem preencher os vãos.
5. Cancelar uma edição e confirmar ausência de escrita; aplicar/reabrir e confirmar a escolha. Quebrar um módulo e reaplicar após reconstruir; repetir com dois jogadores e após recarregar o mundo.

Esperado: nenhum novo erro de registro, geometria, material, colisão, CustomForm ou ID; nenhuma mensagem de rollback no uso normal. Registrar o hash do pacote, versão do Minecraft e Content Log. O orçamento conjunto conhecido está próximo do limite; somar os demais packs antes de atribuir eventuais avisos de permutações a um erro de um modelo específico.
