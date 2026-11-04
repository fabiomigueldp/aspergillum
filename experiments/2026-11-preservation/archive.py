#!/usr/bin/env python3
"""Verify and restore isolated research snapshots. Never installs or builds a pack."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
HEX = re.compile(r"^[0-9a-f]{40}$")
SHA = re.compile(r"^[0-9a-f]{64}$")
LIMIT = 100 * 1024 * 1024


def safe_path(value):
    p = PurePosixPath(value)
    if not isinstance(value, str) or not value or p.is_absolute() or any(x in ('..', '.') for x in value.split('/')) or '\\' in value or ':' in value:
        raise ValueError(f'Unsafe relative path: {value!r}')
    if any(x in ('.git', 'node_modules') for x in p.parts):
        raise ValueError(f'Forbidden path: {value!r}')
    return Path(*p.parts)


class GitObjects:
    def __init__(self):
        self.process = subprocess.Popen(['git', '-C', str(REPO), 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)

    def get(self, oid):
        if not HEX.fullmatch(oid):
            raise ValueError('Invalid Git object ID')
        self.process.stdin.write((oid + '\n').encode())
        self.process.stdin.flush()
        header = self.process.stdout.readline().decode().split()
        if len(header) != 3 or header[0] != oid or header[1] != 'blob':
            raise ValueError(f'Git blob unavailable: {oid}. Fetch full repository history first.')
        size = int(header[2])
        if size > LIMIT:
            raise ValueError('Oversized Git blob')
        data = self.process.stdout.read(size)
        if self.process.stdout.read(1) != b'\n' or len(data) != size:
            raise ValueError('Truncated Git object')
        return data

    def close(self):
        self.process.stdin.close()
        self.process.wait()
        self.process.stdout.close()


def read_entry(entry, objects):
    safe_path(entry['path'])
    sha = entry['sha256']
    if not SHA.fullmatch(sha) or not (0 <= entry['bytes'] < LIMIT):
        raise ValueError('Invalid hash or file size')
    if entry['storage'] == 'git':
        data = objects.get(entry['git_blob'])
    elif entry['storage'] == 'archive':
        path = HERE / 'objects' / sha[:2] / (sha + '.blob')
        if path.is_symlink():
            raise ValueError('Archive objects must not be symbolic links')
        data = path.read_bytes()
    else:
        raise ValueError('Unknown storage type')
    if len(data) != entry['bytes'] or hashlib.sha256(data).hexdigest() != sha:
        raise ValueError(f'Content mismatch: {entry["path"]}')
    return data


def read_manifest(name):
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', name):
        raise ValueError('Invalid snapshot name')
    manifest = json.loads((HERE / 'snapshots' / (name + '.json')).read_text())
    if manifest['schema_version'] != 1 or manifest['status'] != 'experimental-no-go':
        raise ValueError('Unsupported preservation manifest')
    seen = set()
    for entry in manifest['files']:
        path = str(safe_path(entry['path']))
        if path in seen:
            raise ValueError(f'Duplicate path: {path}')
        seen.add(path)
    return manifest


def run_companion(manifest, destination=None, temp_dir=None):
    if not manifest.get('companion_archive'):
        return 0
    if manifest['companion_archive'] != 'sculpture-lossless':
        raise ValueError('Unknown companion archive')
    folder = HERE / 'sculpture-lossless'
    metadata = folder / 'manifest.json'
    if hashlib.sha256(metadata.read_bytes()).hexdigest() != manifest['companion_manifest_sha256']:
        raise ValueError('Companion manifest integrity mismatch')
    command = [sys.executable, str(folder / 'restore.py'), 'verify' if destination is None else 'restore']
    if destination is not None:
        command += ['--destination', str(destination)]
    if temp_dir is not None:
        command += ['--temp-dir', str(temp_dir)]
    subprocess.run(command, check=True)
    return len(json.loads(metadata.read_text())['aliases'])


def process_snapshot(name, destination=None, temp_dir=None):
    manifest = read_manifest(name)
    if destination is not None:
        destination = Path(destination).resolve()
        if destination == REPO or REPO in destination.parents:
            raise ValueError('Restore outside the active repository, into a new directory')
        if destination.exists():
            raise ValueError('Destination already exists; no files were overwritten')
    objects = GitObjects()
    # Verify everything before creating the target. A corrupt archive never leaves a partial restore.
    try:
        for entry in manifest['files']:
            read_entry(entry, objects)
        companions = run_companion(manifest, temp_dir=temp_dir)
        if destination is not None:
            destination.mkdir(parents=True, exist_ok=False)
            for entry in manifest['files']:
                target = destination / safe_path(entry['path'])
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(read_entry(entry, objects))
                target.chmod(0o755 if entry.get('executable') else 0o644)
            if companions:
                run_companion(manifest, destination, temp_dir=temp_dir)
    finally:
        objects.close()
    return len(manifest['files']) + companions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('list')
    verify = sub.add_parser('verify')
    verify.add_argument('snapshot', nargs='?')
    verify.add_argument('--temp-dir', help='Filesystem with at least 4.9 GB free for sculpture decoding')
    restore = sub.add_parser('restore')
    restore.add_argument('snapshot')
    restore.add_argument('destination')
    restore.add_argument('--temp-dir', help='Filesystem with at least 4.9 GB free for sculpture decoding')
    args = parser.parse_args()
    names = sorted(p.stem for p in (HERE / 'snapshots').glob('*.json'))
    if args.command == 'list':
        for name in names:
            manifest = read_manifest(name)
            print(f'{name}: {len(manifest["files"])} files; {manifest["status"]}')
    elif args.command == 'verify':
        for name in [args.snapshot] if args.snapshot else names:
            print(f'{name}: verified {process_snapshot(name, temp_dir=args.temp_dir)} files')
    else:
        print(f'Restored {process_snapshot(args.snapshot, args.destination, temp_dir=args.temp_dir)} files to {args.destination}; NO-GO, not installed')


if __name__ == '__main__':
    main()
