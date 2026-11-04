#!/usr/bin/env python3
"""Rebuild selected research outputs in disposable folders; never install/release.

Requires the NumPy, SciPy and Pillow versions recorded in the resulting report.
Original scripts run unchanged. Output reports are created exclusively, never
overwritten. Historical renderer/Minecraft behavior is outside this check.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
LAB = 'paz-bedrock-v75-prototype-20261103'
TRIM = 'lit_surface_v16/transparent_trim'
SHARED = 'opaque_transport_v15/shared_mask'
spec = importlib.util.spec_from_file_location('archive', HERE / 'archive.py')
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)


def run(arguments, cwd):
    result = subprocess.run(arguments, cwd=cwd, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f'Command failed: {arguments!r}\n{result.stdout}\n{result.stderr}')
    return result.stdout + result.stderr


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, help='New report path; an existing file is refused')
    parser.add_argument('--temp-dir', type=Path, help='Existing directory for disposable build copies')
    args = parser.parse_args()
    if args.report and args.report.exists():
        parser.error('Report already exists; refusing overwrite')
    import numpy
    import scipy
    import PIL
    curation = json.loads((HERE / 'CURATION.json').read_text())
    files = {f['path']: f for f in archive.read_manifest('nossa-senhora-da-paz')['files']}
    expected = {**{f['path']: f for f in curation['removed_entries']}, **files}
    result = {'status': 'PASS', 'scope': 'Selected builders only; no art approval, Minecraft test, release or installation',
              'python': sys.version.split()[0], 'numpy': numpy.__version__, 'scipy': scipy.__version__, 'pillow': PIL.__version__,
              'input_manifest_sha256': hashlib.sha256((HERE / 'CURATION.json').read_bytes()).hexdigest(), 'checks': {}}
    objects = archive.GitObjects()
    try:
        def extract(paths, target):
            for relative in paths:
                entry = files[relative]
                path = target / archive.safe_path(relative)
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(archive.read_entry(entry, objects))

        def exact(path, relative):
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest != expected[relative]['sha256']:
                raise ValueError(f'Rebuilt output differs: {relative}: {digest}')
            return {'path': relative, 'bytes': path.stat().st_size, 'sha256': digest, 'byte_identical': True}

        with tempfile.TemporaryDirectory(prefix='paz-curated-builders-', dir=args.temp_dir) as folder:
            base = Path(folder)
            v15 = base / 'v15'
            inputs = [e['path'] for e in curation['build_inputs']['v15_shared_mask']]
            extract(inputs, v15)
            run([sys.executable, str(v15 / LAB / SHARED / 'build_shared_mask.py')], v15)
            outputs = []
            for tier in (128, 512, 2048):
                for suffix in ('.geo.json', '_new_parts.geo.json', '.png'):
                    relative = f'{LAB}/{SHARED}/shared_mask_{tier}{suffix}'
                    outputs.append(exact(v15 / relative, relative))
            result['checks']['v15_shared_mask'] = {'input_files': len(inputs), 'input_bytes': sum(files[p]['bytes'] for p in inputs), 'outputs': outputs}
            print('V15: all nine geometry/atlas outputs reproduced byte-identically', flush=True)

            v16 = base / 'v16'
            inputs = [e['path'] for e in curation['build_inputs']['v16_trim_and_control']]
            extract(inputs, v16)
            location = v16 / LAB / TRIM
            run([sys.executable, str(location / 'build_trim.py'), '--selection', str(location / 'selection-roi68.json'), '--depths', '1,2,3', '--prefix', 'roi68'], v16)
            run([sys.executable, str(location / 'build_restore_control.py')], v16)
            run([sys.executable, str(location / 'build_trim.py'), '--depths', '1', '--prefix', 'all-band'], v16)
            names = ['roi68-depth1.geo.json', 'roi68-depth2.geo.json', 'roi68-depth3.geo.json', 'roi68-depth3-restored-transparent.geo.json', 'all-band-depth1.geo.json']
            result['checks']['v16_trim_and_control'] = {'input_files': len(inputs), 'input_bytes': sum(files[p]['bytes'] for p in inputs),
                'outputs': [exact(location / name, f'{LAB}/{TRIM}/{name}') for name in names]}
            print('V16: all five geometry outputs reproduced byte-identically', flush=True)

            addon = base / 'addon'
            paths = [p for p in files if p.startswith('paz-addon-audit-20261103/')]
            extract(paths, addon)
            location = addon / 'paz-addon-audit-20261103'
            test_output = run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests'], location)
            count = re.search(r'Ran (\d+) tests', test_output)
            if not count or int(count.group(1)) != 78:
                raise ValueError('Expected 78 addon regression tests')
            output = run([sys.executable, 'tools/addon.py', 'build', '--output', 'artifacts/curated-rebuilt.mcaddon'], location)
            build = json.loads(output)
            if build['release_eligible'] or build['runtime_status'] != 'not_run':
                raise ValueError('Research addon unexpectedly claims release/runtime eligibility')
            result['checks']['addon_0_1_3'] = {'tests_passed': 78, 'input_paths': len(paths), 'input_bytes': sum(files[p]['bytes'] for p in paths), **build}
            print('Paz 0.1.3: 78 tests and development build passed; release remains blocked', flush=True)
    finally:
        objects.close()
    result['temporary_build_copies_removed'] = True
    if args.report:
        with args.report.open('x') as stream:
            json.dump(result, stream, indent=2)
            stream.write('\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
