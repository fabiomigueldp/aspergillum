# Fontes textuais — 04/11/2026

`catalog.json` é o snapshot base de produção offline. Preserva fontes, referências, títulos, grupos, texto e runs de formatação das páginas da comunidade. Não é gerado durante o build comum: uma atualização editorial deve produzir outro snapshot revisado.

- `extraction-report.md`: cobertura, contagens e divergências da fonte.
- `manifest.json` e `audit-results.json`: evidência de coleta e integridade.
- `../../tools/liturgy-source/`: coletor, exportador e testes usados na extração, com dependências fixadas.

O repositório mantém uma única representação completa dos textos: `catalog.json`, incluindo navegação, rubricas, URLs e hashes por seção. Caches HTML, cópias em texto simples, JSONs intermediários e ZIPs de auditoria não são fontes de produção e não ficam no Git. Os relatórios registram a auditoria executada na coleta original; seus hashes identificam as respostas coletadas, mas não permitem reconstruir o HTML histórico se os sites mudarem.

Para uma nova coleta editorial, siga o [procedimento do coletor](../../tools/liturgy-source/README.md). Trabalhe em um diretório descartável sob `out/`, revise as diferenças e só então atualize este snapshot. O build e a leitura no jogo continuam inteiramente offline, sem depender dos sites ou de um arquivo ZIP.

O runtime é uma projeção menor gerada por `tools/liturgy.mjs`; nunca altere `src/generated/liturgy.ts` manualmente. O build verifica fontes, IDs, texto dos runs e integridade de toda a paginação.

A autorização de utilização no addon da comunidade foi informada pelo solicitante. Não foi atribuída licença aberta nem homologação institucional inexistente. Os avisos originais e as limitações estão no relatório de extração e nos créditos de cada livro.

## Complemento de Santa Teresa do Menino Jesus

`supplements/santa-teresinha.json` acrescenta somente o formulário da memória como complemento explícito do compilador. Catálogo histórico, manifesto e auditoria acima permanecem inalterados. O manifesto gerado registra separadamente o hash do complemento. A transcrição visual e a emenda corroborada em fontes paroquiais brasileiras não equivalem a autenticação editorial da CNBB. Consulte [escopo, fontes e limites](../../docs/SANTA_TERESA_FORMULARY.md).
