"""Import data only. Never imports or evaluates executable archive members."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import re
import stat
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets-src/lectionary'
PREFIX = 'sources/liturgia_diaria/cnbb/'
sha = lambda b: hashlib.sha256(b).hexdigest()

def json_assignment(raw, name):
    text = raw.decode('utf-8')
    text = re.sub(r'^/\*.*?\*/\s*', '', text, count=1, flags=re.S)
    match = re.fullmatch(r'\s*globalThis\.' + re.escape(name) + r'\s*=\s*(.*?)\s*;\s*', text, re.S)
    if not match:
        raise ValueError('Expected a single JSON assignment: ' + name)
    return json.loads(match[1])

WEEK = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
SEASONS = {'advento':'Advento','comum':'Tempo Comum','quaresma':'Quaresma','pascal':'Tempo Pascal'}
SPECIAL = {'ascensao':'Ascensão do Senhor','assuncao':'Assunção de Nossa Senhora','batismo':'Batismo do Senhor','cinzas':'Quarta-feira de Cinzas','coracao':'Sagrado Coração de Jesus','corpus':'Santíssimo Corpo e Sangue de Cristo','familia':'Sagrada Família','imaculado':'Imaculado Coração de Maria','mae':'Maria, Mãe da Igreja','misericordia':'2º Domingo da Páscoa','paixao':'Paixão do Senhor','pascoa':'Domingo da Páscoa','pedro':'São Pedro e São Paulo','pentecostes':'Pentecostes','ramos':'Domingo de Ramos','rei':'Cristo Rei','todos':'Todos os Santos','trindade':'Santíssima Trindade','vigilia':'Vigília Pascal'}

def label(key, saints):
    parts = key.split('/'); head = parts[0]
    cycle = next((v for v in reversed(parts) if v in ('A','B','C','I','II','AB','BC')), '')
    if head in SEASONS:
        week, day = int(parts[1]), int(parts[2])
        season = ('da ' if head=='quaresma' else 'do ') + SEASONS[head]
        title = f'{week}º Domingo {season}' if day == 0 else f'{WEEK[day]} da {week}ª semana {season}'
        group = SEASONS[head]
    elif head == 'proprio':
        title = saints.get(parts[1], {}).get('nome', parts[1]); group = 'Próprio dos Santos'
        if 'domingo' in parts: title += ' · Domingo'
        if 'semana' in parts: title += ' · Dia de semana'
    elif head in ('jan','dez'):
        title = f'{int(parts[1])} de ' + ('janeiro' if head=='jan' else 'dezembro'); group = 'Natal' if head=='jan' else 'Advento'
    elif head == 'epifania':
        title = 'Epifania do Senhor' if len(parts)==1 else WEEK[int(parts[-1])] + ' depois da Epifania'; group='Natal'
    elif head in ('oitava-natal','oitava-pascoa'):
        title = (f'{int(parts[1])} de dezembro · Oitava do Natal' if head=='oitava-natal' else WEEK[int(parts[1])] + ' da Oitava da Páscoa'); group='Natal' if head=='oitava-natal' else 'Tempo Pascal'
    elif head=='santa':
        title=WEEK[int(parts[1])]+' da Semana Santa'; group='Semana Santa'
    else:
        title=SPECIAL.get(head,head); group='Solenidades e festas do Senhor'
        if head=='cinzas' and len(parts)>1: title=WEEK[int(parts[1])]+' depois das Cinzas';group='Quaresma'
        if head in ('ramos','paixao','vigilia'):group='Semana Santa'
    if cycle: title += ' · ' + ('Anos ' + ' e '.join(cycle) if cycle in ('AB','BC','ABC') else 'Ano ' + cycle)
    if 'vespera' in parts: title += ' · 24 de dezembro'
    if 'apos-multiplicacao' in parts:title += ' · Após a multiplicação dos pães'
    if 'habitual' in parts:title += ' · Leituras habituais'
    return title,group,cycle

def blocks(sections):
    result=[]
    for section in sections:
        if section.get('titulo'):result.append({'kind':'heading','text':section['titulo']})
        if section.get('texto'):result.append({'kind':'text','text':section['texto']})
    return result

def run():
    archive=DEST/'source.zip'
    with zipfile.ZipFile(archive) as z:
        names=z.namelist()
        if len(set(names))!=len(names):raise ValueError('Duplicate ZIP names')
        for member in z.infolist():
            if member.filename.startswith('/') or '..' in Path(member.filename).parts or stat.S_ISLNK(member.external_attr>>16):raise ValueError('Unsafe member')
        if sum(m.file_size for m in z.infolist())>20_000_000:raise ValueError('Archive too large')
        data=json.loads(gzip.decompress(z.read(PREFIX+'motor/biblioteca.json.gz')))
        catalog=json_assignment(z.read(PREFIX+'leitor/catalogo-motor.js'),'CATALOGO_MOTOR')
        saints=json_assignment(z.read(PREFIX+'leitor/santoral.js'),'SANTORAL_BR')
        assert data['schema']=='liturgia-biblioteca/v1' and catalog['edicao']==data['edicao']
        for name,digest in data['regras_sha256'].items():assert sha(z.read(PREFIX+'leitor/'+name))==digest
        for fid,sections in data['formularios'].items():assert sha(json.dumps(sections,ensure_ascii=False,separators=(',',':')).encode())==fid
        inventory=[{'path':m.filename,'bytes':m.file_size,'sha256':sha(z.read(m))} for m in z.infolist()]
    output={'book':{'title':'Lecionário','sections':[]},'gospel':{'title':'Evangeliário','sections':[]},'days':{}}
    provenance={'edition':data['edicao'],'archiveSha256':sha(archive.read_bytes()),'inventory':inventory,'calendar':'No computed date mapping. Liturgical keys are navigable independently.','entries':{}}
    for key,entry in catalog['chaves'].items():
        sections=copy.deepcopy(data['formularios'][entry['formulario']]);warnings=[]
        if entry.get('complemento_de'):
            extra=data['complementos'][entry['complemento_de']]
            sections+=copy.deepcopy(extra['secoes'])
            warnings.append('Este formulário inclui complemento editorial; confira a celebração e as leituras antes do uso litúrgico.')
        if entry.get('missas_noturnas'):
            night=data['formularios'][entry['missas_noturnas']['formulario']]
            start=next(i for i,s in enumerate(night) if s['tipo']=='formulario' and s['titulo']=='Missa da Vigília')
            sections=[{'tipo':'formulario','titulo':'Missa da manhã','texto':''}]+sections+copy.deepcopy(night[start:])
        title,group,cycle=label(key,saints)
        sid='lc-'+sha(key.encode())[:24]
        common={'id':sid,'title':title,'group':group,'groups':[group]+([group+' · Ano '+cycle] if cycle else [])}
        if warnings:common['warnings']=warnings
        output['book']['sections'].append(dict(common,blocks=blocks(sections)))
        gospel=[]
        for s in sections:
            if s['tipo']=='evangelho' or (s['tipo']=='alternativa' and s.get('relativa_a')=='evangelho'):
                if s.get('formulario'):gospel.append({'tipo':'formulario','titulo':s['formulario'],'texto':''})
                gospel.append(s)
        refs=list(dict.fromkeys(s.get('referencia_busca','') for s in gospel if s.get('referencia_busca')))
        assert gospel and blocks(gospel), key
        output['gospel']['sections'].append(dict(common,reference=' | '.join(refs),blocks=blocks(gospel)))
        provenance['entries'][sid]={'key':key,'catalog':entry,'sections':sections,'complement':data['complementos'].get(entry.get('complemento_de'))}
    (DEST/'catalog.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
    (DEST/'provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps({'keys':len(catalog['chaves']),'forms':len(data['formularios']),'complements':len(data['complementos']),'bookSections':len(output['book']['sections']),'gospelSections':len(output['gospel']['sections'])}))

if __name__=='__main__':run()
