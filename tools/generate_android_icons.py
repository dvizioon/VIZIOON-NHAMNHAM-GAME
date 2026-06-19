"""
Gera ícones Android (mipmap) a partir da cabeça da lagarta em public/.
Uso: python tools/generate_android_icons.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "android-chrome-512x512.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
BG_COLOR = (232, 249, 255, 255)  # #E8F9FF — céu do jogo

# launcher legado | foreground adaptativo (108dp base)
DENSITIES = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}

FOREGROUND_SCALE = 0.72


def fit_center(img: Image.Image, size: int, scale: float, bg=None) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    target = int(size * scale)
    fitted = img.copy()
    fitted.thumbnail((target, target), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted if fitted.mode == "RGBA" else None)
    return canvas


def composite_on_bg(foreground: Image.Image, size: int) -> Image.Image:
    base = Image.new("RGBA", (size, size), BG_COLOR)
    fg = foreground.resize((size, size), Image.Resampling.LANCZOS)
    base.alpha_composite(fg)
    return base.convert("RGB")


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Fonte não encontrada: {SOURCE}")

    src = Image.open(SOURCE).convert("RGBA")
    print(f"Fonte: {SOURCE.name} ({src.width}x{src.height})")

    for folder, (launcher_px, fg_px) in DENSITIES.items():
        out_dir = RES / folder
        out_dir.mkdir(parents=True, exist_ok=True)

        fg = fit_center(src, fg_px, FOREGROUND_SCALE)
        fg_path = out_dir / "ic_launcher_foreground.png"
        fg.save(fg_path, optimize=True)

        launcher = composite_on_bg(fg, launcher_px)
        launcher.save(out_dir / "ic_launcher.png", optimize=True)
        launcher.save(out_dir / "ic_launcher_round.png", optimize=True)

        print(f"  {folder}: launcher {launcher_px}px, foreground {fg_px}px")

    print("Ícones gerados com sucesso.")


if __name__ == "__main__":
    main()
