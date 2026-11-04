import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('archive', Path(__file__).with_name('archive.py'))
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)


class ArchiveTests(unittest.TestCase):
    def test_safe_relative_paths(self):
        self.assertEqual(archive.safe_path('addons/paz/model.geo.json'), Path('addons/paz/model.geo.json'))
        for path in ('../escape', '/absolute', 'a/../b', 'C:/escape', 'a\\b', '.git/config', 'node_modules/x'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                archive.safe_path(path)

    def test_checked_git_blob(self):
        objects = archive.GitObjects()
        try:
            with self.assertRaises(ValueError):
                objects.get('HEAD:package.json')
        finally:
            objects.close()

    def test_integrity_and_restore_guards(self):
        old = archive.HERE
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            archive.HERE = root / 'archive'
            (archive.HERE / 'objects').mkdir(parents=True)
            (archive.HERE / 'snapshots').mkdir()
            data = b'preserved research\n'
            sha = hashlib.sha256(data).hexdigest()
            entry = {'path': 'src/example.txt', 'storage': 'archive', 'sha256': sha, 'bytes': len(data)}
            obj = archive.HERE / 'objects' / sha[:2] / (sha + '.blob')
            obj.parent.mkdir(exist_ok=True)
            obj.write_bytes(data)
            manifest = {'schema_version': 1, 'status': 'experimental-no-go', 'files': [entry]}
            mpath = archive.HERE / 'snapshots/example.json'
            mpath.write_text(json.dumps(manifest))
            try:
                target = root / 'restored'
                self.assertEqual(archive.process_snapshot('example', target), 1)
                self.assertEqual((target / 'src/example.txt').read_bytes(), data)
                with self.assertRaises(ValueError):
                    archive.process_snapshot('example', target)
                with self.assertRaises(ValueError):
                    archive.process_snapshot('example', archive.REPO / 'overwrite-runtime')
                obj.write_bytes(b'corrupted')
                with self.assertRaises(ValueError):
                    archive.process_snapshot('example', root / 'bad')
                self.assertFalse((root / 'bad').exists())
                manifest['files'].append(entry)
                mpath.write_text(json.dumps(manifest))
                with self.assertRaises(ValueError):
                    archive.read_manifest('example')
            finally:
                archive.HERE = old


if __name__ == '__main__':
    unittest.main()
