"""Builds the neon logo variants (one per ambience) from assets/icon.png.

The source logo is a white figure + yellow sun + light-blue DNA rungs on a flat
blue background. Each pixel is "unmixed" into (element, coverage) against the
blue, then recomposed on black with the theme's neon colours and a glow.

    python3 tools/make-logos.py      # writes assets/logo/logo-<accent>.png (1024 px)
                                     # + logo-braise-adaptive.png for Android
"""
import numpy as np
from PIL import Image, ImageFilter

SRC = 'assets/icon.png'
SIZE = 1024
BG = np.array([37, 125, 196], float)
ELEMENTS = {  # colour in the source logo
    'white': np.array([250, 250, 250], float),
    'sun': np.array([250, 230, 135], float),
    'rungs': np.array([150, 210, 245], float),
}
# Same palettes as src/lib/theme.tsx (primary, neon halo).
PALETTES = {
    'braise': ((255, 59, 78), (255, 45, 68)),
    'ambre': ((255, 177, 59), (255, 159, 28)),
    'foret': ((61, 242, 164), (34, 224, 146)),
    'glacier': ((79, 195, 255), (46, 174, 255)),
    'lune': ((242, 242, 242), (232, 232, 240)),
    # Galaxie
    'nebuleuse': ((199, 125, 255), (178, 77, 255)),
    'aurore': ((61, 245, 208), (34, 224, 200)),
    'supernova': ((255, 181, 71), (255, 138, 31)),
    'trounoir': ((207, 227, 255), (184, 212, 255)),
    # Métal
    'or': ((233, 190, 98), (224, 169, 64)),
    'chrome': ((217, 222, 230), (201, 207, 216)),
}


def unmix(img):
    px = np.asarray(img.convert('RGB'), float)
    d = px - BG
    best_res = np.full(px.shape[:2], np.inf)
    masks = {k: np.zeros(px.shape[:2]) for k in ELEMENTS}
    alphas = {}
    for name, col in ELEMENTS.items():
        v = col - BG
        a = np.clip((d @ v) / (v @ v), 0, 1)
        res = np.linalg.norm(d - a[..., None] * v, axis=-1)
        alphas[name] = (a, res)
    for name, (a, res) in alphas.items():
        better = res < best_res
        best_res = np.where(better, res, best_res)
        for k in masks:
            masks[k] = np.where(better, a if k == name else 0, masks[k])
    return {k: Image.fromarray((m * 255).astype(np.uint8)) for k, m in masks.items()}


def up(mask):
    # 4x upscale: smooth the pixel steps first, then restore a crisp but anti-aliased edge.
    big = mask.resize((SIZE, SIZE), Image.BICUBIC).filter(ImageFilter.GaussianBlur(2.2))
    arr = np.asarray(big, float) / 255
    arr = np.clip((arr - 0.5) * 2.4 + 0.5, 0, 1)
    return Image.fromarray((arr * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))


def solid(color, mask):
    layer = Image.new('RGBA', (SIZE, SIZE), color + (0,))
    layer.putalpha(mask)
    return layer


def render(primary, halo, masks):
    # Black ground with a soft halo of the theme colour behind the figure.
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    dist = np.sqrt((xx - SIZE * 0.5) ** 2 + (yy - SIZE * 0.42) ** 2) / (SIZE * 0.55)
    glow = np.clip(1 - dist, 0, 1) ** 2 * 0.32
    ground = np.stack([5 + glow * halo[0], 5 + glow * halo[1], 5 + glow * halo[2]], -1)
    canvas = Image.fromarray(np.clip(ground, 0, 255).astype(np.uint8)).convert('RGBA')

    union = Image.fromarray(np.maximum.reduce([np.asarray(m) for m in masks.values()]))
    for radius, strength in ((38, 0.55), (14, 0.85)):  # neon glow, wide then tight
        g = union.filter(ImageFilter.GaussianBlur(radius))
        g = Image.fromarray(np.clip(np.asarray(g, float) * strength, 0, 255).astype(np.uint8))
        canvas = Image.alpha_composite(canvas, solid(halo, g))
    sun_glow = masks['sun'].filter(ImageFilter.GaussianBlur(70))  # rayonnement du soleil
    sun_glow = Image.fromarray(np.clip(np.asarray(sun_glow, float) * 1.4, 0, 255).astype(np.uint8))
    canvas = Image.alpha_composite(canvas, solid(halo, sun_glow))

    accent_soft = tuple(int(c * 0.85 + 255 * 0.15) for c in primary)
    canvas = Image.alpha_composite(canvas, solid(accent_soft, masks['sun']))
    canvas = Image.alpha_composite(canvas, solid(primary, masks['rungs']))
    white = tuple(int(255 * 0.92 + c * 0.08) for c in primary)
    canvas = Image.alpha_composite(canvas, solid(white, masks['white']))
    return canvas.convert('RGB')


WORDMARK = 'VISOLIS'
FONT = 'node_modules/@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'
TEXT_TOP = 188  # source rows (256 px) below the DNA: the old wordmark, removed
SUN_SCALE, SUN_LIFT = 1.18, 14  # VISOLIS = « la force du soleil » : soleil plus présent


def wordmark_mask(width=540, cap=70, center_y=806):
    from PIL import ImageDraw, ImageFont
    font = ImageFont.truetype(FONT, 100)
    scale = cap / font.getbbox('V')[3]
    font = ImageFont.truetype(FONT, int(100 * scale))
    widths = [font.getbbox(c)[2] - font.getbbox(c)[0] for c in WORDMARK]
    gap = (width - sum(widths)) / (len(WORDMARK) - 1)
    mask = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(mask)
    x = (SIZE - width) / 2
    for c, w in zip(WORDMARK, widths):
        d.text((x - font.getbbox(c)[0], center_y), c, font=font, fill=255)
        x += w + gap
    # vertically centre the drawn line on center_y
    arr = np.asarray(mask); rows = np.where(arr.max(1) > 0)[0]
    shift = int(center_y - (rows.min() + rows.max()) / 2)
    return mask.transform(mask.size, Image.AFFINE, (1, 0, 0, 0, 1, -shift)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.6))


def scale_about(mask, scale, cx, cy, lift):
    # Inverse affine: output (x, y) samples input ((x - cx) / s + cx, (y + lift - cy) / s + cy).
    s = scale
    return mask.transform(mask.size, Image.AFFINE, (1 / s, 0, cx - cx / s, 0, 1 / s, cy - (cy - lift) / s), Image.BICUBIC)


def build_masks():
    """1024 px masks: logo figure + bigger sun + VISOLIS wordmark."""
    raw = unmix(Image.open(SRC))
    for k in raw:  # drop the old wordmark
        a = np.asarray(raw[k]).copy(); a[TEXT_TOP:] = 0; raw[k] = Image.fromarray(a)
    masks = {k: up(m) for k, m in raw.items()}
    sun = np.asarray(masks['sun']); ys, xs = np.where(sun > 60)
    masks['sun'] = scale_about(masks['sun'], SUN_SCALE, xs.mean(), ys.mean(), SUN_LIFT)
    masks['white'] = Image.fromarray(np.maximum(np.asarray(masks['white']), np.asarray(wordmark_mask())))
    return masks


if __name__ == '__main__':
    masks = build_masks()
    for name, (primary, halo) in PALETTES.items():
        logo = render(primary, halo, masks)
        logo.save(f'assets/logo/logo-{name}.png', optimize=True)
        print('wrote', f'assets/logo/logo-{name}.png')
        if name == 'braise':
            # Android adaptive icon: launchers crop to a circle/squircle, so keep
            # the whole logo inside the central safe zone (about 62 %).
            inner = int(SIZE * 0.62)
            adaptive = Image.new('RGB', (SIZE, SIZE), (5, 5, 5))
            adaptive.paste(logo.resize((inner, inner), Image.LANCZOS), ((SIZE - inner) // 2, (SIZE - inner) // 2))
            adaptive.save('assets/logo/logo-braise-adaptive.png', optimize=True)
            print('wrote assets/logo/logo-braise-adaptive.png')
