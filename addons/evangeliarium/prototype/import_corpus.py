"""Importa a edição fixada da Bíblia Livre; apenas biblioteca padrão Python 3."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import urllib.request
import zipfile


ROOT = Path(__file__).resolve().parent
ARCHIVE_URL = "https://ebible.org/Scriptures/porbr2018_vpl.zip"
LICENSE_URL = "https://ebible.org/porbr2018/copyright.htm"
ARCHIVE_HASH = "1f71b7765795ae7cc416a9255c7d9c3a3932ce868206fa762606c7438c8fc682"
BOOKS = (("MAT", "Mateus", 28, 1071), ("MAR", "Marcos", 16, 678),
         ("LUK", "Lucas", 24, 1151), ("JOH", "João", 21, 879))


def digest(value):
    return hashlib.sha256(value).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="baixa fontes ausentes; exige o hash fixado")
    parser.add_argument("--check", action="store_true", help="confere dados gerados sem regravá-los")
    args = parser.parse_args()
    source = ROOT / "source"
    source.mkdir(exist_ok=True)
    archive_path = source / "porbr2018_vpl.zip"
    if not archive_path.exists() and args.download:
        payload = urllib.request.urlopen(ARCHIVE_URL, timeout=60).read()
        if digest(payload) != ARCHIVE_HASH:
            raise SystemExit("A origem mudou: revise a edição antes de atualizar o hash.")
        archive_path.write_bytes(payload)
    if not archive_path.exists():
        raise SystemExit("ZIP ausente. Use --download para obter a fonte fixada.")
    archive_bytes = archive_path.read_bytes()
    if digest(archive_bytes) != ARCHIVE_HASH:
        raise SystemExit("SHA-256 do ZIP diverge da fonte fixada.")
    license_path = source / "copyright.htm"
    if not license_path.exists() and args.download:
        license_path.write_bytes(urllib.request.urlopen(LICENSE_URL, timeout=60).read())
    if not license_path.exists():
        raise SystemExit("Cópia da licença ausente. Use --download.")

    with zipfile.ZipFile(archive_path) as archive:
        raw = archive.read("porbr2018_vpl.txt")
        about = archive.read("porbr2018_about.htm")
        signature = archive.read("signature.txt.asc")
    text = raw.decode("utf-8-sig")
    if "\ufffd" in text:
        raise SystemExit("Caractere de substituição encontrado na fonte.")
    selected = {code: {} for code, *_ in BOOKS}
    pattern = re.compile(r"^([A-Z0-9]{3}) ([1-9]\d*):([1-9]\d*) (.*)$")
    for line_number, line in enumerate(text.splitlines(), 1):
        match = pattern.fullmatch(line)
        if not match:
            if line:
                raise SystemExit(f"Registro inválido na linha {line_number}.")
            continue
        code, chapter, verse, words = match.groups()
        if code not in selected:
            continue
        chapter, verse = int(chapter), int(verse)
        if not words:
            raise SystemExit(f"Versículo vazio: {code} {chapter}:{verse}.")
        entries = selected[code].setdefault(chapter, {})
        if verse in entries:
            raise SystemExit(f"Referência duplicada: {code} {chapter}:{verse}.")
        # Não aplicar strip, normalização Unicode, pontuação ou revisão editorial.
        entries[verse] = words

    output_books = []
    chapter_counts = {}
    for code, name, count, total in BOOKS:
        chapters = selected[code]
        if sorted(chapters) != list(range(1, count + 1)):
            raise SystemExit(f"Capítulos ausentes/inesperados em {code}.")
        output_chapters = []
        for chapter in range(1, count + 1):
            entries = chapters[chapter]
            if sorted(entries) != list(range(1, len(entries) + 1)):
                raise SystemExit(f"Lacuna de versificação em {code} {chapter}.")
            output_chapters.append([entries[v] for v in range(1, len(entries) + 1)])
        counts = [len(c) for c in output_chapters]
        if sum(counts) != total:
            raise SystemExit(f"Total inesperado de versículos em {code}.")
        chapter_counts[code] = counts
        output_books.append({"id": code, "name": name, "chapters": output_chapters})

    corpus = {"edition": "porbr2018", "name": "Bíblia Livre", "books": output_books}
    js = ("// Gerado por import_corpus.py. Não editar; texto Bíblia Livre, CC BY 4.0.\n"
          "globalThis.EVANGELIUM_DATA = " + json.dumps(corpus, ensure_ascii=False, separators=(",", ":")) + ";\n").encode("utf-8")
    manifest = {
        "edition": "porbr2018", "retrievedOn": "2026-10-24",
        "sourceUrl": ARCHIVE_URL, "licenseSourceUrl": LICENSE_URL,
        "license": "CC-BY-4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
        "copyright": "© 2018 Diego Santos, Mario Sérgio, e Marco Teles",
        "archiveSha256": ARCHIVE_HASH, "vplSha256": digest(raw),
        "licenseSnapshotSha256": digest(license_path.read_bytes()), "dataSha256": digest(js),
        "books": 4, "chapters": 89, "verses": 3779, "versesPerChapter": chapter_counts,
        "changes": "Seleção de quatro livros e indexação em JSON; conteúdo de cada versículo preservado.",
        "notes": "VPL fornecido sem notas, introduções, títulos não canônicos ou parágrafos editoriais.",
    }
    generated = {
        ROOT / "data.js": js,
        source / "manifest.json": (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8"),
        source / "porbr2018_about.htm": about,
        source / "signature.txt.asc": signature,
    }
    for path, value in generated.items():
        if args.check:
            if not path.exists() or path.read_bytes() != value:
                raise SystemExit(f"Arquivo não reproduzível: {path.name}")
        else:
            path.write_bytes(value)
    print("OK: 4 Evangelhos, 89 capítulos, 3.779 versículos; referências contínuas, sem duplicatas.")
    print(f"ZIP SHA-256: {ARCHIVE_HASH}")
    print(f"data.js SHA-256: {digest(js)}")
    print("Texto e saídas reproduzíveis conferidos." if args.check else "Dados e proveniência gerados.")


if __name__ == "__main__":
    main()
