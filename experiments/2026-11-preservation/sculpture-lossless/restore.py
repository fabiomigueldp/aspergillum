#!/usr/bin/env python3
"""Restore historical Blender bytes from this archive, without reading originals.
Python 3.10+ and the zstd CLI are required. There is no implicit overwrite mode.
"""
import argparse, hashlib, json, shutil, subprocess, tempfile
from pathlib import Path, PurePosixPath

def sha(path):
    with path.open('rb') as stream:
        h=hashlib.sha256()
        for block in iter(lambda:stream.read(1024*1024),b''): h.update(block)
        return h.hexdigest()

def safe_path(root,relative):
    p=PurePosixPath(relative)
    if p.is_absolute() or not p.parts or any(x in ('..','.') for x in p.parts):
        raise ValueError('Unsafe archive path: '+relative)
    target=root.joinpath(*p.parts)
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError('Archive path escapes root: '+relative)
    return target

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('action',choices=['verify','restore'])
    ap.add_argument('--destination',type=Path)
    ap.add_argument('--source',action='append',help='Restore only this exact original relative path. Repeat as needed.')
    ap.add_argument('--report',type=Path,help='Write verification report to a new path, never overwrite.')
    ap.add_argument('--temp-dir',type=Path,help='Existing directory on a filesystem with at least 4.9 GB free for decode cache.')
    args=ap.parse_args()
    if shutil.which('zstd') is None: ap.error('zstd CLI required; archive was verified with zstd 1.5.7')
    if args.action=='restore' and args.destination is None: ap.error('restore requires --destination')
    if args.action=='verify' and args.destination is not None: ap.error('verify does not use --destination')
    if args.report and args.report.exists(): ap.error('report exists; refusing to overwrite')
    root=Path(__file__).resolve().parent
    mf=root/'manifest.json'; manifest=json.loads(mf.read_text())
    if manifest.get('format_version')!=1: ap.error('unsupported manifest version')
    entries={x['sha256']:x for x in manifest['objects']}
    if len(entries)!=len(manifest['objects']): ap.error('duplicate object identity')
    aliases=manifest['aliases']
    alias_names={x['path'] for x in aliases}
    if len(alias_names)!=len(aliases): ap.error('duplicate destination path')
    if args.source:
        unknown=set(args.source)-alias_names
        if unknown: ap.error('unknown source paths: '+str(sorted(unknown)))
        aliases=[x for x in aliases if x['path'] in set(args.source)]
    if args.action=='restore':
        output=args.destination.resolve()
        if output.exists() and not output.is_dir(): ap.error('destination is not a directory')
        targets=[safe_path(output,x['path']) for x in aliases]
        if any(p.exists() or p.is_symlink() for p in targets): ap.error('destination file already exists; refusing all writes')
    required=set(entries) if args.action=='verify' else {a['sha256'] for a in aliases}
    for h in list(required):
        current=h; stack=set()
        while current:
            if current in stack: raise ValueError('Cyclic reference chain')
            stack.add(current)
            if current not in entries: raise ValueError('Missing reference object: '+current)
            required.add(current);current=entries[current]['reference_sha256']
    complete={}; visiting=set()
    with tempfile.TemporaryDirectory(prefix='paz-lossless-verify-',dir=args.temp_dir) as tmp:
        cache=Path(tmp)
        def decode(h):
            if h in complete: return complete[h]
            if h in visiting: raise ValueError('Cyclic reference chain')
            visiting.add(h); item=entries[h]
            packed=safe_path(root,item['representation'])
            if packed.stat().st_size!=item['compressed_bytes'] or sha(packed)!=item['compressed_sha256']:
                raise ValueError('Compressed payload verification failed: '+str(packed))
            ref=item['reference_sha256']; base=decode(ref) if ref else None
            decoded=cache/(h+'.blend')
            command=['zstd','-q','-d','-M512MB']
            if base: command.append('--patch-from='+str(base))
            command += [str(packed),'-o',str(decoded)]
            subprocess.run(command,check=True)
            if decoded.stat().st_size!=item['bytes'] or sha(decoded)!=h:
                raise ValueError('Decoded source verification failed: '+h)
            complete[h]=decoded;visiting.remove(h)
            return decoded
        for h in sorted(required): decode(h)
        restored=0
        if args.action=='restore':
            for alias in aliases:
                dst=safe_path(output,alias['path']);dst.parent.mkdir(parents=True,exist_ok=True)
                # Exclusive creation defends against concurrent writers after preflight.
                with dst.open('xb') as sink,complete[alias['sha256']].open('rb') as source:
                    shutil.copyfileobj(source,sink,1024*1024)
                if sha(dst)!=alias['sha256']: raise ValueError('Restored destination verification failed')
                restored+=1
        report={'action':args.action,'status':'PASS','manifest_sha256':sha(mf),'objects_decoded_and_sha256_verified':len(complete),'decoded_unique_bytes':sum(entries[h]['bytes'] for h in complete),'paths_restored':restored,'original_source_files_read':False,'original_source_files_overwritten':False,'zstd_version':subprocess.check_output(['zstd','--version'],text=True).strip()}
    if args.report:
        args.report.parent.mkdir(parents=True,exist_ok=True)
        with args.report.open('x') as stream: json.dump(report,stream,indent=2);stream.write('\n')
    print(json.dumps(report,indent=2))
if __name__=='__main__': main()
