#!/usr/bin/env python3
"""Optimasi foto assets_page_slide -> WebP 1920px (ringan untuk Page Slides Animation)."""
import os, glob
from PIL import Image, ImageOps

SRC = "_backup_assets_page_slide_original"          # sumber (asli)
DST = "public/assets/assets_page_slide"             # tujuan (yang dipakai website)
LONG_SIDE = 1920                                    # target sisi panjang
QUALITY = 78                                        # kualitas WebP
METHOD = 6                                          # 6 = kompresi maksimal (paling lambat)

os.makedirs(DST, exist_ok=True)
files = sorted(glob.glob(os.path.join(SRC, "*.jpeg")),
               key=lambda p: int(''.join(filter(str.isdigit, os.path.basename(p))) or 0))

total_in = total_out = 0
rows = []
for path in files:
    name = os.path.splitext(os.path.basename(path))[0] + ".webp"
    out = os.path.join(DST, name)
    in_size = os.path.getsize(path)

    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)            # hormati orientasi foto
        w, h = im.size
        scale = LONG_SIDE / max(w, h)
        if scale < 1:
            im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        if im.mode != "RGB":
            im = im.convert("RGB")
        im.save(out, "WEBP", quality=QUALITY, method=METHOD, optimize=True)

    out_size = os.path.getsize(out)
    total_in += in_size
    total_out += out_size
    rows.append((name, in_size, out_size))

print(f"{'FILE':<14}{'ASLI':>12}{'WEBP':>12}{'HEMAT':>9}")
print("-" * 47)
for name, i, o in rows:
    print(f"{name:<14}{i/1024/1024:>10.2f}MB{o/1024:>10.0f}KB{(1-o/i)*100:>8.1f}%")
print("-" * 47)
print(f"{'TOTAL':<14}{total_in/1024/1024:>10.1f}MB{total_out/1024/1024:>10.2f}MB{(1-total_out/total_in)*100:>8.1f}%")
print(f"\n{len(rows)} file diproses.")
