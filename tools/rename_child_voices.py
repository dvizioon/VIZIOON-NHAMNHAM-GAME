"""
Renomeia vozes exportadas da IA para {id}.mp3 conforme criancas.json.

Entrada:  public/assets/sounds/sfx/childs/*.mp3  (nomes longos da TTS)
Saída:    public/assets/sounds/sfx/childs/anderson.mp3, anna.mp3, ...

Uso:
  python tools/rename_child_voices.py          # simula
  python tools/rename_child_voices.py --apply  # renomeia de verdade
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CRIANCAS_JSON = ROOT / "public" / "assets" / "data" / "criancas.json"
VOICES_DIR = ROOT / "public" / "assets" / "sounds" / "sfx" / "childs"


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", text.lower())


def load_criancas() -> list[dict]:
    data = json.loads(CRIANCAS_JSON.read_text(encoding="utf-8"))
    return [c for c in data if c.get("ativo", True)]


def match_crianca_id(filename: str, criancas: list[dict]) -> str | None:
    norm_file = normalize(filename)
    for crianca in sorted(criancas, key=lambda c: len(c["nome"]), reverse=True):
        if normalize(crianca["nome"]) in norm_file:
            return crianca["id"]
    return None


def is_final_name(path: Path, criancas: list[dict]) -> bool:
    ids = {c["id"] for c in criancas}
    return path.suffix.lower() == ".mp3" and path.stem in ids


def main() -> int:
    parser = argparse.ArgumentParser(description="Renomeia vozes das crianças para {id}.mp3")
    parser.add_argument("--apply", action="store_true", help="Aplica as renomeações (sem isso, só simula)")
    args = parser.parse_args()

    if not CRIANCAS_JSON.exists():
        print(f"Arquivo não encontrado: {CRIANCAS_JSON}")
        return 1

    criancas = load_criancas()
    VOICES_DIR.mkdir(parents=True, exist_ok=True)

    sources = sorted(VOICES_DIR.glob("*.mp3"))
    if not sources:
        print(f"Nenhum .mp3 em {VOICES_DIR}")
        return 0

    planned: dict[str, Path] = {}
    skipped: list[str] = []
    unmatched: list[str] = []

    for src in sources:
        if any(src.name == normalize(c.get("voz") or f"{c['id']}.mp3") for c in criancas):
            skipped.append(f"já ok: {src.name}")
            continue

        crianca_id = match_crianca_id(src.name, criancas)
        if not crianca_id:
            unmatched.append(src.name)
            continue

        child = next(c for c in criancas if c["id"] == crianca_id)
        dest_name = normalize(child.get("voz") or f"{crianca_id}.mp3")
        dest = VOICES_DIR / dest_name
        if crianca_id in planned:
            prev = planned[crianca_id]
            keep = src if src.stat().st_mtime >= prev.stat().st_mtime else prev
            drop = prev if keep is src else src
            print(f"  duplicata {crianca_id}: mantém {keep.name}, ignora {drop.name}")
            planned[crianca_id] = keep
            continue

        if dest.exists() and dest.resolve() != src.resolve():
            print(f"  destino já existe para {crianca_id}: {dest.name} (ignora {src.name})")
            continue

        planned[crianca_id] = src

    print(f"\n{'APLICANDO' if args.apply else 'SIMULAÇÃO'} — {len(planned)} renomeação(ões)\n")

    for crianca_id, src in sorted(planned.items(), key=lambda item: item[0]):
        child = next(c for c in criancas if c["id"] == crianca_id)
        dest = VOICES_DIR / normalize(child.get("voz") or f"{crianca_id}.mp3")
        action = "renomear" if src.name != dest.name else "manter"
        print(f"  {action}: {src.name} -> {dest.name}")
        if args.apply and src.name != dest.name:
            if dest.exists():
                dest.unlink()
            src.rename(dest)

    if skipped:
        print(f"\nIgnorados ({len(skipped)}):")
        for line in skipped:
            print(f"  {line}")

    if unmatched:
        print(f"\nSem match ({len(unmatched)}):")
        for name in unmatched:
            print(f"  {name}")

    missing = [
        c["id"] for c in criancas
        if not (VOICES_DIR / normalize(c.get("voz") or f"{c['id']}.mp3")).exists()
    ]
    if missing:
        print(f"\nAinda faltam ({len(missing)}): {', '.join(missing)}")
    else:
        print(f"\nTodas as {len(criancas)} vozes estão em {VOICES_DIR.name}/")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
