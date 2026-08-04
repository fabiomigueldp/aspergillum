# Lições aprendidas

1. Um campo aceito pelo parser não garante semântica ativa no schema escolhido; `binding` só foi comprovado com geometry `1.16.0`.
2. Binding transfere a transformação do holder, mas não reposiciona os vértices da malha.
3. Pivot define rotação; cube origin/posição define onde a malha existe.
4. O bone local não precisa se chamar `rightItem`; a expressão de binding resolve o bone do holder.
5. Binding, apresentação por perspectiva e ação precisam de bones/camadas separados.
6. Primeira e terceira pessoa exigem calibrações independentes.
7. Transformações de uma malha vanilla não são universais nem devem ser transplantadas cegamente.
8. Um modelo diagnóstico mínimo é mais útil que várias compensações artísticas simultâneas.
9. A investigação deve comparar fonte, `.mcaddon`, pack instalado, UUIDs, versões e Content Log antes de culpar cache.
10. Faces ausentes podem vir de UV omitido, plano de espessura zero, alfa ou culling; material do bloco não diagnostica material do attachable.
11. Partículas e gameplay são sistemas distintos: o servidor autoriza; VFX comunica.
12. A origem matemática é um fallback útil, mas um locator animado é a referência visual correta.
13. Curvatura entre pulsos pode ser controle deliberado. Qualidade vem de slerp, limite angular e world-space, não de congelar a câmera.
14. Criativo infinito deve ser política contextual sobre carga finita, não estado persistido especial.
15. Callbacks atrasados precisam da identidade do item, não apenas do slot ou tipo.
16. Locks não servem apenas para conservação de recursos; evitam feedback e animações concorrentes incoerentes.
17. Sem transação atômica entre item e bloco, restauração compensatória precisa estar centralizada e testada.
18. Converter um ItemStack em booleano destrói metadados e bloqueia cosméticos/regulagens futuras.
19. IDs de cosmético e perfil devem existir no schema antes das primeiras variantes, mesmo com defaults únicos.
20. Não se remove um fallback funcional antes de validar a alternativa no artefato final e no runtime.
21. Relatórios de vídeo são evidência espacial valiosa, mas precisam ser reconciliados com os arquivos realmente empacotados.
22. Documentos devem separar claramente “implementado”, “baseline” e “planejado” para não transformar arquitetura-alvo em alegação de produto.
