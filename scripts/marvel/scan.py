"""Kaynak Reels taraması: her video için 8 kare + süre + sahne kesimleri (montaj planı için)."""
import json, os, subprocess, urllib.request
from PIL import Image, ImageDraw, ImageFont
H = os.path.dirname(__file__); OUT = os.path.join(H, os.environ.get('SCAN_OUT', 'scan')); SRC = os.path.join(H, 'src'); os.makedirs(OUT, exist_ok=True); os.makedirs(SRC, exist_ok=True)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
info = []
for it in json.load(open(os.path.join(H, os.environ.get('SCAN_SOURCES', 'sources.json')))):
    p = os.path.join(SRC, f"{it['n']}.mp4")
    if not os.path.exists(p): urllib.request.urlretrieve(it['url'], p)
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=width,height,r_frame_rate,codec_name', '-of', 'json', p], capture_output=True, text=True).stdout)
    d = float(pr['format']['duration']); v = [s for s in pr['streams'] if 'width' in s][0]
    cuts = subprocess.run(['ffmpeg', '-i', p, '-vf', "select='gt(scene,0.35)',showinfo", '-f', 'null', '-'], capture_output=True, text=True).stderr
    times = [round(float(x.split('pts_time:')[1].split()[0]), 2) for x in cuts.splitlines() if 'pts_time:' in x]
    info.append({'n': it['n'], 'title': it.get('title'), 'dur': round(d, 2), 'w': v['width'], 'h': v['height'], 'codec': v['codec_name'], 'cuts': times})
    W, Hh = 180, 320; sheet = Image.new('RGB', (W * 8 + 90, Hh + 40), (255, 255, 255)); dr = ImageDraw.Draw(sheet)
    dr.text((5, 5), f"#{it['n']} {it.get('title', '')}  {d:.1f}s  {v['width']}x{v['height']}  cuts:{len(times)}", fill=(200, 0, 0), font=font)
    for k in range(8):
        t = d * (k + 0.5) / 8; f = os.path.join(SRC, f"{it['n']}_{k}.jpg")
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', p, '-frames:v', '1', '-vf', f'scale={W}:-2', f])
        if os.path.exists(f):
            im = Image.open(f).convert('RGB'); im.thumbnail((W, Hh)); sheet.paste(im, (5 + k * (W + 10), 35))
            dr.text((8 + k * (W + 10), 35 + Hh - 26), f"{t:.1f}s", fill=(255, 255, 0), font=font)
    sheet.save(os.path.join(OUT, f"v{it['n']:02d}.jpg"), quality=70)
    print('ok', it['n'], flush=True)
json.dump(info, open(os.path.join(OUT, 'info.json'), 'w'), indent=1)
print(json.dumps(info))
