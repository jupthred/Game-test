#!/usr/bin/env python3
"""
Importiert ein extern gestaltetes Spritesheet (z. B. JPEG mit weißem Hintergrund)
in das Format des Spiels.

Voraussetzung: Das Bild folgt der Anordnung des Referenz-Sheets
(assets/themes/classic/spritesheet.png), darf aber beliebig skaliert sein.
Jeder Frame wird an seiner skalierten Position ausgeschnitten, der Hintergrund
von außen her freigestellt (weiße Flächen innerhalb der Grafik bleiben erhalten),
die Kanten werden entsäumt und das Ergebnis in das Frame-Rechteck des
Referenz-Layouts eingepasst. Dadurch passt dieselbe JSON-Struktur.

Aufruf:
  python3 tools/import_spritesheet.py QUELLE.jpg THEME_ID [--keep bullet,…]

  --keep  Frames, die aus dem Referenz-Sheet übernommen statt importiert werden
          (z. B. wenn die Vorlage an dieser Stelle etwas Unpassendes zeigt)

Ergebnis: assets/themes/THEME_ID/spritesheet.png und spritesheet.json
Benötigt: Pillow, numpy
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
REFERENCE = ROOT / 'assets' / 'themes' / 'classic'

# Ab wann ein Pixel als Hintergrund gilt: hell und wenig gesättigt
BG_MIN_BRIGHTNESS = 228
BG_MAX_SATURATION = 28
# Zusätzlicher Rand beim Ausschneiden (Pixel im Quellbild), falls die Grafik etwas übersteht
CROP_MARGIN = 6
# Anteil des Ziel-Rechtecks, den die Grafik maximal füllt
FIT = 0.96


def shift(mask, dy, dx):
    out = np.zeros_like(mask)
    h, w = mask.shape
    out[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = mask[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]
    return out


def dilate(mask):
    return mask | shift(mask, 1, 0) | shift(mask, -1, 0) | shift(mask, 0, 1) | shift(mask, 0, -1)


def background_mask(rgb):
    """Hintergrund = helle, ungesättigte Pixel, die vom Rand aus erreichbar sind."""
    mx = rgb.max(axis=2).astype(int)
    mn = rgb.min(axis=2).astype(int)
    candidate = (mn >= BG_MIN_BRIGHTNESS) & ((mx - mn) <= BG_MAX_SATURATION)
    reached = np.zeros_like(candidate)
    reached[0, :] = candidate[0, :]
    reached[-1, :] = candidate[-1, :]
    reached[:, 0] = candidate[:, 0]
    reached[:, -1] = candidate[:, -1]
    while True:
        grown = dilate(reached) & candidate
        if (grown == reached).all():
            return reached
        reached = grown


def cut_out(rgb):
    """Liefert RGBA mit freigestelltem Hintergrund und entsäumten Kanten."""
    bg = background_mask(rgb)
    alpha = np.where(bg, 0.0, 1.0)

    # Kantenband: Vordergrundpixel bis 2 px neben dem Hintergrund werden je nach Helligkeit
    # teilweise transparent (Antialiasing gegen Weiß), ihre Farbe wird von Weiß befreit.
    near = dilate(dilate(bg)) & ~bg
    lightness = rgb.min(axis=2) / 255.0
    edge_alpha = np.clip((1.0 - lightness) / 0.55, 0.0, 1.0)
    alpha = np.where(near, np.minimum(alpha, edge_alpha), alpha)

    a = alpha[..., None]
    color = rgb / 255.0
    safe = np.maximum(a, 1e-3)
    decontaminated = np.clip((color - (1.0 - a)) / safe, 0.0, 1.0)
    color = np.where(a > 0, decontaminated, 0.0)
    out = np.concatenate([color, a], axis=2)
    return (out * 255 + 0.5).astype(np.uint8)


def import_sheet(source, theme_id, keep):
    ref_data = json.loads((REFERENCE / 'spritesheet.json').read_text())
    ref_image = Image.open(REFERENCE / ref_data['meta']['image']).convert('RGBA')
    src = Image.open(source).convert('RGB')
    sheet_w, sheet_h = ref_data['meta']['size']['w'], ref_data['meta']['size']['h']
    sx, sy = src.width / sheet_w, src.height / sheet_h
    src_arr = np.asarray(src)

    out = Image.new('RGBA', (sheet_w, sheet_h), (0, 0, 0, 0))
    report = []
    for name, info in ref_data['frames'].items():
        f = info['frame']
        if name in keep:
            out.paste(ref_image.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])), (f['x'], f['y']))
            report.append(f'{name}: aus Referenz übernommen')
            continue

        x0 = max(int(f['x'] * sx) - CROP_MARGIN, 0)
        y0 = max(int(f['y'] * sy) - CROP_MARGIN, 0)
        x1 = min(int((f['x'] + f['w']) * sx) + CROP_MARGIN, src.width)
        y1 = min(int((f['y'] + f['h']) * sy) + CROP_MARGIN, src.height)
        rgba = cut_out(src_arr[y0:y1, x0:x1].astype(np.float64))

        ys, xs = np.nonzero(rgba[..., 3] > 8)
        if len(xs) == 0:
            report.append(f'{name}: LEER – Referenz übernommen')
            out.paste(ref_image.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])), (f['x'], f['y']))
            continue
        piece = Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')

        scale = min(f['w'] * FIT / piece.width, f['h'] * FIT / piece.height)
        size = (max(1, round(piece.width * scale)), max(1, round(piece.height * scale)))
        piece = piece.resize(size, Image.LANCZOS)
        ox = f['x'] + (f['w'] - size[0]) // 2
        oy = f['y'] + (f['h'] - size[1]) // 2
        out.alpha_composite(piece, (ox, oy))
        report.append(f'{name}: {xs.max() - xs.min() + 1}×{ys.max() - ys.min() + 1} px → {size[0]}×{size[1]} px')

    target = ROOT / 'assets' / 'themes' / theme_id
    target.mkdir(parents=True, exist_ok=True)
    out.save(target / 'spritesheet.png', optimize=True)
    data = dict(ref_data)
    data['meta'] = {**ref_data['meta'], 'image': 'spritesheet.png', 'source': Path(source).name}
    (target / 'spritesheet.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    print('\n'.join(report))
    print(f'geschrieben: {target.relative_to(ROOT)}/spritesheet.png, spritesheet.json')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('source')
    parser.add_argument('theme_id')
    parser.add_argument('--keep', default='', help='kommagetrennte Frame-Namen aus der Referenz')
    args = parser.parse_args()
    import_sheet(args.source, args.theme_id, {k for k in args.keep.split(',') if k})
