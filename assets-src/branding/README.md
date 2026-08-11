# Identidade visual oficial

Esta pasta contém as fontes de produção da identidade promovida na versão 1.2.1:

- `aspergillum-cover-2048.png`: capa oficial em alta resolução;
- `aspergillum-cover-256.png`: composição renderizada diretamente no tamanho nativo do `pack_icon`;
- `cover-manifest.json`: configuração, câmera, geometrias resolvidas, fonte, licença, bytes e SHA-256 da renderização aprovada.
- `pack-identity.json`: contrato estruturado dos nomes, descrições, locales e chaves canônicas dos dois packs.

Os PNGs foram produzidos pelo Cover Renderer a partir do assunto real `docked`, com acabamento clássico, material PBR e água cheia. Não foram pintados ou retocados manualmente após a captura. A tipografia Bowlby One SC e a licença SIL Open Font License 1.1 ficam versionadas em `viewer-3d/public/fonts/bowlby-one-sc/`.

O bloco `pack` do manifest registra a release 1.2.1 contra a qual a imagem foi realmente renderizada. O bloco `publication` registra separadamente a release corrente que reutiliza os mesmos bytes aprovados; assim, uma promoção posterior não falsifica a proveniência da captura.

Para gerar uma nova candidata:

```powershell
npm run render:cover -- --size 2048 --output out/cover-renders/<candidata>
```

Nunca copie uma candidata diretamente para `packs/`. Após aprovação humana, substitua os três arquivos de produção desta pasta, atualize a versão distribuível e execute `npm run check` e `npm run package`. O gerador copia o PNG de 256 px sem recompressão para os Behavior e Resource Packs; o validador exige que ambos permaneçam byte-idênticos à fonte.

Textos públicos não pertencem ao manifest da imagem. Altere-os somente em conjunto com [`docs/PACK_IDENTITY.md`](../../docs/PACK_IDENTITY.md), os manifests, os quatro arquivos `.lang` e seus gates automatizados.
