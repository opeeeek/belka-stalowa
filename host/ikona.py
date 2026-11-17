"""Generuje ikonę programu BelkaStal (dwuteownik) – host/ikona.ico i host/ikona.png.
Uruchomienie: python3 host/ikona.py  (wymaga Pillow). Zasób Windows: rsrc -ico host/ikona.ico -o host/rsrc_windows_amd64.syso
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def ishape(cx, cy, b, h, tf, tw):
    """Wielokąt dwuteownika (środek cx, cy; szerokość b, wysokość h, grubość pasa tf, środnika tw)."""
    x0, x1, y0, y1 = cx - b / 2, cx + b / 2, cy - h / 2, cy + h / 2
    return [(x0, y0), (x1, y0), (x1, y0 + tf), (cx + tw / 2, y0 + tf), (cx + tw / 2, y1 - tf), (x1, y1 - tf),
            (x1, y1), (x0, y1), (x0, y1 - tf), (cx - tw / 2, y1 - tf), (cx - tw / 2, y0 + tf), (x0, y0 + tf)]


def draw(size):
    k = 8                                    # nadpróbkowanie – wygładzone krawędzie
    S = size * k
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # tło: zaokrąglony kwadrat z gradientem
    r = round(0.2 * S)
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=255)
    grad = Image.new('RGBA', (S, S))
    gd = ImageDraw.Draw(grad)
    top, bot = (46, 112, 206, 255), (19, 52, 112, 255)
    for y in range(S):
        gd.line([(0, y), (S, y)], fill=lerp(top, bot, y / (S - 1)))
    im.paste(grad, (0, 0), mask)
    small = size <= 24
    # dwuteownik: przód jasny, wyciągnięcie (głębokość) ciemniejsze, obrys
    b, h = 0.60 * S, 0.62 * S
    tf, tw = (0.15 if small else 0.125) * S, (0.16 if small else 0.13) * S
    cx, cy = (0.5 if small else 0.45) * S, (0.5 if small else 0.55) * S
    if not small:
        dx, dy = 0.11 * S, -0.085 * S
        n = 60
        for i in range(n, 0, -1):            # bryła: kolejne przesunięte kontury (ciemniej z tyłu)
            t = i / n
            col = lerp((128, 146, 174, 255), (66, 82, 108, 255), t)
            d.polygon(ishape(cx + dx * t, cy + dy * t, b, h, tf, tw), fill=col)
    front = ishape(cx, cy, b, h, tf, tw)
    d.polygon(front, fill=(236, 241, 248, 255))
    # połysk na pasie górnym i krawędź czerwona (akcent jak w nagłówku programu)
    d.rectangle([cx - b / 2, cy - h / 2, cx + b / 2, cy - h / 2 + max(k, 0.035 * S)], fill=(214, 64, 58, 255))
    d.line(front + [front[0]], fill=(16, 26, 44, 255), width=max(k, round((0.03 if small else 0.016) * S)))
    return im.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    sizes = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]
    imgs = [draw(s) for s in sizes]
    imgs[-1].save(os.path.join(HERE, 'ikona.png'))
    imgs[-1].save(os.path.join(HERE, 'ikona.ico'), format='ICO', sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
    draw(32).save(os.path.join(HERE, 'ikona32.png'))
    print('ikona.ico', [im.size for im in imgs])
