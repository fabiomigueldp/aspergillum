# Ícones de inventário do aspersório

Esta pasta arquiva as fontes `32 × 32` usadas na release 1.2.2. Cada PNG foi derivado da geometria, dos color maps e dos mapas PBR reais pelo **Aspergillum Inventory Icon Renderer**; desde a 1.2.4 esses arquivos não são publicados nem registrados no atlas do Resource Pack.

O enquadramento usa uma vista oblíqua fixa, rotação de apresentação em 2D e contorno mínimo para preservar a leitura na escala nativa. Isso não altera geometria, pose, binding nem apresentação em primeira ou terceira pessoa.

Para produzir uma candidata sem tocar nas fontes ou no pack:

```powershell
npm run render:inventory-icons -- --output out/inventory-icon-renders/<candidata>
```

Revise `inventory-icon-contact-sheet.png` e os PNGs individuais em tamanho nativo. Com promoção explicitamente autorizada, execute:

```powershell
npm run render:inventory-icons -- --output out/inventory-icon-renders/<candidata-aprovada> --apply
```

`--apply` permanece disponível apenas para reproduzir ou revisar o arquivo histórico. A produção 1.2.4 ignora qualquer cópia em `packs/resource/textures/items/` e o gerador remove esses PNGs. `inventory-icon-manifest.json` conserva câmera, geometria, acabamento, processamento, bytes e SHA-256 da evidência 1.2.2.

A validação externa comprova proveniência, integridade, margens, cobertura e separação cromática. A aparência final no inventário continua exigindo o teste do pacote importado no Minecraft Bedrock.
