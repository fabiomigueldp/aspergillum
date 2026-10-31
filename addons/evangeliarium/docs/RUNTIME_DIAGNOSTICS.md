# Inspeção reproduzível no Minecraft

As capturas Three.js verificam a construção e o cálculo da pose. A aceitação de braços, binding, câmera e transições exige o cliente Bedrock. O teste de 24/10/2026 usa o Minecraft Windows **26.52**, o mundo **devtest** e a skin clássica que já estava selecionada.

## Ferramentas

Para verificar a apresentação de formulários alheios ao leitor, use `/scriptevent evangeliarium:inspect ui-native`. A primeira opção abre um campo nativo. Esses dois formulários não recebem os marcadores do Evangeliário e devem conservar a moldura padrão. O comando não modifica o mundo. A composição da UI e o roteiro visual estão em [UI_LAYOUT.md](UI_LAYOUT.md).

`node tools/runtime-audit.mjs` lê o Content Log mais recente, registra um intervalo limitado a 8 MiB, compara versões e SHA-256 de arquivos instalados no mundo com o build, verifica uma única referência de cada UUID na pilha e grava `out/runtime/<versão>-<data>/report.json`. Um log sem a mensagem de inicialização da versão corrente é **não verificado**, mesmo que esteja vazio. `--log <arquivo>` e `--from-byte <offset>` permitem repetir o recorte. `--archive` só promove um resultado correspondente e sem erros para `dist/validation/<versão>/`. O cliente pode reter o log em memória: salvar e sair/fechar antes da coleta. Não altera o mundo.

Com comandos habilitados, segurando o livro:

```mcfunction
/scriptevent evangeliarium:inspect status
/scriptevent evangeliarium:inspect front
/scriptevent evangeliarium:inspect side
/scriptevent evangeliarium:inspect quarter
/scriptevent evangeliarium:inspect left
/scriptevent evangeliarium:inspect back
/scriptevent evangeliarium:inspect replay
/scriptevent evangeliarium:inspect reset
```

`status` registra item, mão secundária, impedimentos, posição, rotação, dimensão, tick, último envio, observadores e falha da API. Isso prova elegibilidade e despacho, **não a execução visual**. `replay` força novo despacho para investigar um pacote perdido durante carregamento. As vistas fixam uma câmera a 2,7 blocos e nivelam temporariamente o olhar; `reset` devolve a câmera e rotação. Há restauração automática após 60 segundos. `quarter` e `left` ficam a +40° e −40° do olhar: o tronco vanilla pode estar girado em relação à cabeça, portanto compare os dois lados antes de concluir que o livro está deslocado. Use uma área livre: a câmera não atravessa obstáculos para encontrar um enquadramento adequado. Esses comandos não alteram inventário, blocos ou propriedades persistentes.

`node tools/calibrate-pose.mjs` reproduz a inversão de rotação do braço, a posição do apoio e as transformações de apresentação a partir de `assets-src/pose.mjs`. Só imprime valores, sem editar assets. `npm run capture:pose` gera seis vistas externas wide/slim. Ambos são diagnósticos matemáticos, sem equivalência garantida com o motor.

Capturas reais feitas pelo Computer Use ficam em `out/runtime/screenshots/`, acompanhadas da hora e identificação da janela. Devem ser relacionadas à versão comprovada pelo Content Log e pelo instalador. Nenhuma captura de preview deve receber o rótulo de screenshot do Minecraft.

## Falhas reproduzidas e regressões

| Evidência | Diagnóstico | Proteção |
| --- | --- | --- |
| Log 0.1.0 fornecido pelo usuário | `ambient_occlusion` booleano recusado no formato atual | Validador exige número |
| Log 0.1.0 | Componente de entidade `minecraft:pushable` retirado do schema atual | Entidade visual sem esse componente |
| Log 0.1.0 | Receita sem `unlock`; keyframes `.18` e `.42` inválidos | Validação de desbloqueio e tempos com zero inicial |
| Cliente 0.1.1 | Geometria sem cubos produz bounds inválidos e erros de transformação | Cubo limitado, oculto por `bone_visibility` |
| Logs 0.1.2/0.1.3 gravados ao sair | `bone_visibility.root: false` recusado pelo schema, embora listado na documentação | Expressão Molang `"0.0"` e regressão estrutural |
| Cliente 0.1.2 | Despacho inicial aceito pelo servidor antes de o cliente estar pronto; `inspect replay` restaura a pose | Renovação do mesmo controller a cada 60 ticks |
| Barra de itens 0.1.0–0.1.2 | Captura headless praticamente transparente | Renderização SwiftShader e cobertura alfa mínima do ícone |

O `dispensable` da mitra pertencia ao Aurifrita. A correção distribuída separadamente em **Aurifrita 0.1.2** remove somente esse campo; sua arte conserva a procedência da versão em que foi gerada.

## Comparação e fechamento

Para cada revisão: salvar e sair; fechar o cliente; gerar pacote com número novo; instalar pelo gerenciador; abrir novamente. Confirmar a versão no log, a ausência de duplicatas de UUID na pilha e os hashes instalados. Depois registrar frente, lado, primeira pessoa, troca de slot, leitura, colocação aberta e retirada. O resultado final e as limitações ficam em `VERIFICATION.md`.

Referências: [material instances](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_material_instances?view=minecraft-bedrock-stable), [mudança de pushable](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_pushable?view=minecraft-bedrock-stable), [amostras da Mojang](https://github.com/Mojang/bedrock-samples).
