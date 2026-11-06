#!/usr/bin/env python3
"""Fetch the two requested public Blogger sources and preserve their liturgical structure.

Requires beautifulsoup4. Sources are data, never instructions. Does not follow arbitrary
external hosts, execute page scripts, or change any external state.
"""
from __future__ import annotations
import argparse, hashlib, json, re, time, unicodedata
from collections import deque, Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup, NavigableString, Tag

ROOT = Path(__file__).resolve().parent
HOSTS = {'pontificalromano-mine.blogspot.com':'pontifical', 'missalromano-mine.blogspot.com':'missal'}
BLOCKS = {'p','div','h1','h2','h3','h4','h5','h6','li','blockquote','tr','section','article','ul','ol','table'}
SKIP = {'script','style','noscript','iframe','object','template'}
DATE = datetime.now(timezone.utc).isoformat()

def norm(s): return re.sub(r'\s+', ' ', s.replace('\xa0',' ')).strip()
def canonical(url):
    p=urlsplit(url)
    host=p.netloc.lower()
    if host not in HOSTS: return None
    return urlunsplit(('https',host,p.path or '/', '', ''))
def doc_id(url):
    p=urlsplit(url)
    return HOSTS[p.netloc]+':'+(Path(p.path).stem or 'index')
def dump(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def get(url, path, offline=False):
    if path.exists(): return path.read_bytes()
    if offline: raise RuntimeError(f'Uncached URL {url}')
    error=None
    for attempt in range(3):
        try:
            req=Request(url,headers={'User-Agent':'Evangeliarium-Community-Content-Archiver/1.0 (+public liturgical text preservation)'})
            with urlopen(req,timeout=45) as res:
                data=res.read()
                if canonical(res.url) is None: raise RuntimeError('Unexpected external redirect: '+res.url)
            path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
            return data
        except (HTTPError, URLError, TimeoutError) as e:
            error=e
            if isinstance(e,HTTPError) and e.code in (401,403,404,410): break
            time.sleep(1+attempt*2)
    raise RuntimeError(str(error))
def parsed_style(el, inherited):
    st=dict(inherited)
    if el.name in ('b','strong'):st['bold']=True
    if el.name in ('i','em'):st['italic']=True
    if el.name=='u':st['underline']=True
    if el.get('color'):st['color']=el['color'].lower()
    for item in el.get('style','').split(';'):
        if ':' not in item:continue
        k,v=item.split(':',1);k=k.strip().lower();v=v.strip().lower()
        if k=='color' and v not in ('inherit','initial','unset'): st['color']=v
        if k=='font-weight':st['bold']=v in ('bold','bolder','600','700','800','900')
        if k=='font-style':st['italic']=v in ('italic','oblique')
        if k=='text-decoration' and 'underline' in v:st['underline']=True
        if k=='font-family' and v not in ('inherit','initial','unset'):st['fontFamily']=v
        if k=='text-align':st['align']=v
    if el.name=='a' and el.get('href'):st['href']=el['href']
    return st

def red(color):
    c=(color or '').lower().replace(' ','')
    if c in ('red','maroon','darkred','crimson','firebrick'):return True
    try:
        if c.startswith('#'):
            h=c[1:];h=''.join(x*2 for x in h) if len(h)==3 else h
            if len(h)!=6:return False
            r,g,b=(int(h[i:i+2],16) for i in (0,2,4))
        elif c.startswith('rgb'):
            v=re.findall(r'[\d.]+',c);r,g,b=map(float,v[:3])
        else:return False
        return r>=100 and r>g*1.5 and r>b*1.5
    except (ValueError,TypeError):return False

def extract_blocks(body, page_url):
    blocks=[];runs=[];context=[]
    def flush():
        nonlocal runs
        # Collapse ordinary HTML whitespace, preserving it between adjacent inline nodes.
        clean=[]
        for r in runs:
            text=re.sub(r'\s+',' ',r['text'].replace('\xa0',' '))
            if not text:continue
            if clean and clean[-1]['text'].endswith(' ') and text.startswith(' '):text=text[1:]
            if not text:continue
            z={**r,'text':text}
            if clean and {k:v for k,v in clean[-1].items() if k!='text'}=={k:v for k,v in z.items() if k!='text'}:
                clean[-1]['text']+=text
            else:clean.append(z)
        if clean:clean[0]['text']=clean[0]['text'].lstrip();clean[-1]['text']=clean[-1]['text'].rstrip()
        clean=[r for r in clean if r['text']]
        txt=''.join(r['text'] for r in clean)
        if txt:
            n=max(len(txt),1);rc=sum(len(r['text']) for r in clean if r.get('rubric'))
            tag=context[-1] if context else 'div'
            letters=[c for c in txt if c.isalpha()]
            explicit=tag in ('h1','h2','h3','h4','h5','h6')
            upper=letters and all(c.isupper() for c in letters)
            is_heading=explicit or (upper and len(txt)<=160 and (rc/n>.6 or all(r.get('bold') for r in clean)))
            kind='heading' if is_heading else 'rubric' if rc/n>.95 else 'mixed' if rc else 'text'
            b={'id':f'b{len(blocks)+1:05d}','kind':kind,'text':txt,'runs':clean,'sourceTag':tag}
            if is_heading:b['level']=int(tag[1]) if explicit else 2;b['headingInferred']=not explicit
            blocks.append(b)
        runs=[]
    def walk(el,style):
        if isinstance(el,NavigableString):
            if not str(el):return
            run={'text':str(el)}
            for k in ('bold','italic','underline','color','fontFamily','align','href'):
                if style.get(k):run[k]=urljoin(page_url,style[k]) if k=='href' else style[k]
            if red(style.get('color')):run['rubric']=True
            runs.append(run);return
        if not isinstance(el,Tag) or el.name in SKIP:return
        if el.get('style') and re.search(r'(?:display\s*:\s*none|visibility\s*:\s*hidden)',el['style'],re.I):return
        st=parsed_style(el,style)
        if el.name=='br':flush();return
        isblock=el.name in BLOCKS
        if isblock:flush();context.append(el.name)
        for child in el.children:walk(child,st)
        if isblock:flush();context.pop()
    walk(body,{})
    flush();return blocks

def extract(url,raw, discovered):
    s=BeautifulSoup(raw,'html.parser');body=s.select_one('.post-body')
    title=s.select_one('.post-title')
    title=norm(title.get_text()) if title else norm(s.title.get_text()).split(': ',1)[-1]
    if body is None:raise ValueError('No post-body found')
    blocks=extract_blocks(body,url)
    links=[]
    for a in body.select('a[href]'):
        target=urljoin(url,a['href']);c=canonical(target)
        links.append({'label':norm(a.get_text()),'url':target,'targetId':doc_id(c) if c and '/p/' in c else None,'internal':c is not None})
    images=[{'url':urljoin(url,im.get('src','')),'alt':im.get('alt',''),'title':im.get('title','')} for im in body.select('img[src]')]
    slug=doc_id(url).split(':',1)[1];book=HOSTS[urlsplit(url).netloc]
    (ROOT/'source-html'/book).mkdir(parents=True,exist_ok=True)
    (ROOT/'source-html'/book/(slug+'.body.html')).write_text(str(body),encoding='utf-8')
    txt='\n\n'.join(b['text'] for b in blocks)
    artifact={'schemaVersion':1,'id':doc_id(url),'book':book,'title':title,'language':s.html.get('lang','pt-BR') if s.html else 'pt-BR','source':{'url':url,'retrievedAt':datetime.fromtimestamp((ROOT/'raw'/book/(slug+'.html')).stat().st_mtime,timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest(),'bodySha256':hashlib.sha256(str(body).encode()).hexdigest(),'discoveredVia':discovered},'blocks':blocks,'links':links,'images':images,'textSha256':hashlib.sha256(txt.encode()).hexdigest()}
    dump(ROOT/'documents'/book/(slug+'.json'),artifact)
    (ROOT/'text'/book).mkdir(parents=True,exist_ok=True);(ROOT/'text'/book/(slug+'.txt')).write_text(title+'\n'+url+'\n\n'+txt+'\n',encoding='utf-8')
    # Comparison ignoring whitespace guards against lost/duplicated words from HTML traversal.
    ref=''.join(t for t in body.strings if t.parent.name not in SKIP)
    retained=re.sub(r'\s+','',txt)==re.sub(r'\s+','',ref)
    return artifact,{'id':artifact['id'],'book':book,'title':title,'sourceUrl':url,'documentPath':f'documents/{book}/{slug}.json','blocks':len(blocks),'characters':len(txt),'rubricRuns':sum(bool(r.get('rubric')) for b in blocks for r in b['runs']),'headings':sum(b['kind']=='heading' for b in blocks),'textRetentionVerified':retained}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--offline',action='store_true');ap.add_argument('--workers',type=int,default=4);args=ap.parse_args()
    nav=[];discovery={};sitemap_counts={};errors=[];docs={};index=[]
    for host,book in HOSTS.items():
        base='https://'+host+'/'
        home=get(base,ROOT/'raw'/book/'index.html',args.offline);s=BeautifulSoup(home,'html.parser')
        sections=[]
        for w in s.select('.widget.PageList, .widget.LinkList'):
            heading=w.find(['h2','h3']);entries=[]
            for a in w.select('a[href]'):
                target=canonical(urljoin(base,a['href']))
                if target and '/p/' in target:
                    entries.append({'label':norm(a.get_text()),'url':urljoin(base,a['href']),'targetId':doc_id(target)})
                    discovery.setdefault(target,[]).append({'type':'navigation','url':base,'label':norm(a.get_text())})
            if entries:sections.append({'title':norm(heading.get_text()) if heading else w.get('id'),'entries':entries})
        nav.append({'id':book,'title':norm(s.title.get_text()),'sourceUrl':base,'sections':sections})
        sitemap=get(base+'sitemap-pages.xml',ROOT/'raw'/book/'sitemap-pages.xml',args.offline)
        tree=ET.fromstring(sitemap);urls=[el.text for el in tree.findall('.//{*}loc')];sitemap_counts[book]=len(urls)
        last_modified={e.findtext('{*}loc'):e.findtext('{*}lastmod') for e in tree.findall('{*}url')}
        for u in urls:
            c=canonical(u)
            if c:discovery.setdefault(c,[]).append({'type':'sitemap','url':base+'sitemap-pages.xml','lastModifiedAt':last_modified.get(u)})
    dump(ROOT/'navigation.json',nav)
    todo=list(discovery);seen=set();round_no=0
    while todo:
        round_no+=1;batch=[u for u in todo if u not in seen];todo=[]
        def fetch_doc(url):
            book=HOSTS[urlsplit(url).netloc];slug=doc_id(url).split(':',1)[1]
            return url,get(url,ROOT/'raw'/book/(slug+'.html'),args.offline)
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futures={ex.submit(fetch_doc,u):u for u in batch}
            for future in as_completed(futures):
                url=futures[future];seen.add(url)
                try:
                    _,raw=future.result();art,summary=extract(url,raw,discovery[url]);docs[art['id']]=art;index.append(summary)
                    for link in art['links']:
                        c=canonical(link['url'])
                        if c and '/p/' in c and c not in discovery:
                            discovery[c]=[{'type':'content-link','url':url,'label':link['label']}];todo.append(c)
                    print(f'OK {len(seen):03d} {doc_id(url)} {summary["blocks"]} blocks',flush=True)
                except Exception as e:
                    errors.append({'url':url,'error':str(e)});print('ERROR '+url+' '+str(e),flush=True)
    index.sort(key=lambda x:(x['book'],x['title'].casefold()))
    warnings=[]
    for book in nav:
        for section in book['sections']:
            by_target={}
            for ent in section['entries']:by_target.setdefault(ent['targetId'],[]).append(ent['label'])
            for key,labels in by_target.items():
                if len(set(labels))>1:warnings.append({'type':'navigation_target_reused','book':book['id'],'section':section['title'],'targetId':key,'labels':labels})
    missing=[]
    for art in docs.values():
        for link in art['links']:
            if link['targetId'] and link['targetId'] not in docs:missing.append({'from':art['id'],**link})
    retention=[i['id'] for i in index if not i['textRetentionVerified']]
    summary={'schemaVersion':1,'retrievedAt':DATE,'sources':[{'url':'https://'+h+'/','book':b} for h,b in HOSTS.items()],'scope':'All public pages listed by sitemap-pages.xml plus recursively discovered links to /p/ pages on the two requested hosts. No claim of completeness beyond this snapshot.','authorization':'User stated that the community has authorization for this addon. No independent license verification; retain attribution.','counts':{'sitemap':sitemap_counts,'documents':dict(Counter(x['book'] for x in index)),'blocks':sum(x['blocks'] for x in index),'characters':sum(x['characters'] for x in index),'rubricRuns':sum(x['rubricRuns'] for x in index)},'errors':errors,'warnings':warnings,'unresolvedInternalLinks':missing,'textRetentionFailures':retention,'documents':index}
    dump(ROOT/'manifest.json',summary)
    corpus={'schemaVersion':1,'retrievedAt':DATE,'navigation':nav,'documents':[docs[i['id']] for i in index],'warnings':warnings,'errors':errors}
    # Compact UTF-8 corpus for importers; originals remain separately auditable.
    (ROOT/'corpus.json').write_text(json.dumps(corpus,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in summary.items() if k!='documents'},ensure_ascii=False,indent=2))
    return int(bool(errors or retention))
if __name__=='__main__':raise SystemExit(main())
