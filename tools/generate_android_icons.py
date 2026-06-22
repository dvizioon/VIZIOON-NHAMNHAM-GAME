"""
Gera ícones Android (mipmap) e splash nativa a partir da cabeça da lagarta em public/.
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

# Tamanhos padrão Capacitor Android (portrait / landscape)
SPLASH_SIZES = {
    "drawable": (480, 320),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
}

FOREGROUND_SCALE = 0.72
SPLASH_LOGO_SCALE = 0.42


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


def make_splash(src: Image.Image, width: int, height: int) -> Image.Image:
    canvas = Image.new("RGB", (width, height), BG_COLOR[:3])
    target = int(min(width, height) * SPLASH_LOGO_SCALE)
    logo = src.copy()
    logo.thumbnail((target, target), Image.Resampling.LANCZOS)
    x = (width - logo.width) // 2
    y = (height - logo.height) // 2
    if logo.mode == "RGBA":
        canvas.paste(logo, (x, y), logo)
    else:
        canvas.paste(logo, (x, y))
    return canvas


def generate_launcher_icons(src: Image.Image) -> None:
    for folder, (launcher_px, fg_px) in DENSITIES.items():
        out_dir = RES / folder
        out_dir.mkdir(parents=True, exist_ok=True)

        fg = fit_center(src, fg_px, FOREGROUND_SCALE)
        fg.save(out_dir / "ic_launcher_foreground.png", optimize=True)

        launcher = composite_on_bg(fg, launcher_px)
        launcher.save(out_dir / "ic_launcher.png", optimize=True)
        launcher.save(out_dir / "ic_launcher_round.png", optimize=True)

        print(f"  {folder}: launcher {launcher_px}px, foreground {fg_px}px")


def generate_splash_screens(src: Image.Image) -> None:
    for folder, (width, height) in SPLASH_SIZES.items():
        out_dir = RES / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        splash = make_splash(src, width, height)
        splash.save(out_dir / "splash.png", optimize=True)
        print(f"  {folder}: splash {width}x{height}px")


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Fonte não encontrada: {SOURCE}")

    src = Image.open(SOURCE).convert("RGBA")
    print(f"Fonte: {SOURCE.name} ({src.width}x{src.height})")
    print("Ícones launcher:")
    generate_launcher_icons(src)
    print("Splash nativa:")
    generate_splash_screens(src)
    print("Ícones e splash gerados com sucesso.")


if __name__ == "__main__":
    main()
