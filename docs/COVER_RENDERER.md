# Renderizador de capa

## Finalidade

O **Aspergillum Cover Renderer** produz uma composição quadrada de identidade visual a partir dos modelos, texturas e acabamentos atuais do Resource Pack. A composição aprovada foi promovida na 1.2.1; novas saídas continuam sendo candidatas e nunca substituem automaticamente o `pack_icon.png`.

A cena oficial inicial usa:

- a composição real `docked`, com o aspersório acomodado na caldeirinha;
- acabamento `classic`, material PBR e água cheia;
- câmera oblíqua elevada, luz principal quente, preenchimento frio e recorte de metal;
- fundo sóbrio inspirado em pedra e madeira de sacristia, sem iconografia genérica de magia;
- título `ASPERGILLUM` em Bowlby One SC, com face mineral clara e profundidade escura;
- moldura discreta de latão e contraste validado também no tamanho nativo de `256 × 256`.

## Arquitetura

O pipeline reutiliza o Bedrock Fidelity Renderer em vez de redesenhar o objeto:

```text
packs/resource
    ↓ sync-assets
catálogo temporário do viewer
    ↓ Bedrock Fidelity Renderer
PNG transparente do modelo real
    ↓ compositor HTML/CSS
capa 2048 × 2048 + prova nativa 256 × 256 + manifest
```

O compositor roda em Chromium headless por Playwright. A API de captura aquece a cena antes da leitura do canvas e rejeita uma imagem cuja cobertura alfa do modelo seja inferior a 4%, evitando promover silenciosamente uma captura vazia. O `cover-manifest.json` registra versão do pack, configuração, câmera, geometrias resolvidas, material, acabamento, água, fonte, licença, bytes e SHA-256 de cada PNG.

## Comando canônico

Na raiz do projeto:

```powershell
npm run render:cover -- --output out/cover-renders/candidate-01
```

O tamanho principal padrão é `2048 × 2048`. Independentemente desse valor, o comando também renderiza a composição diretamente em `256 × 256`; ela não é um simples redimensionamento posterior e serve como gate de legibilidade do ícone.

Para todas as opções:

```powershell
npm run render:cover -- --help
```

| Opção | Valores | Padrão |
| --- | --- | --- |
| `--output` | pasta dentro ou fora de `out/` | `out/cover-renders/<timestamp>` |
| `--size` | inteiro `512..4096` | `2048` |
| `--title` | 1 a 24 letras, números, espaços e pontuação segura | `ASPERGILLUM` |
| `--cosmetic` | ID publicado de acabamento | `classic` |
| `--material` | `pbr` ou `classic` | `pbr` |
| `--water` | `low`, `mid`, `high` ou `full` | `full` |
| `--view` | uma vista do contrato de captura | `front-right` |

O Chromium gerenciado pelo Playwright deve estar instalado. Se necessário:

```powershell
cd viewer-3d
npx playwright install chromium
cd ..
```

## Saída

```text
out/cover-renders/<candidata>/
├── aspergillum-cover-2048.png
├── aspergillum-cover-256.png
└── cover-manifest.json
```

`out/cover-renders/` é evidência descartável e ignorada pelo Git. O layout autoral vive em `viewer-3d/cover-renderer.html` e `viewer-3d/src/cover-renderer/`; a câmera e os defaults públicos vivem em `viewer-3d/src/shared/cover-contract.js`. A fonte de produção aprovada vive em `assets-src/branding/`, separada dessas execuções temporárias.

## Tipografia e licença

A fonte local é **Bowlby One SC**, distribuída sob a SIL Open Font License 1.1. O binário e uma cópia integral da licença ficam em `viewer-3d/public/fonts/bowlby-one-sc/`, para que o render não dependa de rede nem de uma fonte instalada no sistema.

A escolha busca peso, leitura em caixa alta e construção utilitária compatível com um produto em blocos. Ela não é a fonte oficial do logotipo Minecraft e o lockup não tenta reproduzir a marca da Mojang.

## Aprovação e promoção

1. Renderize uma candidata com um nome explícito em `out/cover-renders/`.
2. Inspecione a imagem principal e a prova nativa de 256 px.
3. Confira no manifest que o assunto é `docked`, a geometria vem do pack esperado e a cobertura alfa não caiu abaixo do gate.
4. Compare título, silhueta, água, materiais, contraste e margens de segurança.
5. Somente após aprovação humana, integre a composição à fonte autoritativa do `pack_icon` e atualize geração, testes, documentação e versão distribuível no mesmo commit.

Na 1.2.1, o quinto passo foi concluído: `tools/generate-assets.mjs` publica `assets-src/branding/aspergillum-cover-256.png` sem recompressão nos dois packs, e `tools/validate.mjs` exige igualdade byte a byte. A capa 2048 px e o manifest da renderização permanecem juntos da fonte para auditoria e futuras revisões.

O render Three.js/HTML prova a composição autoral e a origem dos assets, mas não reproduz o shader proprietário, o mipmapping, o cache ou a tela real do Minecraft Bedrock. A promoção do ícone ainda exige gerar o `.mcaddon`, importá-lo sem packs concorrentes e executar os gates de `docs/TESTING.md`.
