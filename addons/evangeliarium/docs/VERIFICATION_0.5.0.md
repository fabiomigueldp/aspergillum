# Verificação — Evangeliarium 0.5.0

Data: 05/11/2026. Base de desenvolvimento: `e30d39b`.

## Resultado automatizado

- `npm run check`: passou. Build, TypeScript, 214 testes (213 passaram, 1 skip deliberado do sweep integral 1583–9999), validação estrutural.
- `git diff --check`: passou.
- Arte Ordo: oito sólidos, limites de seleção e UVs testados; oito vistas Blender e ícone derivado da malha inspecionados. Não é prova de paridade Bedrock.
- Creator Tools 0.17.7: zero erros e 19 avisos conhecidos de referências vanilla offline. A receita do Ordo acrescenta papel e graveto à lista explícita; não há supressão genérica.
- `Evangeliarium-0.5.0.mcaddon`: SHA-256 `a3d0fd416e4593962cdfd3ad879dc46d7af0c0d3c80327864480a19a5b125cfe`.

## Ambiente de validação

O primeiro empacotamento encontrou o HOME do executor sem `.mctools`; a execução foi repetida com HOME de teste no workspace. A descoberta online de versão Mojang retornou 502 e o fallback 1.26.0 rejeitou os formatos 1.26.50 de todos os livros preexistentes. Seguiu-se o contrato já usado na 0.4.1: `MCT_TEST_PINNED_MC_VERSION=1.26.60.5`, HOME isolado e mesmas regras completas do Creator Tools, sem baixar o formato dos packs ou excluir verificações.

Comandos de reprodução a partir da raiz do repositório:

```sh
npm --prefix addons/evangeliarium run check
mkdir -p addons/evangeliarium/out/creator-home/.mctools
HOME="$PWD/addons/evangeliarium/out/creator-home" MCT_TEST_PINNED_MC_VERSION=1.26.60.5 node addons/evangeliarium/tools/package.mjs --replace
```

O segundo comando de pacote substitui apenas o artefato local desta mesma versão. Relatórios completos ficam em `dist/validation/0.5.0/` do add-on. O registry remoto dos módulos também retornou 502; tipos estáveis instalados e a validação offline foram utilizados. Não há alegação de verificação online das versões mais recentes.

## Gates ainda abertos

- Importação/renderização/interação e Content Log no Minecraft Bedrock 26.52 não executados neste ambiente. Usar os passos de [Ordo 0.5.0](ORDO_0.5.0.md).
- Sincronização global de votivas não habilitada. O catálogo oferece consulta do formulário do Missal; faltam vínculos brasileiros verificados para as leituras e Evangelhos. [Auditoria editorial](ordo-editorial/README.md).
- Nenhuma publicação, atualização de servidor ou push ao GitHub nesta implementação.
