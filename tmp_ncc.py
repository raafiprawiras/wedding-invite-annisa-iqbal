import numpy as np
from PIL import Image

REF = Image.open("public/assets/aset_baru_page3/Page Tiga.png").convert("RGB")
ref = np.array(REF).astype(np.float32)
RH, RW = ref.shape[:2]
cream = np.clip(ref.mean(axis=2), 0, 255)

def tpl(path):
    im = Image.open(path).convert("RGBA")
    a = np.array(im).astype(np.float32)
    al = a[:, :, 3] / 255.0
    return a[:, :, :3].mean(axis=2), al, im.size

def ncc(win, temp_alpha, gray_mask, search_x, search_y, name):
    """masked correlation: template = alpha mask (soft); signal = cream mask"""
    h, w = temp_alpha.shape
    best = (-1, 0, 0)
    for y in range(max(0, search_y[0]), min(RH - h, search_y[1])):
        pass
    return None

# FFT-based full-res masked correlation in one pass per asset
def match(path, tmul_gray, ylo, yhi, xlo=0, xhi=None):
    g, al, (W, H) = tpl(path)
    if tmul_gray:
        # opaque template: correlate grayscale with ref luminance
        t = g - g.mean()
    else:
        t = al - al.mean()
    th = al.sum()  # mass
    win_x = slice(xlo, xhi or RW - W + 1)
    valid_h = yhi
    y0, y1 = max(0, ylo), min(RH - H + 1, yhi)
    # correlate t with cream mask over rows y0..y1 only
    S = cream * 1.0
    fh, fw = RH + H, RW + W
    F = np.fft.rfft2(S, (fh, fw))
    T = np.fft.rfft2(np.flipud(np.fliplr(t)), (fh, fw))
    C = np.fft.irfft2(F * T, (fh, fw))
    sub = C[y0:y1, win_x.start:win_x.stop]
    iy, ix = np.unravel_index(np.argmax(sub), sub.shape)
    return int(y0 + iy), int(win_x.start + ix), float(sub[iy, ix])

jobs = [
    ("Frame Tengah.png", True, 200, 800),
    ("ai_logo.png", False, 500, 1400),
    ("TGL Akad.png", False, 1750, 2200),
    ("Akad - Resepsi.png", False, 1950, 2600),
    ("AlamatAkad.png", False, 2300, 2750),
    ("Location.png", True, 2500, 3000),
    ("TGL Ngunduh.png", False, 2850, 3250),
    ("NgunduhMantu.png", False, 3100, 3700),
    ("AlamatMantu.png", False, 3400, 3900),
]
res = {}
for name, opaque, y0, y1 in jobs:
    y, x, s = match(f"public/assets/aset_baru_page3/{name}", opaque, y0, y1)
    res[name] = (x, y, s)
    print(f"{name:24s} box=({x},{y})  score={s/1e6:.3f}M")
print()
print(" железо: frame expect ink 0..1409 full; logo ink 7..229; Location ink full")
for n, (x, y, s) in res.items():
    print(n, "ink x", x, "..", x, "=box left", x, "top", y)
