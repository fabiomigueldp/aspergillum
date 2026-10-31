# Perfis de Pilastras — Altare 0.10.1 / Estúdio 2.1.1

## Resultado e contrato

Refina o [Pilastras 0.10.0](PILASTERS_0.10.0.md): painéis esculpidos com rebaixos chanfrados, encontros diagonais fechados, chanfros mais legíveis nos fustes, bases/capitéis com proporções revistas e coroamento da mesa mais espesso. Mantém as dez toalhas, os três materiais e os relevos proporcionais ao campo descoberto.

O objetivo é conferir perfis legíveis de perto e à distância, sem aumentar cubos, faces, variantes, estados ou mapas. A revisão permanece diagnóstica. Aparência, suporte, Content Log e desempenho no Minecraft dependem da importação do arquivo exato.

## Construção e encaixes

As quatro barras retangulares de cada painel dão lugar a quatro planos inclinados que ligam o campo recuado aos membros estruturais. O campo fica em 7,05; as laterais chegam ao fuste em 8,08, a borda inferior ao embasamento em 8,16 e a superior ao friso em 8,18. Cada plano usa um registro fino de cubo com somente a face exterior; as extremidades entram nos apoios, sem tampas expostas.

As interseções formam encontros diagonais fechados. A profundidade cresce continuamente até os apoios, sem pontas de filetes cruzados. Rotação e normais são transportadas para cada orientação, incluindo os canais X/Z dos perfis horizontais. O domínio UV permanece inteiro e dentro de 128². Perfis horizontais usam o material de travessa; laterais usam o vertical.

O campo útil vai de 3,40 a 11,10 e termina lateralmente em ±4,59. Nas quinas, o chanfro termina no fuste em ±5,63/profundidade 8,08. Nos apoios intermediários, acompanha a meia pilastra até ±6,775/profundidade 7,66, encontrando a ponta real do flanco chanfrado. O contorno ajusta separadamente os dois lados de cada painel. As outras extremidades encontram embasamento em 1,65 e friso em 13,15. A segurança vertical dos relevos usa esse campo, com redução uniforme sob tecidos longos. A fixação no campo ou pilastra central permanece a mesma.

| Parte | Altura |
| --- | --- |
| Embasamento | 0–0,45; 0,45–1,15; 1,15–1,65 |
| Plinto e pé | 1,65–2,10; 2,10–2,65 |
| Fuste chanfrado | 2,65–11,60; chanfro 0,42 |
| Colo, equino e ábaco | 11,60–12; 12–12,70; 12,70–13,15 |
| Friso e cornija | 13,15–14,20 |
| Borda e coroamento | 14,20–15,35; 15,35–16 |

O rebaixo intermediário do embasamento passa a 8,06 entre bordas 8,25/8,16. O ábaco alarga-se para dentro, sem ultrapassar o friso. Os degraus continuam fechados e contíguos. O tampo termina em 16; com toalha, a base termina em 15,91. A estrutura não muda ao trocar o tecido.

## Compatibilidade e custo

Não há mudança de IDs, UUIDs, ordered states/defaults, materiais distribuídos, colisões, runtime ou codecs. Todas as 397 definições de bloco devem permanecer byte a byte iguais à 0.10.0. Só geometrias de Pilastras e versões/localização dos manifests mudam; não há novos arquivos de pack.

Mantém 2.668 geometrias, 3.334 entradas de pacote, 171 mapas de material e 34.593.792 bytes RGBA. Pilastras conserva 79 registros e reduz o pior caso a 242 faces, sob os mesmos limites 80/300. O número de estados continua 78.432. As exceções diagnósticas e o gate de profiling da 0.10.0 continuam válidos; esta revisão não comprova desempenho nativo. Mantém cubos 1.16.0: não usa `poly_mesh`, apontado como obsoleto para conteúdo novo na [documentação Microsoft](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/geometry.v1.26.40?view=minecraft-bedrock-stable).

## Verificação reproduzível

- `npm run check`: tipos, 90 testes e validação de todas as combinações.
- Testes novos verificam normais nos 16 contornos/quatro frentes, lançam raios contra caixas orientadas para conferir os encontros e exigem que cada extremidade lateral pertença a uma face realmente emitida do apoio, incluindo as meias pilastras.
- Captura controlada: mesmos quatro presets, vistas `oblique,capital,base,panel`, perfis `classic,pbr`, SwiftShader e 1600×1000 da 0.10.0, em `out/pilaster-0.10.1`. Usar `$env:ASPERGILLUM_RENDER_BACKEND='software'` nessa execução; a matriz geral pode usar GPU verificada. Os backends são registrados e não são intercambiáveis para uma comparação controlada.
- Matriz `pilaster` em `out/pilaster-matrix-0.10.1`: tamanhos 1×1 a 16×8, dez tecidos, três materiais, quatro frentes, vistas oblíqua/canto/inferior nos dois perfis.
- Antes da publicação, criar ZIP temporário e validar com Creator Tools. Auditoria: `node tools/verify-pilasters.mjs --baseline 0.10.0 --input out/Altare-0.10.1-preflight-v3.mcaddon`.
- Depois de `npm run package`, executar `node tools/verify-pilasters.mjs --baseline 0.10.0` e `node tools/compare-structures.mjs out/pilaster-0.10.0 out/pilaster-0.10.1`.
- Raiz: `npm run check`. Viewer: preparação, build e smokes compilados, sem leitura concorrente durante a reconstrução dos packs.

## Reteste nativo

Arquivo final: `Altare-0.10.1.mcaddon`, 16.540.851 bytes, 3.334 entradas. SHA-256 `e12ebc953a4be1c196fcfd7c41b159fb307e95b9a89f30f5b86667a962ab0c56`. Creator Tools: zero erros, os mesmos 994 avisos de complexidade estritamente conferidos e zero avisos inesperados. Relatórios em `dist/validation/0.10.1/`.

Auditoria final: 397 definições de bloco byte-idênticas à 0.10.0, runtime, 1.108 geometrias de outras famílias e 171 mapas preservados; nenhum arquivo adicional. Pilastras: máximo de 79 registros/242 faces. Payload descomprimido de 243.510.955 bytes, redução de 1.479.510 sobre a versão anterior.

90 testes do Altare, 83 do viewer e 107 do Aspergillum passaram. Build e smokes compilados do estúdio/Workbench passaram, com edição, quatro ambientes, exportação PNG/JSON, cenas antigas e viewport de 390 px. O catálogo local em 4173 serve 0.10.1. As 158 capturas foram confrontadas com os recursos do arquivo final; os 32 pares controlados usam a mesma câmera, enquadramento e backend software da 0.10.0. A matriz geral registra GPU verificada. Isso não substitui o reteste abaixo.

1. Importar somente Altare-0.10.1.mcaddon, BP/RP `[0,10,1]`, numa cópia do mundo. Conferir um Pilastras existente antes de reaplicar, sem pack/cache concorrente.
2. Examinar 7×2×1 sem toalha nos três materiais: biséis e quatro cantos de cada moldura, perfis inferiores/superiores, retorno das quinas, emendas das pilastras e chanfros em movimento. Não deve haver frestas, cintilação ou faces desaparecendo.
3. Repetir com renda, bordado e linho longo; testar relevos em 7×2 e 8×2 nas quatro frentes. Campo, molde e aplique devem permanecer separados e os objetos sobre o tampo, no mesmo lugar.
4. Conferir 1×1, 1×8 e 16×8; quebrar/repor um módulo, reaplicar, cancelar/restaurar, editar com dois clientes e salvar/reabrir. Content Log sem erros novos do Altare ou rollback.
5. Comparar gráficos clássicos/PBR e medir carga, memória e FPS com 1/16/64 altares, conforme o gate anterior.
