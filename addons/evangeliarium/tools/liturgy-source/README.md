# Atualização editorial do catálogo

Estas são as ferramentas usadas para extrair os dois sites públicos indicados pelo solicitante. O build comum usa apenas `assets-src/liturgy/catalog.json` e não executa o coletor.

Os scripts leem e escrevem ao lado de suas próprias cópias. Execute-os em um diretório descartável, nunca diretamente nesta pasta. A partir da raiz do add-on:

```sh
mkdir -p out/liturgy-source
cp tools/liturgy-source/*.py tools/liturgy-source/requirements.txt out/liturgy-source/
cd out/liturgy-source
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python extract_liturgy.py
.venv/bin/python build_catalog.py
.venv/bin/python -m unittest -v test_extraction.py
.venv/bin/python audit_content.py
```

O coletor limita-se aos dois hosts de origem, não executa JavaScript e não altera os sites. Respostas já coletadas são reutilizadas; `extract_liturgy.py --offline` reprocessa esse cache. Para atualizar as páginas, use outro diretório descartável vazio. Uma coleta nova pode divergir da fotografia de 04/11/2026 porque os sites são editáveis.

Compare o novo catálogo com o publicado, revise cobertura, palavras, rubricas, fontes e avisos. Só depois substitua `catalog.json`, `manifest.json` e `audit-results.json` em `assets-src/liturgy/`, atualize o relatório de extração e execute `npm run check`. Não copie caches, HTML, textos intermediários ou ZIPs para o Git. Os `.blend` são fontes autorais dos modelos e continuam versionados separadamente.

O catálogo retém URLs, hashes, navegação e os textos completos; os relatórios documentam a auditoria original. Sem o cache histórico externo, estes scripts não reconstituem respostas antigas que tenham mudado na origem.
