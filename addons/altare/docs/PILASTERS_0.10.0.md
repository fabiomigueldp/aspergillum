# Pilastras — Altare 0.10.0 / Estúdio 2.1.0

## Resultado e aceitação

Reconstrução do modelo Pilastras: painéis recuados por módulo, pilastras intermediárias, apoios únicos de quina, fustes chanfrados, bases e capitéis escalonados, friso, cornija e borda de tampo. As dez escolhas de toalha e os três materiais continuam disponíveis. A altura permanece um bloco, com plano de apoio em 16 e células superiores livres.

A revisão é diagnóstica. Imagens externas e validadores conferem recursos distribuídos, encaixes e identidade; não comprovam iluminação, apoio, Content Log ou desempenho no Minecraft. O teste nativo continua pendente.

## Construção

`assets-src/atelier/pilaster-model.mjs` é a fonte estrutural. Coordenadas em unidades de 1/16 de bloco:

| Parte | Intervalo vertical | Construção |
| --- | --- | --- |
| Embasamento | 0–1,65 | Três cursos, ressalto inferior e rebaixo intermediário |
| Base da pilastra | 1,65–2,50 | Plinto e pé, com saliências fechadas |
| Fuste | 2,50–11,80 | Faces exteriores e chanfro diagonal real de 0,35 |
| Capitel | 11,80–13,15 | Colo, equino e ábaco; faces inferiores fechadas |
| Friso e cornija | 13,15–14,20 | Dois cursos contínuos, com retornos de canto |
| Borda da mesa | 14,20–15,50 | Perfil saliente até 8,28 no perímetro exposto |
| Coroamento | 15,50–16 | Pedra/madeira ou suporte até 15,91 e linho até 16 |

O campo recua até 7,05; a moldura fica em 7,50 e o fuste em 8,08. As barras da moldura se encontram por topo, sem faces frontais sobrepostas. O painel útil vai de 3,25 a 11,25. Nos encontros de módulos, meias pilastras se completam; a quina exterior usa um único apoio compartilhado. Nos lados internos, os cursos alcançam ±8 e suas tampas verticais são omitidas. O interior não recebe pilastras nem painéis ocultos.

A geometria é compilada pelos 16 contornos existentes. Nenhum state foi acrescentado. Tecidos sem relevo usam o mesmo contorno nas quatro orientações: os materiais cardinais selecionam a frente bordada. Os identificadores geométricos anteriores continuam presentes como formas isoladas; os blocos usam as variantes de contorno.

Nogueira usa veios verticais nos fustes/campos e horizontais nas travessas, perfis e tampo. Os mapas são os já publicados; não há novas texturas. A escala do desenho dos tecidos, as cores e a renda não mudam nesta revisão.

Relevos ímpares encostam no painel recuado; os pares encostam na pilastra formada pelas duas metades centrais. A traseira entra 0,04 no apoio. Sob toalhas longas, o motivo reduz uniformemente nos dois eixos para caber acima da moldura inferior. A projeção relativa dos braços da cruz permanece, sem faces frontais coincidentes.

## Compatibilidade e custo

Mesmos 397 blocos, UUIDs, identificadores, ordered states/defaults, colisões e runtime. Só a apresentação de Pilastras muda nos altares existentes. Os demais modelos e os 171 PNGs de material são protegidos por comparação byte a byte com 0.9.0. A auditoria também compara componentes de gameplay de todas as definições.

Pilastras: máximo medido de 79 registros de cubo e 290 faces UV; limites diagnósticos 80/300. Um módulo comum de borda usa menos registros que a forma isolada. Colunata conserva seu limite 112/400; as demais famílias continuam limitadas a 50 cubos. Somente avisos GEOMETRY 501 das famílias e caminhos explícitos, com identidade, contagem real e faces dentro do limite, podem entrar na exceção; erros e outros avisos falham.

A recomendação Microsoft de até 50 cubos é excedida nos contornos complexos. A coleção passa de 1.228 para 2.668 arquivos geométricos, sem criar estados ou mapas. O JSON de Pilastras é compacto para conter a expansão; os recursos das demais famílias conservam seus bytes. O catálogo anterior já excede recomendações de payload/estados; esta revisão não o torna aprovado para Marketplace ou para desempenho nativo. [Orientações oficiais de desempenho](https://learn.microsoft.com/en-us/minecraft/creator/documents/practices/improvingperformanceandresourceusage?view=minecraft-bedrock-stable).

Altare continua com 78.432 combinações; com Aspergillum local, 88.176. Mantém-se a exceção diagnóstica 80.000/90.000 da [0.9.0](UNIVERSAL_TEXTILES_0.9.0.md). Mapas: 34.593.792 bytes RGBA, abaixo de 33 MiB, excluindo mipmaps/ícones. Sem novos callbacks, entidades, APIs experimentais ou física contínua.

## Evidência reproduzível

- `npm run check`: tipos, 87 testes e validação estrutural exaustiva.
- `node tools/verify-pilasters.mjs --input out/Altare-0.10.0-preflight.mcaddon`: auditoria antes da publicação imutável; validar esse ZIP com Creator Tools.
- `npm run capture -- --matrix pilaster --presets pilaster-marble-bare-7,pilaster-walnut-bare-5,pilaster-limestone-agnus-8,pilaster-marble-lace-7 --views oblique,capital,base,panel --profiles classic,pbr --output out/pilaster-0.10.0`: 32 vistas; comparar com `out/pilaster-before-0.9.0`, mesmas opções e câmeras.
- `npm run capture -- --matrix pilaster --views oblique,corner,underside --profiles classic,pbr --output out/pilaster-matrix-0.10.0`: 126 vistas; dez tecidos, três materiais, quatro frentes, larguras pares/ímpares, 1×1, 1×8 e 16×8.
- `npm run package`, depois `node tools/verify-pilasters.mjs`: confronta ambos os manifests de captura com o arquivo final.
- `node tools/compare-structures.mjs out/pilaster-before-0.9.0 out/pilaster-0.10.0`: comparação controlada de imagens dos dois arquivos distribuídos.
- Raiz: `npm run check`. Viewer: preparar assets, `npm run build` e smokes compilados do estúdio/Workbench.

## Reteste nativo do pacote exato

Arquivo final: `Altare-0.10.0.mcaddon`, 16.342.366 bytes, 3.334 entradas. SHA-256 `5733baa06bfa5fbfc857ec7570498bb8e2447bd03c84ac00f75779e4e5fb738d`. Creator Tools: zero erros, 994 avisos de complexidade estritamente conferidos, zero avisos inesperados. Relatórios em `dist/validation/0.10.0/`.

Auditoria do arquivo final: 397 contratos de bloco, 111 de Pilastras, runtime, 1.108 geometrias dos demais modelos e 171 mapas preservados. Os 1.440 arquivos adicionais são contornos geométricos de Pilastras. Payload descomprimido de 244.990.465 bytes, acréscimo de 4.761.397 sobre 0.9.0; JSON compacto evita 87.094.713 bytes de espaços/indentação nesta família, sem modificar a precisão dos números.

87 testes do Altare, 76 do viewer e 107 do Aspergillum passaram. Build compilado e smokes do estúdio/Workbench passaram, com quatro ambientes, edição, migração de cenas, exportação PNG/JSON e viewport de 390 px. A auditoria confrontou 158 capturas com os recursos do arquivo final; 32 pares têm câmeras e enquadramento idênticos aos da 0.9.0. O servidor local em 4173 serve o catálogo 0.10.0. Esses resultados são externos ao Minecraft.

1. Importar Altare-0.10.0.mcaddon numa cópia de mundo, só BP/RP `[0,10,0]`, sem outra revisão Altare/cache concorrente. Conferir um altar Pilastras existente antes de reaplicar: conservar material, tecido e objetos.
2. Em 7×2×1, escolher Pilastras sem toalha. Examinar painéis, meias pilastras, chanfros, bases, capitéis e perfis, inclusive por baixo e nas quatro quinas. Alternar mármore, calcário e nogueira.
3. Alternar as dez toalhas, oito cores do Floral e relevos. Conferir ausência de cortes na renda/tecido, distância da pedra, emendas e frente única. Repetir em 8×2 nas quatro orientações, conferindo os relevos divididos.
4. Testar 1×1, 1×8 e 16×8. Quebrar/repor um módulo e reaplicar; não deve haver pilastras internas, pontas ou frestas novas. Colocar blocos/vasos sobre o tampo e trocar acabamentos: objetos permanecem.
5. Editar com dois clientes, cancelar/restaurar, salvar/reabrir. Exportar Content Log: nenhum erro novo do Altare, state inexistente, geometria/material ausente ou rollback. Registrar eventual aviso global de estados.
6. Comparar modo clássico/PBR e medir carga, memória/FPS com 1/16/64 altares visíveis. Os orçamentos externos não substituem esse profiling.
