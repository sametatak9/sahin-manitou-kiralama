"""EMBAY · Sesli anlatımlı Reels: mevcut (gerçek çekimli) Reels + sunucu sesi + altyazı + kısık müzik.
- Ses: scripts/marvel/narration.json → her öğenin TTS dosyası (Supabase 'audio' deposu, Google Gemini TTS ile üretildi)
- Altyazı: cümleler; cümle sınırları sesteki duraklamalara (silencedetect) oturtulur, cümle içi parçalar karakter oranına göre
- Müzik: videonun kendi müziği anlatım boyunca kısılır (%18), anlatım bitince kapanış kartında geri açılır
Kullanım: python3 scripts/marvel/narrate.py [--only 20-]
Çıktı: public/reels/marvel/<slug>.mp4 + .jpg, index.json güncellenir (diğer kayıtlar korunur)."""
import argparse, json, os, re, shutil, subprocess, tempfile, urllib.request
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'public', 'reels', 'marvel')
TTS = 'https://utngxnqlcayfjkknaysx.supabase.co/storage/v1/object/public/audio/tts/{}.wav'
W, H = 1080, 1920
NAVY, WHITE = (38, 42, 107), (255, 255, 255)
LEAD = 0.7          # anlatım videonun 0,7. saniyesinde başlar
OUTRO = 2.6         # son ~2,6 sn kapanış kartı: altyazı yok, müzik geri açılır
SUB_Y = 1220        # altyazı kutusunun üst kenarı (3 satırda bile alttaki etiketlere binmez)


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def dur(path):
    out = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path]).stdout
    return float(out.strip())


def silences(wav):
    """Sesteki duraklamaların orta noktaları (cümle sınırı adayları) ve konuşmanın başı/sonu."""
    err = subprocess.run(['ffmpeg', '-hide_banner', '-i', wav, '-af', 'silencedetect=noise=-35dB:d=0.22', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    total = dur(wav)
    pairs = list(zip(st, en + [total] * (len(st) - len(en))))
    speech_start = pairs[0][1] if pairs and pairs[0][0] < 0.05 else 0.0
    speech_end = pairs[-1][0] if pairs and pairs[-1][1] >= total - 0.05 else total
    mids = [(a + b) / 2 for a, b in pairs if a > speech_start + 0.1 and b < speech_end - 0.1]
    return speech_start, speech_end, mids


def font(size):
    from brandfont import montserrat
    m = montserrat(size, 600)   # altyazı: Montserrat SemiBold
    if m: return m
    for f in ('Oswald-VF.ttf', 'Anton-Regular.ttf'):
        p = os.path.join(HERE, 'fonts', f)
        if os.path.exists(p):
            ft = ImageFont.truetype(p, size)
            try: ft.set_variation_by_axes([600])  # Oswald SemiBold
            except Exception: pass
            return ft
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(size * 0.85))


def chunks(sentence, maxc=30):
    """Cümleyi en fazla 2 satırlık altyazı parçalarına böler (satır ~30 karakter)."""
    words, lines, cur = sentence.split(), [], ''
    for w in words:
        if len(cur) + len(w) + 1 > maxc and cur: lines.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    if cur: lines.append(cur)
    groups = ['\n'.join(lines[i:i + 2]) for i in range(0, len(lines), 2)]
    if len(groups) > 1 and len(groups[-1]) < 16:  # tek kelimelik yetim parça bırakma
        tail = groups.pop(); groups[-1] = groups[-1] + '\n' + tail
    return groups


def sub_png(text, path):
    img = Image.new('RGBA', (W, 340), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    f = font(56); lines = text.split('\n')
    boxes = [d.textbbox((0, 0), l, font=f) for l in lines]
    lh = max(b[3] - b[1] for b in boxes) + 18
    tw = max(b[2] - b[0] for b in boxes)
    bw, bh = tw + 70, lh * len(lines) + 34
    x0 = (W - bw) // 2
    d.rounded_rectangle([x0, 0, x0 + bw, bh], radius=26, fill=NAVY + (215,))
    for i, (l, b) in enumerate(zip(lines, boxes)):
        d.text(((W - (b[2] - b[0])) // 2 - b[0], 17 + i * lh - b[1] + 4), l, font=f, fill=WHITE, stroke_width=2, stroke_fill=(0, 0, 0, 160))
    img.save(path)


def timeline(text, s0, s1, mids):
    """Cümle sınırlarını duraklamalara oturtur, parçalara süre dağıtır → [(başla, bit, metin)]"""
    sents = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    total = sum(len(s) for s in sents); acc = 0; bounds = [s0]
    for s in sents[:-1]:
        acc += len(s); t = s0 + (s1 - s0) * acc / total
        near = min(mids, key=lambda m: abs(m - t)) if mids else None
        bounds.append(near if near is not None and abs(near - t) < 0.9 and near > bounds[-1] + 0.4 else t)
    bounds.append(s1)
    out = []
    for i, s in enumerate(sents):
        a, b = bounds[i], bounds[i + 1]; parts = chunks(s); n = sum(len(p) for p in parts); c = 0
        for p in parts:
            pa = a + (b - a) * c / n; c += len(p); pb = a + (b - a) * c / n
            out.append((pa, pb, p))
    return out


def build(item, tmp):
    base = os.path.join(OUT, item['base'] + '.mp4')
    wav = os.path.join(tmp, item['slug'] + '.wav')
    try:
        with urllib.request.urlopen(TTS.format(item['slug']), timeout=60) as r: open(wav, 'wb').write(r.read())
    except Exception as e:  # seslendirme henüz üretilmediyse bu Reels atlanır, diğerleri yapılır
        print(f"{item['slug']}: seslendirme yok ({e}) — atlandı"); return None
    V, A = dur(base), dur(wav)
    room = V - LEAD - OUTRO
    tempo = min(1.15, A / room) if A > room else 1.0   # gerekirse en fazla %15 hızlandır
    s0, s1, mids = silences(wav)
    s0, s1, mids = s0 / tempo, s1 / tempo, [m / tempo for m in mids]
    voice_end = LEAD + A / tempo
    subs = timeline(item['text'], LEAD + s0, LEAD + s1, [LEAD + m for m in mids])
    ins = ['-i', base, '-i', wav]; fc = []; last = '0:v'
    for k, (a, b, t) in enumerate(subs):
        p = os.path.join(tmp, f"{item['slug']}_{k}.png"); sub_png(t, p); ins += ['-loop', '1', '-t', f'{V:.2f}', '-i', p]
        fc.append(f"[{last}][{k + 2}:v]overlay=0:{SUB_Y}:enable='between(t,{a:.2f},{min(b + 0.05, V - OUTRO):.2f})'[v{k}]"); last = f'v{k}'
    # Müzik: anlatım boyunca %18, anlatım bitince yumuşakça %70'e (kapanış kartı)
    fc.append(f"[0:a]volume='if(lt(t,{voice_end + 0.2:.2f}),0.18,min(0.7,0.18+(t-{voice_end + 0.2:.2f})*0.8))':eval=frame[m]")
    fc.append(f"[1:a]highpass=f=70,atempo={tempo:.3f},adelay={int(LEAD * 1000)}|{int(LEAD * 1000)},volume=1.6[vo]")
    fc.append('[m][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]')
    out = os.path.join(OUT, item['slug'] + '.mp4')
    run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *ins, '-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-map', '[a]',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-maxrate', '7M', '-bufsize', '14M', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', f'{V:.2f}', out])
    shutil.copyfile(os.path.join(OUT, item['base'] + '.jpg'), os.path.join(OUT, item['slug'] + '.jpg'))
    print(f"{item['slug']}: video {V:.1f}s, ses {A:.1f}s, tempo {tempo:.2f}, {len(subs)} altyazı")
    return {'slug': item['slug'], 'dur': round(V, 2), 'frames': int(round(V * 30)), 'narrated': True, 'base': item['base']}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); a = ap.parse_args()
    cfg = json.load(open(os.path.join(HERE, 'narration.json')))
    idx_p = os.path.join(OUT, 'index.json'); idx = json.load(open(idx_p)) if os.path.exists(idx_p) else []
    with tempfile.TemporaryDirectory() as tmp:
        res = [r for r in (build(it, tmp) for it in cfg['items'] if it['slug'].startswith(a.only)) if r]
    done = {r['slug'] for r in res}
    json.dump(sorted([r for r in idx if r['slug'] not in done] + res, key=lambda r: r['slug']), open(idx_p, 'w'), indent=1)


if __name__ == '__main__':
    main()
