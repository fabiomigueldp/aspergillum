"""Importa somente referências e nomes de celebrações. Nenhum texto litúrgico é redistribuído."""
import concurrent.futures, datetime, hashlib, json, pathlib, time, urllib.request, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets-src' / 'calendar'
DEST.mkdir(parents=True, exist_ok=True)
BASE = 'https://liturgia.up.railway.app/v2/'
def fetch(day):
    dest = DEST / f'{day.isoformat()}.json'
    if dest.exists(): return
    url = f'{BASE}?dia={day.day}&mes={day.month}&ano={day.year}'
    for attempt in range(4):
        try:
            raw = urllib.request.urlopen(url, timeout=40).read()
            data = json.loads(raw)
            if data.get('data') != day.strftime('%d/%m/%Y'): raise ValueError('Data divergente')
            refs = [x['referencia'] for x in data['leituras']['evangelho'] if x.get('referencia')]
            if not refs: raise ValueError('Evangelho ausente')
            result = {'date': day.isoformat(), 'celebration':data['liturgia'], 'references':refs,
                      'source':url, 'retrievedOn':'2026-10-24', 'responseSha256':hashlib.sha256(raw).hexdigest()}
            dest.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            time.sleep(0.12)
            return
        except Exception as err:
            if attempt == 3: return f'{day}: {err}'
            time.sleep(2*(attempt+1))
days=[datetime.date(2026,1,1)+datetime.timedelta(days=i) for i in range(730)]
errors=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    for i,result in enumerate(executor.map(fetch,days),1):
        if result: errors.append(result)
        if i%50==0: print(f'{i}/730 datas verificadas',flush=True)
(DEST/'import-report.json').write_text(json.dumps({'dates':730,'errors':errors,'provider':BASE,'notes':'Referências factuais; provedor comunitário, não homologação CNBB. Texto bíblico separado: Bíblia Livre.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Importação: {730-len(errors)} datas, {len(errors)} falhas.',flush=True)
if errors: print('\n'.join(errors)); sys.exit(1)
