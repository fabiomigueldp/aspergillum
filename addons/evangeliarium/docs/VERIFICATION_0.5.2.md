# Verificação — Evangeliarium 0.5.2

Data: 05/11/2026. Base de desenvolvimento: `c6ff53a` (0.5.1).

## Escopo revisado

Inclusão de uma seção de Santa Teresa do Menino Jesus no índice do Missal, em Próprio dos Santos, com fonte e revisão próprias. Os cinco textos foram conferidos nas páginas 816–817 da reconstrução digital e corroborados em fontes paroquiais brasileiras. A emenda `O Deus` → `Ó Deus` está explícita; não se declara autenticação editorial da CNBB. [Fontes e limites](SANTA_TERESA_FORMULARY.md).

Nenhuma leitura, Evangelho, seleção diária ou aplicação votiva foi acrescentada. Fontes anteriores, calendário, runtime do Ordo, IDs, armazenamento e todos os outros add-ons permanecem inalterados.

## Verificação automatizada

- O check completo do add-on, já com este conteúdo e antes da elevação exclusiva da versão, passou: build, TypeScript, 227 testes (226 passaram; 1 skip deliberado do sweep integral 1583–9999) e validação estrutural. Log preservado em `out/santa-teresa-integration/addon-check-before-version.log`. Nenhuma alteração funcional posterior; a suíte não foi repetida desnecessariamente.
- Para a versão final 0.5.2 foram executados novamente build e validação estrutural, além de conferir package/lockfile, versão gerada, manifests, módulos e dependência BP→RP.
- Quatro regressões específicas cobrem preservação do snapshot, cinco partes, emenda, referências das antífonas, atribuição, busca, paginação sem perda e ausência de novos vínculos.
- Comparação da saída dos compiladores anterior/atual: as 253 seções anteriores do Missal, as 107 do Pontifical e todas as fontes anteriores permanecem integralmente iguais. O Missal passa de 253 para 254 seções e de 1.069 para 1.071 páginas; o Pontifical mantém 1.051 páginas.
- O catálogo histórico mantém SHA-256 `70537564ae8a772b5945e1cc1344c6bf84735e8f5ea0a2ea7eccfd4c18c32167`; manifesto e auditoria também permanecem byte a byte iguais. O hash do suplemento é registrado separadamente em `out/liturgy-manifest.json`.
- Creator Tools 0.17.7: zero erros, 19 avisos conhecidos de links vanilla offline e nenhum aviso inesperado. Mesmas regras completas da versão anterior, sem exclusão de verificações.

## Pacote e preservação

- `dist/releases/Evangeliarium-0.5.2.mcaddon`: 2.063.276 bytes, 99 arquivos.
- SHA-256: `6c4c3981d7e6c729fdbfc4a3bb48b2c6211abf1e25c7ed3bc9fa1a99daa8cf04`.
- Pacote 0.5.1 intacto: SHA-256 `1da52264dfc2aae2b4fbb6ddb59a2c99927b48e512bf69e846fcd6b6d87e92a9`; seu descritor e arquivo de hash também não foram alterados.
- Comparação dos arquivos internos: nenhum caminho adicionado ou removido. Mudam somente os dois manifests (versão) e `scripts/main.js` (constante da versão e catálogo litúrgico). Os outros 96 arquivos são byte-idênticos. Nenhuma mudança de arte, UI, regras, persistência ou recursos do Ordo.
- Evidências da integração: `out/santa-teresa-integration/`. Relatórios oficiais: `dist/validation/0.5.2/`.

## Reprodução

Na raiz do repositório, `npm --prefix addons/evangeliarium run check` executa o check completo. Para empacotar o conteúdo já verificado sem repetir a suíte:

```sh
npm --prefix addons/evangeliarium run build
node addons/evangeliarium/tools/validate.mjs
mkdir -p addons/evangeliarium/out/creator-home/.mctools
HOME="$PWD/addons/evangeliarium/out/creator-home" MCT_TEST_PINNED_MC_VERSION=1.26.60.5 node addons/evangeliarium/tools/package.mjs
```

O HOME isolado e a versão de dados 1.26.60.5 repetem a verificação 0.5.1. O registry remoto dos módulos retornou HTTP 502; a validação offline e os tipos estáveis instalados foram usados. Não se declara verificação online das versões mais recentes.

## Gates ainda abertos

- Importação, renderização, interação e Content Log no Minecraft Bedrock 26.52 não executados. Importar o pacote exato 0.5.2, sem pack antigo/cache concorrente; seguir [reteste de Santa Teresa](SANTA_TERESA_FORMULARY.md#verificação) e as regressões do [Ordo](ORDO_0.5.0.md).
- A consulta ao formulário não autoriza classificá-lo como votivo nem atribuir-lhe leituras. A verificação contra exemplar editorial identificado permanece pendente.
- Candidato e commit somente locais: nenhum push, deploy, atualização de servidor ou instalação em mundo.
