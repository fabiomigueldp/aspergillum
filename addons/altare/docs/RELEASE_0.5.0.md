# Altare 0.5.0 — diagnóstico de personalização

Revisão de 30/10/2026. [Contrato da revisão](CUSTOMIZATION_0.5.0.md).

O editor nativo reúne modelos, tecidos e cores numa tela com rascunho, restauração e aplicação explícita. O estúdio 1.5.0 compartilha as regras de configuração e acrescenta seleção visual, abas e histórico. As ogivas conservam a mesma construção com todos os tecidos.

Pacote: [Altare-0.5.0.mcaddon](../dist/releases/Altare-0.5.0.mcaddon). Relatório: [validação oficial](../dist/validation/0.5.0/release-summary.json). [Catálogo visual](../out/catalog-0.5.0/index.html) e [comparação das estruturas](../out/structure-comparison-0.5.0/index.html).

Os recursos clássicos são comparados byte a byte com 0.2.1; todos os IDs/estados/UUIDs são comparados com 0.4.2. Nenhuma migração ou atualização de instalações é executada. As capturas verificadas correspondem ao pacote exato.

## Reteste no Minecraft

1. Importar o pacote 0.5.0 sem outra revisão Altare concorrente e abrir um altar existente de 7×2 com a ferramenta.
2. Conferir a aparência inicial. Alternar pilastras, ogivas e cavaletes; material e toalha compatíveis devem permanecer. Testar Floral IHS nas oito cores, inclusive a recuperação do relevo ao voltar ao vermelho.
3. Cancelar: nenhum bloco muda. Restaurar escolhas: volta à configuração aberta. Aplicar: muda o conjunto inteiro, com vasos apoiados preservados. Reabrir deve mostrar o acabamento aplicado.
4. Trocar toalhas nas ogivas e observar que a arquitetura não encolhe. Repetir 1×1, 8×2 e quatro frentes; conferir seleção, colisão, apoio e centro par/ímpar.
5. Repetir em toque/controle e pt_BR/en_US. Expirar a edição ou quebrar a base deve fechar a tela e liberar a sessão; o segundo jogador não pode editar o mesmo conjunto simultaneamente.

Esperado no Content Log: nenhum novo erro de DDUI/CustomForm, geometria, colisão ou ID de bloco; nenhuma mensagem de rollback no caminho normal. Aceitação visual e física no Minecraft pendente do usuário.
