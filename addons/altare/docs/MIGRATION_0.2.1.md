# Compatibilidade 0.1.3 → 0.2.1

Plano explícito para o diagnóstico do frontal de Guadalupe. A largura de referência é sete blocos e a altura permanece um bloco, conforme confirmação do usuário.

IDs, UUIDs, bloco `altare:mensa`, colisão e todos os estados existentes são preservados. Os valores de `altare:frontal` 0–5 mantêm seus papéis: nenhum, fundo, centro inteiro, primeira metade, segunda metade e roseta legada. Os materiais de fundo/centro recebem a nova arte; o papel 5 permanece disponível para conjuntos antigos.

Acrescentam-se somente valores 6–11: lua, sol, figuras da esquerda, figuras da direita, composição compacta esquerda e composição compacta direita. O conjunto de valores passa de seis para doze, dentro do limite de dezesseis; o produto total sobe de 5.760 para 11.520. O custo é fixo por catálogo e não cresce com o número de altares.

Ao abrir um mundo atualizado, não há varredura, troca de blocos ou migração silenciosa. Reaplicar **Acabamento do altar** com o frontal ativado recompõe somente os estados cosméticos das células selecionadas, sob os locks, preflight e rollback existentes. Um altar 7×2 passa a mostrar lua, arabescos, par esquerdo de figuras, centro, par direito, arabescos e sol, vistos da frente. Os objetos acima permanecem fora da operação.

Downgrade: a 0.1.3 não conhece valores 6–11. Antes de voltar a ela, na 0.2.1 aplicar **sem frontal** aos conjuntos atualizados e manter cópia do mundo. Não declarar downgrade transparente de novos estados. A entrega é um diagnóstico separado e não instala packs ou altera mundos automaticamente.

Geometria: mantém y máximo 16 e o contorno externo abaixo de 8,5 unidades nos eixos horizontais. O orçamento passa de 47 para 48 cubos por variante, incluindo molduras horizontais e fechamentos externos. O build gera oito variantes (duas quedas × quatro frentes), cada uma com somente o frontal que pode aparecer. Os identificadores geométricos anteriores continuam válidos para a direção norte; as novas variantes são selecionadas pelo estado existente `altare:facing`. Não há simulação ou entidades.

Texturas do programa iconográfico usam 256×256; mapas menores continuam nos materiais de repetição. O compilador mantém proporções físicas usando domínio 128×84 e ocupa a imagem inteira. O teto de mapas decodificados é 12 MiB antes de mipmaps/ícones, e cada camada respeita 256 KiB. A candidata interna 0.2.0 foi rejeitada por avisos de custo; seu arquivo é preservado como evidência, e a versão de teste é 0.2.1. Custos e validação final ficam no relatório da versão.
