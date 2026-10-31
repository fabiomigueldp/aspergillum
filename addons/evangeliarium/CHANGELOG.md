# Changelog

## 0.2.5 — 25/10/2026 — página e navegação

- Substitui o leitor estreito por uma página em JSON UI com texto nativo, papel marfim, filete e moldura vinho. Margens, entrelinha e altura útil maiores; rolagem contida e navegação fixa.
- Separa Leituras, Passagem e Livro; preserva a página ao voltar, o rascunho após erro e a revalidação do exemplar em cada resposta assíncrona.
- Compacta formulários, mantém títulos longos completos na legenda e une somente a continuação minúscula entre versículos contíguos, sem reescrever palavras.
- Corrige a sobreposição vanilla observada na 0.2.0, o rodapé fora da moldura e as camadas de texto de botões identificadas na 0.2.1. Revisões anteriores preservadas como diagnósticos.
- Ajusta a altura do seletor de capítulo após o teste 0.2.2 e remove o espaço de descrições vazias nos menus.
- Simplifica os símbolos dos créditos após a fonte substituta observada na 0.2.3, preservando autores, ano, licença e fontes.
- Revalida a entidade visual antes de ler propriedades, após aviso de referência expirada no carregamento da 0.2.3. Teste reproduz a falha e verifica recuperação sem alterar identidade ou gerar outro item.
- Acrescenta diagnóstico de formulários sem marcador. Mantém a apresentação nativa desses formulários; a disputa com RPs que alterem `server_form` continua sendo um limite de compatibilidade.
- Tipos, 42 testes e validação estrutural. Modelos, poses, calendário, corpus e identidades persistentes permanecem os mesmos da 0.1.5.
- Confirmada no cliente 26.52 em janela pequena e maximizada, instalada no devtest; Content Log final sem erros ou avisos e hashes instalados correspondentes ao pacote. Evidências e limites em `docs/VERIFICATION.md`.

## 0.1.5 — 24/10/2026 — interface final

- Remove o fechamento duplicado do rodapé. A janela nativa conserva X, Escape e a ação voltar da plataforma.
- Conserva o modelo e a calibração da 0.1.4, que passou pela inspeção física e pelo Content Log sem erros ou avisos. Os mesmos UUIDs permitem retomar os livros colocados e suas marcas.
- Confirma no cliente 26.52 a persistência de Jo 3,16 entre sessões, a retirada com marca preservada, o retorno a Hoje e as poses. Content Log final sem erros ou avisos; arquivos instalados e referências do mundo conferidos.

## 0.1.4 — 24/10/2026 — correção após inspeção no cliente

- Corrige os schemas de material, entidade e receita, os tempos de keyframe e a geometria invisível do bloco. `bone_visibility` usa Molang `0.0`, pois o booleano foi recusado pelo cliente 26.52.
- Recupera a pose após carregamento e mudança de câmera, renovando um controller próprio a cada 60 ticks. Guarda erros de despacho; a telemetria distingue elegibilidade de comprovação visual.
- Eleva o livro verticalmente com apoio bimanual; calibração de primeira pessoa independente. O binding neutro, identidades e estados públicos permanecem iguais.
- Reproduz os ícones com SwiftShader e recusa capturas quase transparentes. Páginas de até 600 caracteres e fechamento em português.
- Acrescenta câmeras temporárias no jogo, relatório de log e hashes instalados, verificação da pilha de packs e cálculo reproduzível de encaixe. Evidências e limites: `docs/VERIFICATION.md`.

### Revisões diagnósticas 0.1.1–0.1.3

Pacotes numerados e preservados para rastrear os testes. A 0.1.1 isolou bounds inválidos da geometria vazia; 0.1.2/0.1.3 revelaram o booleano de visibilidade recusado. A 0.1.3 confirmou recuperação automática da pose, leitura e porte elevado no cliente, mas ainda não passou na aceitação do bloco. Esses pacotes não são a entrega final.

## 0.1.0 — 24/10/2026 — candidato de teste

- Modelo autoral de 31 cuboides, capas articuladas, lombada, miolo, fitas e iconografia dos quatro Evangelistas. Atlas color/normal/MER de 256 px; ícones derivados da malha distribuída.
- Porte com os dois braços, animações próprias de transporte e colocação, apresentação independente em primeira/terceira pessoa e suspensão durante movimentos incompatíveis.
- Colocação aberta ou fechada, leitura, fechamento físico, retirada com metadata preservada, locks, revalidação, compensação e recuperação de transferências interrompidas.
- Leitor nativo com paginação, seleção por referência/capítulo/data, consulta privada, marca persistente e retomada de Hoje.
- Quatro Evangelhos completos da Bíblia Livre: 89 capítulos e 3.779 versículos. Calendário brasileiro offline de 2026–2027 com data de Brasília e opções para celebrações com leituras distintas.
- Tipos estáveis, 31 testes automatizados, validação estrutural e empacotamento com Microsoft Creator Tools. Testes de input, braços, renderização e Content Log dentro do Minecraft permanecem pendentes.

### Decisões e limites desta versão

- A primeira pessoa requer uma extensão condicional de `controller.render.player.first_person`. Packs que substituam o mesmo controller precisam de teste conjunto; nenhum `player.entity.json` é distribuído.
- Trinta referências do calendário contêm recortes a/b/c. Como a edição livre não fornece esse mapa, o leitor mostra os versículos completos, identificados explicitamente. A consulta manual não aceita sufixos sem mapa.
- A tradução é Bíblia Livre CC BY 4.0, não o texto litúrgico CNBB. O calendário usa uma fonte comunitária e correções identificadas, sem homologação nem próprios locais.
- A cobertura diária termina em 31/12/2027. O leitor integral permanece disponível fora desse período.
