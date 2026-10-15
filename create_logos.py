"""Extract raster brand assets from nova-image-logo.png using Pillow.

Run: python create_logos.py
Requires: Pillow. No fonts, vector tracing or redrawn lettering are used.
Crop coordinates refer to the supplied 1536 x 1024 source image.
The mobile crop omits only the small services tagline.
The site loads these assets from logos; phone icons use an opaque background.
"""

from pathlib import Path

from PIL import Image, ImageOps


BACKGROUND = 253
PADDING = 12
FULL_BOX = (326, 184, 1217, 852)
SYMBOL_BOX = (611, 184, 925, 539)
MOBILE_BOX = (326, 184, 1217, 790)


def remove_background(image):
    """Unmatte edge pixels against the original near-white background."""
    image = image.convert("RGB")
    source = image.load()
    result = Image.new("RGBA", image.size)
    pixels = result.load()

    for y in range(image.height):
        for x in range(image.width):
            color = source[x, y]
            if min(color) >= 248:
                continue
            if min(color) < 120:
                pixels[x, y] = (*color, 255)
                continue

            # Nearby solid ink estimates coverage, avoiding white edge halos.
            candidates = []
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < image.width and 0 <= ny < image.height:
                        neighbor = source[nx, ny]
                        if min(neighbor) < 120:
                            candidates.append((dx * dx + dy * dy, neighbor))
            if not candidates:
                continue
            _, ink = min(candidates)
            delta = [BACKGROUND - channel for channel in ink]
            alpha = min(1, max(0, sum(
                (BACKGROUND - channel) * distance
                for channel, distance in zip(color, delta)
            ) / sum(distance * distance for distance in delta)))
            if alpha <= 0:
                continue
            foreground = tuple(
                max(0, min(255, round(
                    (channel - BACKGROUND * (1 - alpha)) / alpha
                )))
                for channel in color
            )
            pixels[x, y] = (*foreground, round(alpha * 255))
    return result


def dark_variant(image):
    result = image.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha and not (green > blue + 8 and green > red):
                pixels[x, y] = (245, 247, 246, alpha)
    return result


def padded(image):
    return ImageOps.expand(image, PADDING, fill=(0, 0, 0, 0))


def square_icon(symbol, size, opaque=False):
    background = (BACKGROUND,) * 3 + (255,) if opaque else (0, 0, 0, 0)
    result = Image.new("RGBA", (size, size), background)
    scaled = ImageOps.contain(
        symbol, (round(size * 0.84), round(size * 0.84)),
        Image.Resampling.LANCZOS,
    )
    position = ((size - scaled.width) // 2, (size - scaled.height) // 2)
    result.alpha_composite(scaled, position)
    return result


def main():
    with Image.open("nova-image-logo.png") as original:
        if original.size != (1536, 1024):
            raise ValueError("Crop coordinates require the original 1536 x 1024 PNG.")
        original = original.convert("RGB")
    output = Path("logos")
    output.mkdir(exist_ok=True)

    full = remove_background(original.crop(FULL_BOX))
    symbol = remove_background(original.crop(SYMBOL_BOX))
    mobile = remove_background(original.crop(MOBILE_BOX))

    for theme in ("light", "dark"):
        full_variant = full if theme == "light" else dark_variant(full)
        symbol_variant = symbol if theme == "light" else dark_variant(symbol)
        mobile_variant = mobile if theme == "light" else dark_variant(mobile)
        padded(full_variant).save(output / f"logo-{theme}-full.png", optimize=True)
        padded(symbol_variant).save(output / f"symbol-b-{theme}.png", optimize=True)
        mobile_variant = padded(mobile_variant)
        mobile_variant.thumbnail((600, 600), Image.Resampling.LANCZOS)
        mobile_variant.save(output / f"logo-mobile-{theme}.png", optimize=True)

    for size in (16, 32, 48, 64, 128, 256, 512):
        square_icon(symbol, size).save(output / f"favicon-{size}.png", optimize=True)
    square_icon(symbol, 48, opaque=True).save(
        output / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    for name, size in (
        ("apple-touch-icon.png", 180),
        ("android-chrome-192x192.png", 192),
        ("android-chrome-512x512.png", 512),
    ):
        square_icon(symbol, size, opaque=True).save(output / name, optimize=True)
    print(f"Created original-image logo assets in {output.resolve()}")


if __name__ == "__main__":
    main()
