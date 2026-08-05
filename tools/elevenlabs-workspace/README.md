# ElevenLabs workspace

Workspace isolado para prototipar efeitos sonoros do Aspergillum com a API da ElevenLabs.

## Configuracao local

A chave de trabalho esta salva localmente em `.env`. Esse arquivo e ignorado pelo Git e nao deve ser versionado.

Os arquivos gerados ficam em `outputs/` e nao sao versionados por padrao.

```powershell
.\check-account.ps1
.\generate-sfx.ps1 -Prompt 'Small holy-water splash on stone' -DurationSeconds 1.5 -OutputName 'holy-water-splash.mp3'
```

O gerador usa `eleven_text_to_sound_v2` e MP3 44.1 kHz/128 kbps por padrao.

