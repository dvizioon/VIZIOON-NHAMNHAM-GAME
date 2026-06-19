"""Sincroniza voz no criancas.json, renomeia MP3 e copia pro backend/assets."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKUP_JSON = ROOT / "backend" / "backup" / "criancas.json"
GAME_JSON = ROOT / "game" / "public" / "assets" / "data" / "criancas.json"
VOICES_GAME = ROOT / "game" / "public" / "assets" / "sounds" / "sfx" / "childs"
VOICES_BACKEND = ROOT / "backend" / "assets" / "sounds" / "sfx" / "childs"


def voz_from_cabeca(cabeca: str | None, child_id: str) -> str:
    if cabeca and cabeca.endswith(".png"):
        return cabeca[:-4] + ".mp3"
    return f"{child_id}.mp3"


def main() -> int:
    data = json.loads(BACKUP_JSON.read_text(encoding="utf-8-sig"))
    for child in data:
        child["voz"] = voz_from_cabeca(child.get("cabeca"), child["id"])

    payload = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    BACKUP_JSON.write_text(payload, encoding="utf-8")
    GAME_JSON.write_text(payload, encoding="utf-8")

    VOICES_BACKEND.mkdir(parents=True, exist_ok=True)

    for child in data:
        target = child["voz"]
        by_id = VOICES_GAME / f"{child['id']}.mp3"
        dest = VOICES_GAME / target
        if by_id.exists() and by_id != dest:
            if dest.exists():
                by_id.unlink()
            else:
                by_id.rename(dest)
        if dest.exists():
            shutil.copy2(dest, VOICES_BACKEND / target)
            print(f"  ok {target}")
        else:
            print(f"  falta {target}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
