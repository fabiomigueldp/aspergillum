# Documentação do Aspergillum

Este diretório é a fonte canônica de conhecimento técnico do projeto. Os documentos distinguem deliberadamente fatos atuais, contratos protegidos e propostas futuras.

## Ordem de leitura

| Documento | Finalidade |
| --- | --- |
| [Estado do projeto](PROJECT_STATUS.md) | O que existe hoje, o que está aprovado e o que ainda falta |
| [Contrato visual](VISUAL_CONTRACT.md) | Valores comprovados e invariantes do attachable, pose e spray |
| [Arquitetura](ARCHITECTURE.md) | Arquitetura atual, arquitetura-alvo e limites entre camadas |
| [Estado e concorrência](STATE_AND_CONCURRENCY.md) | Cargas, modos de jogo, identidade, sessões, docking e migração |
| [Roadmap](ROADMAP.md) | Sequência de versões, riscos, gates e Definition of Done |
| [Plano de testes](TESTING.md) | Automação, QA manual, multiplayer e relatório de evidência |
| [Release](RELEASE.md) | Build, empacotamento, validação, instalação limpa e publicação |
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
