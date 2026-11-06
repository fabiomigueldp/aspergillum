#!/usr/bin/env python3
"""Build the Bedrock-friendly catalog from the verified source corpus.

No network requests and no rewriting of liturgical wording. Inline source formatting
is represented as runs; the exact concatenated text is verified before export.
"""
import json
from collections import defaultdict, deque
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def build(corpus):
    docs={d['id']:d for d in corpus['documents'] if d['blocks']}
    excluded=[{'id':d['id'],'url':d['source']['url'],'reason':'Sem texto no corpo HTML; contém apenas imagem.','imageCount':len(d['images'])} for d in corpus['documents'] if not d['blocks']]
    nav=corpus['navigation']
    membership=defaultdict(list)
    roots={e['targetId'] for n in nav for g in n['sections'] for e in g['entries']}
    order=[]
    def visit(key,group,trail,seen):
        if key not in docs or key in seen:return
        seen.add(key)
        if group not in membership[key]:membership[key].append(group)
        if key not in order:order.append(key)
        for link in docs[key]['links']:
            target=link.get('targetId')
            # Preserve per-book hierarchy without dragging another top-level chapter into it.
            if target and target.startswith(key.split(':')[0]+':') and target not in roots:
                visit(target,group,trail+[key],seen)
    for book in nav:
        for group in book['sections']:
            for ent in group['entries']:
                label=ent['label'] if book['id']=='missal' else group['title']
                visit(ent['targetId'],label,[],set())
    # The source home page has a verified mislink: the Acólitos label points to
    # Leitores. Keep sourceNavigation untouched, while organizing the actual page
    # recovered from the same host's published sitemap under the correct group.
    recovered_acolytes='pontifical:instituicao-de-varios-acolitos'
    editorial_groups=set()
    if recovered_acolytes in docs and not membership[recovered_acolytes]:
        membership[recovered_acolytes]=['Instituições de Ordens Menores']
        editorial_groups.add(recovered_acolytes)
    order += [d['id'] for d in corpus['documents'] if d['id'] in docs and d['id'] not in order]
    books={n['id']:{'title':n['title'].split(' | ')[0],'sections':[]} for n in nav}
    for key in order:
        d=docs[key];book=d['book'];blocks=[]
        for b in d['blocks']:
            runs=[]
            for r in b['runs']:
                rr={'text':r['text']}
                for k in ('rubric','bold','italic','underline','href'):
                    if r.get(k):rr[k]=r[k]
                runs.append(rr)
            if ''.join(r['text'] for r in runs)!=b['text']:raise AssertionError(f'Run text mismatch: {key}/{b["id"]}')
            item={'kind':'heading' if b['kind']=='heading' else 'rubric' if all(r.get('rubric') for r in runs) else 'text','text':b['text'],'runs':runs,'id':b['id']}
            if b.get('level'):item['level']=b['level']
            blocks.append(item)
        group=membership[key] or ['Outros textos da fonte']
        sec={'id':key.replace(':','--',1),'sourceDocumentId':key,'title':d['title'],'sourceId':book,'sourceUrl':d['source']['url'],'group':group[0],'groups':group,'blocks':blocks,'links':[{**link,'targetId':link['targetId'].replace(':','--',1) if link.get('targetId') else None} for link in d['links']],'sourceSha256':d['source']['sha256']}
        if key in editorial_groups:sec['groupEditorialNote']='Página publicada recuperada do sitemap; o índice de origem aponta este rótulo para Leitores.'
        books[book]['sections'].append(sec)
    catalog={'schemaVersion':1,'snapshotAt':corpus['retrievedAt'],'books':books,'sources':[{'id':n['id'],'title':n['title'],'url':n['sourceUrl'],'license':'Autorização declarada pelo solicitante; licença pública não verificada.','note':'Conteúdo extraído das páginas públicas indicadas para este addon da comunidade. Texto, grafia e rubricas preservados; apenas espaços HTML normalizados. Consulte sourceUrl em cada seção para a página original.'} for n in nav],'sourceNavigation':nav,'warnings':corpus['warnings'],'coverage':{'scope':'Páginas públicas dos sitemaps e links internos encontrados nos dois sites, na data da coleta. Não é uma edição litúrgica oficial nem uma declaração de integralidade fora desse recorte.','errors':corpus['errors'],'excludedNonTextDocuments':excluded}}
    ids=[s['id'] for b in books.values() for s in b['sections']]
    assert len(ids)==len(set(ids))==len(docs)
    assert all(s['blocks'] for b in books.values() for s in b['sections'])
    return catalog

if __name__=='__main__':
    corpus=json.loads((ROOT/'corpus.json').read_text())
    catalog=build(corpus)
    path=ROOT/'catalog.json'
    path.write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    summary={'books':{key:len(book['sections']) for key,book in catalog['books'].items()},'bytes':path.stat().st_size,'sectionsWithMixedRubrics':sum(any(any(r.get('rubric') for r in b['runs']) and any(not r.get('rubric') for r in b['runs']) for b in s['blocks']) for bk in catalog['books'].values() for s in bk['sections'])}
    print(json.dumps(summary,ensure_ascii=False,indent=2))
