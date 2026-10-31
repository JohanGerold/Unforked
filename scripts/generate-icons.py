"""Export the existing Unforked branch glyph to Chrome's required PNG sizes."""
from pathlib import Path
import math
import struct
import zlib

root = Path(__file__).resolve().parents[1] / 'apps' / 'extension' / 'public' / 'icons'
root.mkdir(parents=True, exist_ok=True)

def segment_distance(x, y, a, b):
    dx, dy = b[0]-a[0], b[1]-a[1]
    t = max(0, min(1, ((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)))
    return math.hypot(x-a[0]-t*dx, y-a[1]-t*dy)

def chunk(name, data):
    return struct.pack('!I', len(data)) + name + data + struct.pack('!I', zlib.crc32(name+data) & 0xffffffff)

for size in (16, 32, 48, 128):
    rows = bytearray()
    for py in range(size):
        rows.append(0)
        for px in range(size):
            samples = []
            for sy in (0.25, 0.75):
                for sx in (0.25, 0.75):
                    x, y = (px+sx)*24/size, (py+sy)*24/size
                    ink = segment_distance(x,y,(7,7),(7,17)) < .85 or segment_distance(x,y,(17,7),(17,10)) < .85 or segment_distance(x,y,(17,10),(7,15)) < .85
                    for cx,cy in ((7,5),(17,5),(7,19)):
                        d = math.hypot(x-cx,y-cy)
                        if d < 2.5: ink = d > 1.0
                    samples.append((126,231,135,255) if ink else (22,27,34,255))
            rows.extend(round(sum(c[i] for c in samples)/len(samples)) for i in range(4))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR',struct.pack('!IIBBBBB',size,size,8,6,0,0,0)) + chunk(b'IDAT',zlib.compress(rows)) + chunk(b'IEND',b'')
    (root / f'icon-{size}.png').write_bytes(png)
print('Exported 16, 32, 48 and 128 px branch icons.')
