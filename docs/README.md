# Documentação do Aspergillum

Este diretório é a fonte canônica de conhecimento técnico do projeto. Os documentos distinguem deliberadamente fatos atuais, contratos protegidos e propostas futuras.

## Ordem de leitura

| Documento | Finalidade |
| --- | --- |
| [Estado do projeto](PROJECT_STATUS.md) | O que existe hoje, o que está aprovado e o que ainda falta |
| [Contrato visual](VISUAL_CONTRACT.md) | Valores comprovados e invariantes do attachable, pose e spray |
| [Contrato de VFX](VFX_DESIGN_CONTRACT.md) | Locator, bridge, gotas, impacto, áudio e divisão híbrida de responsabilidades |
| [Mesa do Sacristão](SACRISTAN_TABLE_DESIGN_CONTRACT.md) | Linguagem visual, catálogo, UI, custo zero, persistência e gates da v1.1.7 |
| [Arquitetura](ARCHITECTURE.md) | Arquitetura atual, arquitetura-alvo e limites entre camadas |
| [Estado e concorrência](STATE_AND_CONCURRENCY.md) | Cargas, modos de jogo, identidade, sessões, docking e migração |
| [Roadmap](ROADMAP.md) | Sequência de versões, riscos, gates e Definition of Done |
| [Plano de testes](TESTING.md) | Automação, QA manual, multiplayer e relatório de evidência |
| [Identidade pública dos packs](PACK_IDENTITY.md) | Marca, nomes, descrições, locales, ícone e gate real no seletor de packs |
| [Renderizador de capa](COVER_RENDERER.md) | Composição autoral reproduzível, tipografia, CLI e fluxo de aprovação do ícone |
| [Release](RELEASE.md) | Build, empacotamento, validação, instalação limpa e publicação |
| [Release 1.2.5](releases/1.2.5.md) | Correção runtime da ponte 3D, proxies string-addressed e diagnóstico da 1.2.4 |
| [Release 1.2.4](releases/1.2.4.md) | Tentativa stateful rejeitada pelo runtime, preservada como diagnóstico histórico |
| [Release 1.2.3](releases/1.2.3.md) | Identidade localizada, proveniência sonora autocontida, tooling de release e evidências oficiais |
| [Release Candidate](RELEASE_CANDIDATE.md) | Runbook de go/no-go, evidência mínima e promoção da V1 |
| [Mapa da instalação local](LOCAL_INSTALLATION_MAP.md) | Caminhos reais do Bedrock, packs instalados e auditoria do mundo `devtest` |
| [Lições aprendidas](LESSONS_LEARNED.md) | Conhecimento acumulado para evitar a repetição de falhas |
| [Pesquisa do attachable](ATTACHABLE_RESEARCH.md) | Histórico experimental detalhado das versões anteriores |
| [Referências](REFERENCES.md) | Documentação primária e política de pesquisa local |

## Hierarquia de autoridade

Em caso de divergência:

1. código, packs empacotados e testes descrevem o comportamento executável;
2. `PROJECT_STATUS.md` descreve a versão de referência;
3. `VISUAL_CONTRACT.md` protege invariantes já comprovados;
4. `ROADMAP.md` descreve intenção futura, não funcionalidade presente;
5. relatórios externos e notas históricas são evidência, não especificação automática.

Toda mudança distribuível deve atualizar os documentos afetados no mesmo commit. Propostas não implementadas devem usar explicitamente os rótulos **alvo**, **planejado** ou **experimental**.
