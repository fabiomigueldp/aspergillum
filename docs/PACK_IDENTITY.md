# Identidade pública dos packs

Este contrato define como o Aspergillum aparece nas interfaces do Minecraft. Ele cobre somente marca, nome, descrição, idiomas e ícone dos packs; não altera UUIDs, namespace, identificadores públicos, gameplay ou compatibilidade de mundo.

## Autoridade

`assets-src/branding/pack-identity.json` é a fonte estruturada dos textos públicos. Os dois manifests e os quatro arquivos `.lang` devem coincidir exatamente com esse contrato.

Cada pack possui seu próprio escopo de localização. Por isso, Behavior Pack e Resource Pack usam as mesmas chaves canônicas no manifest:

```text
name=pack.name
description=pack.description
```

Chaves personalizadas `pack.aspergillum.*` são proibidas para a identidade do pack: o Bedrock 26.42 exibiu esses tokens literalmente no seletor, mesmo com os arquivos `.lang` presentes e instalados.

## Textos aprovados

| Pack | Locale | Nome | Descrição |
| --- | --- | --- | --- |
| Behavior | `pt_BR` | Aspergillum — Comportamento | Aspersório litúrgico funcional, caldeirinha e Mesa do Sacristão configurável. |
| Behavior | `en_US` | Aspergillum — Behavior | Functional liturgical aspergillum, aspersorium, and configurable Sacristan's Worktable. |
| Resource | `pt_BR` | Aspergillum — Recursos | Modelos, animações, sons, efeitos e texturas do Aspergillum. |
| Resource | `en_US` | Aspergillum — Resources | Models, animations, sounds, effects, and textures for Aspergillum. |

Regras editoriais:

- `Aspergillum` é a marca e não é traduzida;
- o sufixo identifica tecnicamente o pack sem repetir “Add-On” ou a versão;
- cada descrição é uma frase factual, curta e sem superlativos;
- o Behavior Pack descreve o conteúdo funcional; o Resource Pack descreve somente apresentação e mídia;
- nomes de itens e blocos continuam localizados separadamente no Resource Pack;
- somente `en_US` e `pt_BR` são declarados enquanto ambos não tiverem catálogo completo e revisado.

## Manifest e compatibilidade

- `format_version: 2`, UUIDs, versões e dependência BP→RP permanecem contratos independentes da tradução.
- A versão não entra no nome público; o vetor do manifest é a autoridade para upgrade.
- `metadata.authors`, `metadata.license` e `metadata.product_type` permanecem informações documentais, não substitutos do nome e da descrição.
- Descrições de módulos são internas e não devem ser usadas como texto de marketing.
- Uma correção distribuível precisa elevar a versão dos dois packs antes do empacotamento; nunca se republica o mesmo UUID com versão igual ou inferior.

## Sistema visual

A capa 2048 px é o key art de divulgação. O `pack_icon.png` é a prova nativa de 256 px exibida em escala reduzida pelo Minecraft. Ambos derivam da mesma composição aprovada, mas têm funções distintas: a capa sustenta a apresentação completa; o ícone deve continuar reconhecível pela silhueta mesmo quando o título não puder ser lido.

Os dois packs usam o mesmo `pack_icon.png` para unidade de marca. A distinção entre eles pertence aos nomes localizados, não a badges improvisados no ícone.

## Gates

Automação deve rejeitar:

- manifest sem `pack.name` e `pack.description`;
- `languages.json` diferente de `en_US` + `pt_BR`;
- texto divergente de `pack-identity.json`, vazio, duplicado ou com espaço periférico;
- retorno de qualquer chave `pack.aspergillum.*`;
- divergência entre os ícones dos packs e a fonte aprovada.

O gate físico da próxima revisão distribuível deve importar somente o novo `.mcaddon`, sem cópia/cache concorrente, e conferir Behavior e Resource Pack em `pt_BR` e `en_US`. Nome e descrição precisam aparecer traduzidos; nenhum token `pack.*` pode ficar visível. O teste registra versão exata, hash, tela, locale e Content Log.

## Referências oficiais

- [Manifest de packs](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest?view=minecraft-bedrock-stable)
- [Conteúdo e diretórios de Add-On packs](https://learn.microsoft.com/en-us/minecraft/creator/documents/comprehensivepackcontents?view=minecraft-bedrock-stable)
- [Diretrizes para Add-Ons cooperativos](https://learn.microsoft.com/en-us/minecraft/creator/documents/practices/guidelinesforbuildingcooperativeaddons?view=minecraft-bedrock-stable)
