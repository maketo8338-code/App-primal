"""Convertit le modèle OBJ du téléphone en un binaire compact pour le site (site/models/phone.bin + phone.json).

Usage : python3 -I tools/convert-phone.py "chemin/modele.obj" site/models

- Ignore le groupe « Cube » (grille d'écouteur de 211 000 triangles, cachée sous l'encoche).
- Regroupe les pièces par rôle : frame, glassFront, glassBack, screen, lens, flash.
- Recentre, met à l'échelle (hauteur = 4.6 unités), oriente l'écran vers +z.
- Positions en Float32, normales en Int8, UV planaires pour l'écran, indices en Uint16/Uint32.
"""
import json, struct, sys
from array import array

src, out = sys.argv[1], sys.argv[2]
P, N = [], []
groups = {}          # rôle -> liste de triangles [(vi, ni), ...]
obj, mat, last_named = '?', 'default', 'Metallic'

def role_for(mat_name, obj_name):
    m = mat_name if mat_name != 'default' else last_named
    if obj_name == 'Cube': return None
    return {'Metallic': 'frame', 'schwarz glass': 'glass', 'Mat.2': 'screen', 'Mat': 'lens', 'Mat.6': 'flash'}.get(m, 'frame')

def ear_clip(vs):
    """Découpe un polygone (éventuellement concave) en triangles, projeté sur son plan."""
    pts = [P[v] for v, _ in vs]
    nx = ny = nz = 0.0                                   # normale de Newell
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1])
    ax = max(range(3), key=lambda k: abs((nx, ny, nz)[k]))
    u, w = [(1, 2), (2, 0), (0, 1)][ax]
    sign = 1 if (nx, ny, nz)[ax] > 0 else -1
    q = [(p[u], p[w]) for p in pts]
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    def inside(p, a, b, c):
        d1, d2, d3 = cross(a, b, p), cross(b, c, p), cross(c, a, p)
        return (d1 >= 0 and d2 >= 0 and d3 >= 0) if sign > 0 else (d1 <= 0 and d2 <= 0 and d3 <= 0)
    idx = list(range(len(vs))); out = []; guard = 0
    while len(idx) > 3 and guard < 10000:
        guard += 1; found = False
        for k in range(len(idx)):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % len(idx)]
            if cross(q[i0], q[i1], q[i2]) * sign <= 1e-12: continue
            if any(inside(q[j], q[i0], q[i1], q[i2]) for j in idx if j not in (i0, i1, i2) and q[j] not in (q[i0], q[i1], q[i2])): continue
            out.append((vs[i0], vs[i1], vs[i2])); idx.pop(k); found = True; break
        if not found:
            for k in range(1, len(idx) - 1): out.append((vs[idx[0]], vs[idx[k]], vs[idx[k + 1]]))
            return out
    out.append(tuple(vs[i] for i in idx))
    return out

with open(src, encoding='latin-1') as fh:
    for line in fh:
        if line.startswith('v '): P.append(tuple(map(float, line.split()[1:4])))
        elif line.startswith('vn'): N.append(tuple(map(float, line.split()[1:4])))
        elif line.startswith(('o ', 'g ')): obj = line[2:].strip()
        elif line.startswith('usemtl'):
            mat = line.split(None, 1)[1].strip()
            if mat != 'default': last_named = mat
        elif line.startswith('f '):
            role = role_for(mat, obj)
            if role is None: continue
            vs = []
            for t in line.split()[1:]:
                parts = t.split('/')
                vi = int(parts[0]); vi = vi - 1 if vi > 0 else len(P) + vi
                ni = int(parts[2]) if len(parts) > 2 and parts[2] else 0
                ni = ni - 1 if ni > 0 else (len(N) + ni if ni < 0 else -1)
                vs.append((vi, ni))
            tri = groups.setdefault(role, [])
            if len(vs) <= 4:
                for i in range(1, len(vs) - 1): tri.append((vs[0], vs[i], vs[i + 1]))
            else:
                tri.extend(ear_clip(vs))

# boîte englobante sur les pièces conservées
used = {v for tris in groups.values() for t in tris for v, _ in t}
mn = [min(P[i][k] for i in used) for k in range(3)]
mx = [max(P[i][k] for i in used) for k in range(3)]
c = [(mn[k] + mx[k]) / 2 for k in range(3)]
s = 4.6 / (mx[1] - mn[1])
zmid = c[2]

def xf(p):   # miroir en z (écran vers +z, appareil photo à gauche vu de dos) + échelle
    return ((p[0] - c[0]) * s, (p[1] - c[1]) * s, -(p[2] - c[2]) * s)
def xn(n): return (n[0], n[1], -n[2])

# le verre est séparé en avant / arrière selon sa position
split = {}
for role, tris in groups.items():
    if role != 'glass': split.setdefault(role, []).extend(tris); continue
    for t in tris:
        z = sum(P[v][2] for v, _ in t) / 3
        split.setdefault('glassBack' if z > zmid else 'glassFront', []).append(t)

meta, blob = {'scale': s, 'meshes': []}, bytearray()
for role, tris in split.items():
    index, verts, idx = {}, [], array('I')
    flat_dir = {'screen': 1, 'glassFront': 1, 'glassBack': -1}.get(role)
    for t in tris:
        tri = [t[0], t[2], t[1]]             # ordre inversé : le miroir retourne les faces
        if flat_dir:                          # faces planes : normale et sens forcés vers l'extérieur
            a, b, c3 = (xf(P[v]) for v, _ in tri)
            e1 = [b[i] - a[i] for i in range(3)]; e2 = [c3[i] - a[i] for i in range(3)]
            ng = (e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0])
            ln = (ng[0] ** 2 + ng[1] ** 2 + ng[2] ** 2) ** .5 or 1
            if abs(ng[2] / ln) > .9:
                if (ng[2] > 0) != (flat_dir > 0): tri = [tri[0], tri[2], tri[1]]
                tri = [(v, -2 if flat_dir > 0 else -3) for v, _ in tri]
        for key in tri:
            if key not in index: index[key] = len(verts); verts.append(key)
            idx.append(index[key])
    pos = array('f'); nor = array('b'); uv = array('f')
    for vi, ni in verts:
        p = xf(P[vi]); pos.extend(p)
        n = xn(N[ni]) if ni >= 0 else ((0, 0, -1) if ni == -3 else (0, 0, 1))
        nor.extend(int(max(-127, min(127, round(v * 127)))) for v in n)
    if role == 'screen':                       # UV planaires sur la face avant
        xs = [pos[i] for i in range(0, len(pos), 3)]; ys = [pos[i] for i in range(1, len(pos), 3)]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        for x, y in zip(xs, ys): uv.extend(((x - x0) / (x1 - x0), (y - y0) / (y1 - y0)))
        meta['screenSize'] = [x1 - x0, y1 - y0]
    zs = sorted(pos[i] for i in range(2, len(pos), 3))
    if role == 'screen': meta['frontZ'] = zs[-1]
    if role == 'glassBack': meta['backZ'] = zs[len(zs) // 2]
    big = len(verts) > 65535
    ib = idx.tobytes() if big else array('H', idx).tobytes()
    entry = {'role': role, 'count': len(verts), 'indexCount': len(idx), 'index32': big}
    for name, arr in (('position', pos.tobytes()), ('normal', nor.tobytes()), ('uv', uv.tobytes() if len(uv) else b''), ('index', ib)):
        while len(blob) % 4: blob.append(0)
        if arr: entry[name] = [len(blob), len(arr)]; blob.extend(arr)
    meta['meshes'].append(entry)
    print(role, 'triangles', len(idx) // 3, 'sommets', len(verts))

meta['size'] = [(mx[0] - mn[0]) * s, (mx[1] - mn[1]) * s, (mx[2] - mn[2]) * s]
open(f'{out}/phone.bin', 'wb').write(blob)
json.dump(meta, open(f'{out}/phone.json', 'w'))
print('taille', len(blob) // 1024, 'Ko', meta['size'])
