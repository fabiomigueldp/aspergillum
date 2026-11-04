"""Read-only contracts for the curated archive, not approval of archived studies."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest


HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
PREFIX = 'experiments/2026-11-preservation/'


def read_json(path):
    return json.loads(path.read_text())


def prior_bytes(commit, relative):
    return subprocess.check_output(['git', '-C', str(REPO), 'show', f'{commit}:{PREFIX}{relative}'])


class CurationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.curation = read_json(HERE / 'CURATION.json')
        cls.commit = cls.curation['comparison_commit']
        cls.manifests = {p.stem: read_json(p) for p in (HERE / 'snapshots').glob('*.json')}
        cls.paz = {f['path']: f for f in cls.manifests['nossa-senhora-da-paz']['files']}
        raw = prior_bytes(cls.commit, 'snapshots/nossa-senhora-da-paz.json')
        cls.previous_raw = raw
        cls.previous = {f['path']: f for f in json.loads(raw)['files']}

    def test_comparison_survives_history_cleanup(self):
        # The old complete commit is provenance only; never require its objects.
        subprocess.run(['git', '-C', str(REPO), 'merge-base', '--is-ancestor', self.commit, 'HEAD'], check=True)
        retained = {p.stem for p in (HERE / 'objects').glob('*/*.blob')}
        discarded = {entry['sha256'] for entry in self.curation['removed_entries']} - retained
        self.assertEqual(len(discarded), self.curation['counts']['common_objects_removed'])
        removal = read_json(HERE / 'HISTORY_REWRITE.json')
        forbidden = set(removal['discarded_git_blob_ids'])
        self.assertEqual(len(forbidden), self.curation['counts']['common_objects_removed'])
        history = subprocess.check_output(['git', '-C', str(REPO), 'rev-list', '--objects', 'HEAD']).decode().splitlines()
        historical_objects = {line.split(' ', 1)[0] for line in history}
        self.assertFalse(forbidden & historical_objects, 'Discarded payload remains reachable in main history')

    def test_omissions_are_exactly_documented(self):
        self.assertEqual(hashlib.sha256(self.previous_raw).hexdigest(), self.curation['previous_paz_manifest_sha256'])
        removed = {f['path']: f for f in self.curation['removed_entries']}
        self.assertEqual(set(removed), set(self.previous) - set(self.paz))
        self.assertFalse(set(removed) & set(self.paz))
        for path, entry in removed.items():
            self.assertEqual(entry, {key: self.previous[path][key] for key in ('path', 'sha256', 'bytes', 'storage')})
        for path, entry in self.paz.items():
            self.assertEqual(entry, self.previous[path])

    def test_selected_sources_and_inputs_are_preserved(self):
        for path, entry in self.previous.items():
            if Path(path).suffix in ('.py', '.mjs', '.sh', '.md', '.txt') or path.startswith(('preservation-audit/', 'nspaz-reference/', 'nspaz-newrefs-20261102/')):
                self.assertIn(path, self.paz)
        for entries in self.curation['build_inputs'].values():
            for entry in entries:
                self.assertEqual(entry, {key: self.paz[entry['path']][key] for key in ('path', 'sha256', 'bytes')})
        self.assertFalse(any('/all-band-depth1' in path for path in self.paz))

    def test_minimum_inventory_and_explicit_additions_define_selection(self):
        seed = self.previous['preservation-audit/recommended-selection.json']
        blob = HERE / 'objects' / seed['sha256'][:2] / (seed['sha256'] + '.blob')
        minimum = read_json(blob)
        selected = {f['source'] for f in minimum['files'] if f['source'] in self.previous}
        selected.update(path for path in self.previous if Path(path).suffix in ('.py', '.mjs', '.sh', '.md', '.txt') or path.startswith(('preservation-audit/', 'nspaz-reference/', 'nspaz-newrefs-20261102/')))
        selected = {path for path in selected if '/all-band-depth1' not in path}
        self.assertEqual(set(self.paz), selected)

    def test_other_snapshots_and_sculpture_manifest_are_unchanged(self):
        for name in self.manifests:
            if name != 'nossa-senhora-da-paz':
                relative = f'snapshots/{name}.json'
                self.assertEqual((HERE / relative).read_bytes(), prior_bytes(self.commit, relative))
        relative = 'sculpture-lossless/manifest.json'
        self.assertEqual((HERE / relative).read_bytes(), prior_bytes(self.commit, relative))
        sculpture = read_json(HERE / relative)
        objects = {entry['sha256']: entry for entry in sculpture['objects']}
        for entry in objects.values():
            self.assertTrue(entry['reference_sha256'] is None or entry['reference_sha256'] in objects)
            payload = HERE / 'sculpture-lossless' / entry['representation']
            self.assertEqual(payload.stat().st_size, entry['compressed_bytes'])
            self.assertEqual(hashlib.sha256(payload.read_bytes()).hexdigest(), entry['compressed_sha256'])

    def test_object_reachability_sizes_and_summary(self):
        referenced = {f['sha256']: f for manifest in self.manifests.values() for f in manifest['files'] if f['storage'] == 'archive'}
        actual = {p.stem: p for p in (HERE / 'objects').glob('*/*.blob')}
        self.assertEqual(set(actual), set(referenced), 'Missing or orphaned archive payload')
        for sha, path in actual.items():
            self.assertEqual(path.stat().st_size, referenced[sha]['bytes'])
        counts = self.curation['counts']
        self.assertEqual(counts['paz_paths_retained'], len(self.paz))
        self.assertEqual(counts['paz_paths_removed'], len(self.previous) - len(self.paz))
        self.assertEqual(counts['common_objects_retained'], len(actual))
        self.assertEqual(counts['common_bytes_retained'], sum(p.stat().st_size for p in actual.values()))
        summary = read_json(HERE / 'SUMMARY.json')
        self.assertEqual(summary['common_snapshot_entries'], sum(len(m['files']) for m in self.manifests.values()))
        for entry in summary['snapshots']:
            path = HERE / 'snapshots' / (entry['id'] + '.json')
            self.assertEqual(entry['manifest_sha256'], hashlib.sha256(path.read_bytes()).hexdigest())
            self.assertEqual(entry['files'], len(self.manifests[entry['id']]['files']))
        sculpture = read_json(HERE / 'sculpture-lossless/manifest.json')
        self.assertEqual(summary['stored_objects'], len(actual) + len(sculpture['objects']))
        self.assertEqual(summary['stored_object_bytes'], counts['common_bytes_retained'] + sum(e['compressed_bytes'] for e in sculpture['objects']))


if __name__ == '__main__':
    unittest.main()
