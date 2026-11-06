#!/usr/bin/env python3
import hashlib,json,re
from collections import defaultdict,Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parent
m=json.loads((ROOT/'manifest.json').read_text());c=json.loads((ROOT/'corpus.json').read_text());cat=json.loads((ROOT/'catalog.json').read_text())
assert not m['errors'] and not m['unresolvedInternalLinks'] and not m['textRetentionFailures']
docs={d['id']:d for d in c['documents']}
checksums=0;duplicates=defaultdict(list)
for d in docs.values():
    book,slug=d['id'].split(':',1);raw=ROOT/'raw'/book/(slug+'.html')
    assert hashlib.sha256(raw.read_bytes()).hexdigest()==d['source']['sha256'],d['id']
    checksums+=1;duplicates[d['textSha256']].append(d['id'])
    assert all(b['text']==''.join(r['text'] for r in b['runs']) for b in d['blocks']),d['id']
sections=[s for b in cat['books'].values() for s in b['sections']]
assert len(sections)==len({s['id'] for s in sections})
for s in sections:
    assert re.fullmatch(r'[-a-z0-9_]{1,160}',s['id'])
    d=docs[s['sourceDocumentId']]
    assert [b['text'] for b in s['blocks']]==[b['text'] for b in d['blocks']]
    for b in s['blocks']:
        assert b['text']==''.join(r['text'] for r in b['runs'])
        if b['kind']=='rubric':assert all(r.get('rubric') for r in b['runs'])
result={'status':'passed','sourcePages':len(docs),'runtimeSections':len(sections),'sourceChecksumsVerified':checksums,'allSourceWordsRetained':all(d['textRetentionVerified'] for d in m['documents']),'allRuntimeTextMatchesCorpus':True,'allRunsMatchBlockText':True,'noMixedParagraphForcedToRubric':True,'exactDuplicateTexts':[x for x in duplicates.values() if len(x)>1],'maximumTitleCharacters':max(len(s['title']) for s in sections),'maximumGroupCharacters':max(len(s['group']) for s in sections),'maximumBlockCharacters':max(len(b['text']) for s in sections for b in s['blocks']),'catalogSha256':hashlib.sha256((ROOT/'catalog.json').read_bytes()).hexdigest(),'catalogBytes':(ROOT/'catalog.json').stat().st_size,'excludedNonTextDocuments':cat['coverage']['excludedNonTextDocuments']}
(ROOT/'audit-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
