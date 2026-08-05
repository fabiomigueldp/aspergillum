# Contrato de áudio

## Baseline 1.0.19

A 1.0.19 substitui o áudio provisório por um sistema semântico, transacional e espacial. O gameplay autoriza o evento; o áudio apenas o apresenta. Falha sonora nunca altera carga, água, cooldown, item, bloco ou sessão.

A auditoria forense que fundamentou a migração está em [AUDIO_SFX_TECHNICAL_REPORT.md](AUDIO_SFX_TECHNICAL_REPORT.md).

## Autoridade e roteamento

| Classe | Cues | Rota |
| --- | --- | --- |
| Privado do ator | `dry`, `load.prepare`, `sprinkle.prepare` | `Player.playSound`; somente o jogador executor |
| Espacial do mundo | `aspersorium.fill`, `load.commit.1..4`, `dock.mechanical`, `dock.water.1..4`, `undock`, `sprinkle.release` | `Dimension.playSound` no centro acústico do vaso ou no frame físico do release |

Regras obrigatórias:

- preparação pode ocorrer somente depois de sessão/lease/cooldown válidos;
- release sonoro ocorre somente depois do commit da carga no tick 5;
- fill/load/dock/undock soam somente após sua escrita transacional válida;
- tentativa cancelada antes do release produz zero release;
- timeline do attachable não contém `sound_effects` nem `particle_effects` transacionais;
- o release compartilha uma única origem/direção com bridge e primeiro pulso;
- toda chamada é fail-soft, com warning estruturado e sem rollback do gameplay já confirmado.

## Catálogo e variação

O catálogo em `assets-src/audio/audio-catalog.json` declara 15 famílias e 48 variantes. O runtime toca eventos explícitos `.vNN`; uma shuffle bag por jogador e família consome todas as variantes antes de repetir e impede repetição imediata na fronteira entre ciclos.

Os aliases canônicos também permanecem em `sound_definitions.json` para inspeção e ferramentas, mas o adaptador usa os eventos explícitos para garantir o contrato de não repetição.

## Mídia e mix

- formato final: OGG Vorbis;
- mono, 48 kHz, não-streaming;
- clips curtos, com fade de entrada/saída e limiter defensivo;
- eventos de preparação são íntimos e baixos;
- commits crescem semanticamente de 1 a 4 unidades;
- release é direcional e legível, sem soar como balde, oceano ou magia;
- alcances máximos e volumes ficam no catálogo, não espalhados pela application layer.

## Pipeline reprodutível

1. `generation-manifest.json` registra modelo, prompts, parâmetros e candidatos escolhidos.
2. `raw/elevenlabs/2026-08-05/` contém as 48 fontes escolhidas sem edição.
3. `audio-recipes.json` registra trim, duração, ganho e fades por arquivo.
4. `npm run build:audio` gera masters WAV e os OGGs distribuídos.
5. `npm run generate:assets` gera `sound_definitions.json` a partir do catálogo.
6. `npm run validate:audio` rejeita mídia ausente, órfã, estéreo, fora de 48 kHz, codec incorreto ou caminho vanilla.
7. `reports/audio/audio-inventory.json` registra hashes das fontes e dos OGGs.

## Proveniência e licença

Os arquivos da RC 1.0.19 foram gerados com `eleven_text_to_sound_v2` em uma conta ElevenLabs **free** em 2026-08-05. Isso implica:

- uso desta mídia apenas em validação não comercial;
- atribuição obrigatória: **Generated with ElevenLabs**;
- nenhuma afirmação de licença comercial para os 48 arquivos atuais;
- antes de uma distribuição comercial, regenerar/substituir as fontes durante uma assinatura paga, registrar a nova licença e refazer hashes, masters, OGGs e QA auditivo.

A chave de API e o workspace operacional local nunca entram no Git nem no `.mcaddon`.

## Gates manuais no Minecraft

- 200 aspersões válidas: exatamente 200 releases e nenhuma duplicação;
- 100 cancelamentos antes do tick 5: zero releases;
- 100 tentativas vazias: clique seco privado, nenhuma água e nenhum release;
- fill, load 1–4, dock 0–4 e undock audíveis na posição do vaso para outro jogador;
- preparação privada inaudível para observador remoto;
- sem repetição imediata enquanto a família possui mais de uma variante;
- sem clipping, distorção, caudas cortadas ou desequilíbrio severo entre FP/TP;
- Content Log sem erro ou warning atribuível a arquivo/evento de áudio.

O aceite auditivo exige escuta no jogo. Métricas e prompts reduzem risco, mas não substituem direção sonora humana.
