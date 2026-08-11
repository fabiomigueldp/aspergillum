# Ícones de inventário do aspersório

Esta pasta contém as fontes autoritativas `32 × 32` dos dezesseis acabamentos do item. Cada PNG é derivado da geometria, dos color maps e dos mapas PBR reais do Resource Pack pelo **Aspergillum Inventory Icon Renderer**; não há uma segunda ilustração manual da forma do aspersório.

O enquadramento usa uma vista oblíqua fixa, rotação de apresentação em 2D e contorno mínimo para preservar a leitura na escala nativa. Isso não altera geometria, pose, binding nem apresentação em primeira ou terceira pessoa.

Para produzir uma candidata sem tocar nas fontes ou no pack:

```powershell
npm run render:inventory-icons -- --output out/inventory-icon-renders/<candidata>
```

Revise `inventory-icon-contact-sheet.png` e os PNGs individuais em tamanho nativo. Com promoção explicitamente autorizada, execute:

```powershell
npm run render:inventory-icons -- --output out/inventory-icon-renders/<candidata-aprovada> --apply
```

`--apply` grava os PNGs desta pasta e cópias byte-idênticas em `packs/resource/textures/items/`. O gerador normal apenas republica essas fontes; ele não redesenha os ícones. `inventory-icon-manifest.json` registra câmera, geometria, acabamento, processamento, bytes e SHA-256.

A validação externa comprova proveniência, integridade, margens, cobertura e separação cromática. A aparência final no inventário continua exigindo o teste do pacote importado no Minecraft Bedrock.
