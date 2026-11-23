"""Génère des textures de nuages « peints » (style plafond baroque) pour le site PRIMAL.
Usage : python3 tools/gen-clouds.py site/img"""
import numpy as np, sys
from PIL import Image, ImageFilter

def _gauss(a, s):  # flou gaussien séparable en numpy
    k = np.exp(-np.arange(-3 * s, 3 * s + 1) ** 2 / (2 * s * s)); k /= k.sum()
    a = np.apply_along_axis(lambda m: np.convolve(m, k, 'same'), 1, a)
    return np.apply_along_axis(lambda m: np.convolve(m, k, 'same'), 0, a)

def fbm(w, h, base, octaves, rng):
    out, amp, tot = np.zeros((h, w), np.float32), 1.0, 0
    for o in range(octaves):
        cell = max(3, base >> o)
        gw, gh = w // cell + 4, h // cell + 4
        g = Image.fromarray((rng.random((gh, gw)) * 255).astype(np.uint8)).resize((gw * cell, gh * cell), Image.BICUBIC)
        out += np.asarray(g, np.float32)[cell:cell + h, cell:cell + w] / 255 * amp
        tot += amp; amp *= 0.5
    return out / tot

def blobs(dens, n, rmin, rmax, accept, rng):
    h, w = dens.shape
    k = 0
    while k < n:
        x, y = rng.random() * w, rng.random() * h
        if not accept(x, y): continue
        rad = rng.uniform(rmin, rmax) * w
        x0, x1, y0, y1 = int(max(0, x - 3 * rad)), int(min(w, x + 3 * rad)), int(max(0, y - 3 * rad)), int(min(h, y + 3 * rad))
        if x1 <= x0 or y1 <= y0: continue
        yy, xx = np.mgrid[y0:y1, x0:x1]
        dens[y0:y1, x0:x1] += np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * rad ** 2)) * rng.uniform(.6, 1)
        k += 1

def render(w, h, seed, out, ring=True):
    rng = np.random.default_rng(seed)
    base = np.zeros((h, w), np.float32)
    def zone(x, y):
        u, v = (x / w - .5) * 1.5, (y / h - .5) * 1.1
        return np.hypot(u, v) > .34 if ring else rng.random() < (y / h) ** 1.5 + .15
    blobs(base, 45, .05, .09, zone, rng)
    base /= base.max()
    near = lambda x, y: base[int(y), int(x)] > .25 and rng.random() < base[int(y), int(x)]
    hgt = base.copy()
    blobs(hgt, 220, .02, .04, near, rng)
    blobs(hgt, 160, .012, .022, near, rng)
    hgt = hgt / np.percentile(hgt, 99) + (fbm(w, h, 140, 3, rng) - .5) * .12
    c = np.clip((_gauss(hgt, 4) - .22) / .38, 0, 1); c = c * c * (3 - 2 * c)
    hs = _gauss(hgt, 9) * 140
    gy, gx = np.gradient(hs)
    nrm = np.sqrt(gx ** 2 + gy ** 2 + 1)
    L = np.array([-.55, -.65, .52]); L /= np.linalg.norm(L)
    lam = np.clip(((-gx * L[0] - gy * L[1] + L[2]) / nrm + .35) / 1.35, 0, 1)
    val = np.clip(.05 + 1.0 * lam ** 1.8 * (.6 + .4 * np.clip(hgt, 0, 1.2)), 0, 1)
    stops = np.array([[30, 14, 9], [74, 38, 22], [132, 78, 44], [196, 142, 92], [236, 208, 164], [255, 242, 218]], np.float32)
    t = val * (len(stops) - 1)
    i = np.clip(t.astype(int), 0, len(stops) - 2); f = (t - i)[..., None]
    cloud = stops[i] * (1 - f) + stops[i + 1] * f
    yy, xx = np.mgrid[0:h, 0:w]
    u, v = xx / w - .5, yy / h - .5
    sky = np.array([10, 5, 4], np.float32) + np.exp(-((u * 1.3) ** 2 + ((v - .06) * 1.2) ** 2) / .06)[..., None] * np.array([120, 46, 6], np.float32)
    img = sky * (1 - c[..., None]) + cloud * c[..., None]
    img *= (1 - .65 * np.clip(np.hypot(u, v) * 1.4, 0, 1) ** 2.2)[..., None]
    img += rng.normal(0, 3, (h, w, 1))
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(out, quality=80, optimize=True, progressive=True)

if __name__ == '__main__':
    d = sys.argv[1]
    render(1920, 1200, 7, f'{d}/nuages-hero.jpg')
    render(1600, 1000, 21, f'{d}/nuages-2.jpg', ring=False)
