# Verificação — Evangeliarium 0.5.1

Data: 05/11/2026. Base de desenvolvimento: `fbc6bd6`.

## Resultado automatizado

- Check agregado da raiz (`npm run check`): passou. TypeScript, 123 testes em 26 arquivos, 101 testes do viewer, documentação, build e validadores de assets, animação, VFX, áudio, ícones e release. A regeneração de áudio da raiz produziu diferenças locais de toolchain; esses outputs foram descartados e os arquivos originais foram preservados, sem integrar mudanças em outro add-on.
- `npm --prefix addons/evangeliarium run check`: passou. Build, TypeScript, 223 testes (222 passaram, 1 skip deliberado do sweep integral 1583–9999) e validação estrutural.
- Regressões cobrem retorno à data digitada, cancelamento, rascunho descartado ao fechar, callback tardio, consulta dos 23 formulários como membro nas quatro páginas, retorno à mesma lista e ausência de gravação global na consulta.
- Arte: nove sólidos, 54 faces, folha/miolo, encaixe de grampos/marcador, limites de seleção, UVs, padding opaco, contraste da grade e direção das camadas de papel testados. Hashes das 13 capturas, da geometria/atlas e do ícone distribuído conferidos. Vistas oblíqua, lateral e de menor tamanho de tela inspecionadas; são diagnósticos Blender, não prova de paridade Bedrock.
- `git diff --check` e sintaxe do gerador de arte/script Blender: passaram.
- Versão central, lockfile, runtime gerado, manifests BP/RP, módulos e dependência BP→RP coerentes em 0.5.1. UUIDs e dependências estáveis preservados.
- Creator Tools 0.17.7: zero erros, 19 avisos conhecidos de referências vanilla offline e nenhum aviso inesperado. Mesmas regras completas da 0.5.0, sem exclusão de verificações.

## Pacote

- `dist/releases/Evangeliarium-0.5.1.mcaddon`: 2.062.332 bytes, 99 arquivos.
- SHA-256: `1da52264dfc2aae2b4fbb6ddb59a2c99927b48e512bf69e846fcd6b6d87e92a9`.
- O pacote 0.5.0 permanece intacto, com SHA-256 `a3d0fd416e4593962cdfd3ad879dc46d7af0c0d3c80327864480a19a5b125cfe`.
- Comparação dos arquivos internos: nenhum caminho adicionado/removido. Apenas sete arquivos mudam: os dois manifests, script, geometria do Ordo, color/MER do Ordo e seu ícone. No MER, somente os novos tiles das camadas de papel e seu padding diferem. Livros, textos, receitas e demais recursos são byte-idênticos à 0.5.0.

## Reprodução

A partir da raiz do repositório:

```sh
npm run check
npm --prefix addons/evangeliarium run check
mkdir -p addons/evangeliarium/out/creator-home/.mctools
HOME="$PWD/addons/evangeliarium/out/creator-home" MCT_TEST_PINNED_MC_VERSION=1.26.60.5 node addons/evangeliarium/tools/package.mjs
```

O pacote usa HOME isolado e a versão de dados 1.26.60.5 já utilizada na verificação 0.5.0. O registry remoto dos módulos retornou HTTP 502; a validação completa offline e os tipos estáveis instalados foram usados. Não há alegação de verificação online das versões mais recentes. Relatórios oficiais ficam em `dist/validation/0.5.1/`; logs desta integração e a comparação dos pacotes ficam em `out/ordo-integration/`.

## Gates ainda abertos

- Importação, renderização, interação real, controle/toque e Content Log no Minecraft Bedrock 26.52 não executados. Usar os passos de [Ordo](ORDO_0.5.0.md), com o pacote 0.5.1 e sem pack antigo/cache concorrente.
- Votivas continuam somente para consulta: não há vínculos brasileiros verificados para aplicar leituras e Evangelhos globalmente. [Auditoria editorial](ordo-editorial/README.md).
- Nenhum push ao GitHub, deploy, atualização de servidor ou instalação em mundo foi realizado nesta revisão.
