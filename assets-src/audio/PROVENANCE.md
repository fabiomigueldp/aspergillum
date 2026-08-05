# Audio provenance

- Provider: ElevenLabs Sound Effects API
- Model: `eleven_text_to_sound_v2`
- Generation date: 2026-08-05
- Source delivery: MP3 44.1 kHz / 128 kbps
- Selected sources: 48
- Generated candidates reviewed for this pass: 80
- Final delivery: OGG Vorbis mono / 48 kHz
- Account tier at generation: free
- Commercial use of current media: not authorized
- Required attribution: **Generated with ElevenLabs**

Exact prompts and selected candidate IDs live in `generation-manifest.json`. Processing instructions live in `audio-recipes.json`; hashes and probe results live in `reports/audio/audio-inventory.json` after `npm run build:audio`.

The API credential and the local ElevenLabs workspace are excluded from version control and from packaged add-ons.
