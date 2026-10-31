# Changelog

## 0.1.2 — 2026-10-24

- Remove `minecraft:wearable.dispensable`, recusado pelo cliente Bedrock 26.52, preservando UUIDs, slot de cabeça e todos os assets da 0.1.1.
- Acrescenta validação contra a regressão. Build e Creator Tools aprovados; instalada em Shared e devtest. O erro de parsing da mitra não reapareceu no log do cliente.

## 0.1.1 — 2026-10-19

- Primeira entrega testável da Mitra Aurifrita: modelo autoral com dois painéis dourados, arcos frontais em relevo, 19 batatas e ínfulas bordadas com franjas.
- Reutilização de ilhas de bordado reduz os mapas de 512 para 256 px sem diminuir a densidade do painel principal; os três mapas usam 768 KiB antes de mipmaps.
- Item de cabeça estável, attachables de jogador/armadura, textos pt_BR/en_US, ícones derivados da malha e registro local no Workbench.
- Validação estrutural e Creator Tools sem erros nem avisos; aceitação no Minecraft e Content Log pendentes do usuário.

## 0.1.0 — candidata interna, não entregue

- Primeira construção e capturas de geometria/encaixe. A inspeção oficial detectou três avisos de orçamento de textura e um aviso no descritor do atlas de itens, resolvidos na 0.1.1.
