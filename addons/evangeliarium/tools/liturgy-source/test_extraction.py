import unittest
from bs4 import BeautifulSoup
from extract_liturgy import extract_blocks, canonical, red
from build_catalog import build

class ExtractionTests(unittest.TestCase):
    def parse(self,html):return extract_blocks(BeautifulSoup(html,'html.parser').div,'https://missalromano-mine.blogspot.com/p/test.html')
    def test_preserves_inline_word_spacing_and_red(self):
        b=self.parse('<div>O <b>Senhor</b> <span style="color: red">(rubrica)</span> está convosco.</div>')[0]
        self.assertEqual(b['text'],'O Senhor (rubrica) está convosco.')
        self.assertEqual(''.join(r['text'] for r in b['runs']),b['text'])
        self.assertEqual([r['text'] for r in b['runs'] if r.get('rubric')],['(rubrica)'])
    def test_nested_color_override(self):
        b=self.parse('<div style="color:red">Um <span style="color:black">dois</span> três.</div>')[0]
        self.assertEqual([r['text'] for r in b['runs'] if not r.get('rubric')],['dois'])
    def test_body_does_not_duplicate_nested_blocks(self):
        b=self.parse('<div><div>A</div><div>B <p>C</p> D</div></div>')
        self.assertEqual([x['text'] for x in b],['A','B','C','D'])
    def test_br_blocks_and_numbering(self):
        b=self.parse('<div>1. A<br/>2. B<br/>℣. Senhor.<br/>℟. Amém.</div>')
        self.assertEqual([x['text'] for x in b],['1. A','2. B','℣. Senhor.','℟. Amém.'])
    def test_heading_and_script(self):
        b=self.parse('<div><h2>TÍTULO</h2><script>ignored</script>Texto.</div>')
        self.assertEqual(b[0]['kind'],'heading');self.assertEqual(b[0]['level'],2)
        self.assertEqual(b[1]['text'],'Texto.')
    def test_links_remain_source_links(self):
        b=self.parse('<div><a href="/p/outro.html">Outra página</a></div>')[0]
        self.assertEqual(b['runs'][0]['href'],'https://missalromano-mine.blogspot.com/p/outro.html')
    def test_normalizes_only_internal_urls(self):
        self.assertEqual(canonical('http://missalromano-mine.blogspot.com/p/a.html?m=0#x'),'https://missalromano-mine.blogspot.com/p/a.html')
        self.assertIsNone(canonical('https://unrelated.example/p/a.html'))
    def test_rubric_color_detection(self):
        for c in ('red','#ff0000','#900','rgb(204, 0, 0)','#980000'):self.assertTrue(red(c))
        for c in ('black','#000000','rgb(0, 0, 0)','#333333','inherit'):self.assertFalse(red(c))
    def test_complete_corpus_when_available(self):
        import json
        from pathlib import Path
        p=Path(__file__).parent/'corpus.json'
        if not p.exists():self.skipTest('The source crawl has not completed yet.')
        c=json.loads(p.read_text());cat=build(c)
        for book in cat['books'].values():
            for sec in book['sections']:
                self.assertTrue(sec['sourceUrl'].startswith('https://'))
                for block in sec['blocks']:
                    self.assertEqual(block['text'],''.join(r['text'] for r in block['runs']))
if __name__=='__main__':unittest.main()
