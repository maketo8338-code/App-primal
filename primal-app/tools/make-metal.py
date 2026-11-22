"""Generates the liquid-metal textures of the « Métal » themes (Or, Chrome).

Procedural (no source image): a domain-warped smooth noise gives a flowing
height field; its normals reflect a soft « studio » light, which gives the
dark folds and bright highlights of molten metal. Run from primal-app/:
    python3 tools/make-metal.py   →  assets/metal/metal-or.jpg, metal-chrome.jpg
"""
import numpy as np
from PIL import Image

W, H = 720, 1440
rng = np.random.default_rng(7)

def smooth_noise(w, h, scale, seed):
    r = np.random.default_rng(seed).standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.fftfreq(w)[None, :]
    f = np.exp(-((fx * w / scale) ** 2 + (fy * h / scale) ** 2) * 0.5)
    n = np.real(np.fft.ifft2(np.fft.fft2(r) * f))
    return (n - n.mean()) / (n.std() + 1e-9)

def field():
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    w1 = smooth_noise(W, H, 2.5, 1); w2 = smooth_noise(W, H, 2.5, 2)
    # Flow mostly along a diagonal, like poured metal.
    u = (xs * 0.8 + ys * 0.5) / W; v = (ys * 0.8 - xs * 0.5) / W
    u2 = u + 0.55 * w1; v2 = v + 0.55 * w2
    h = (np.sin(u2 * 3.4 + 1.4 * np.sin(v2 * 1.9)) * 0.65 + np.sin(v2 * 2.2 + u2 * 1.3) * 0.35)
    h += 0.18 * smooth_noise(W, H, 5, 3)
    return h

def shade(h):
    gy, gx = np.gradient(h)
    k = 55.0
    nx, ny, nz = -gx * k, -gy * k, np.ones_like(h)
    norm = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2); nx /= norm; ny /= norm; nz /= norm
    # Reflected « studio » environment: bright soft bands + a key light.
    e = 0.5 + 0.5 * (nx * 0.55 - ny * 0.85)
    env = 0.5 + 0.5 * np.sin(e * np.pi * 2.4 + 0.6)
    env = env ** 2.2
    L = np.array([-0.35, -0.55, 0.76]); L = L / np.linalg.norm(L)
    spec = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1) ** 60
    lum = np.clip(0.05 + 0.85 * env + 0.9 * spec, 0, 1)
    return lum

def colorize(lum, stops):
    # stops: list of (position, (r, g, b)) along luminance.
    out = np.zeros(lum.shape + (3,), np.float32)
    pos = [p for p, _ in stops]; cols = np.array([c for _, c in stops], np.float32)
    for ch in range(3):
        out[..., ch] = np.interp(lum, pos, cols[:, ch])
    return out

h = field(); lum = shade(h)
PALETTES = {
    'or': [(0.0, (8, 5, 2)), (0.25, (70, 44, 10)), (0.55, (176, 122, 38)), (0.8, (236, 190, 98)), (1.0, (255, 246, 214))],
    'chrome': [(0.0, (6, 6, 8)), (0.25, (48, 51, 58)), (0.55, (128, 134, 146)), (0.8, (205, 210, 220)), (1.0, (255, 255, 255))],
}
for name, stops in PALETTES.items():
    img = colorize(lum, stops)
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(f'assets/metal/metal-{name}.jpg', quality=84, optimize=True, progressive=True)
    print('wrote', f'assets/metal/metal-{name}.jpg')
