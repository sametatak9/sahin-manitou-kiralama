"""EMBAY · Yeni teslim ev turu Reels — gerçek çekim videolarından (Ferhat klasörü 06.10).
Her klip 1080x1920'ye kırpılır, ince Montserrat alt yazı + logo rozeti eklenir, sonda teslim Reels'i ile aynı DM kapanışı.
Ana çıktı müziksiz (Instagram'da şarkı eklenir); önizleme kopyası kendi telifsiz müziğimizle.
Kaynak: scripts/media-sheets/list.json · Çıktı: public/reels/teslim/<slug>(-sessiz).mp4"""
import json, os, subprocess, sys, tempfile, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import teslim_reel as T  # noqa: E402  (ortak marka yardımcıları: font, logo rozeti, kapanış kartı)
import reelkit  # noqa: E402

W, H, FPS = T.W, T.H, T.FPS
TOURS = [{
    'slug': 'ev-turu-bahceli',
    'end_photo': 148, 'end_line': 'Siz de böyle bir eve', 'web': '@embayyapi',
    'music': 'house_120_7',
    # (havuz no, başlangıç sn, süre sn, alt yazı)
    'hook': 'Bu evin içine girelim mi?',
    'clips': [(150, 0.4, 3.6, 'Bahçesinden başlıyor'),
              (152, 0.0, 3.0, 'Dört mevsim kış bahçesi'),
              (151, 0.6, 4.0, 'Ferah ve aydınlık salon'),
              (153, 0.4, 3.6, 'Köşe şömine, sıcak bir yuva')],
    'end_s': 4.2, 'xf': 0.2,
}]


def probe(p):
    out = subprocess.run([T.ffmpeg(), '-i', p], capture_output=True, text=True).stderr
    for line in out.splitlines():
        if 'Duration:' in line:
            h, m, s = line.split('Duration:')[1].split(',')[0].strip().split(':')
            return int(h) * 3600 + int(m) * 60 + float(s)
    return 0.0


def caption_layer(text, label='EMBAY YAPI · YENİ TESLİM'):
    """Alt üçte bir: yumuşak gölgeli ince beyaz yazı + üstte küçük marka satırı."""
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh); d = ImageDraw.Draw(lay)
    f = T.mont(66, 300); small = T.mont(28, 600)
    y = 1290
    for dd, fill in ((sd, (0, 0, 0, 170)), (d, (255, 255, 255, 255))):
        if label: dd.text(((W - dd.textlength(label, font=small)) / 2, y - 56), label, font=small, fill=fill)
        if text: dd.text(((W - dd.textlength(text, font=f)) / 2, y), text, font=f, fill=fill)
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    sh.alpha_composite(lay)
    return sh


def hook_layer(text):
    """İlk 1,5 sn'lik merak cümlesi: ekranın üst-orta bölgesinde büyük ince yazı (Reels'te ilk saniye izlenmeyi belirler)."""
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    f = T.mont(76, 500); words = text.split(); lines, cur = [], ''
    for w in words:
        if d.textlength((cur + ' ' + w).strip(), font=f) > W - 2 * 60: lines.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    lines.append(cur)
    y = 560
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
    for ln in lines:
        x = (W - d.textlength(ln, font=f)) / 2
        sd.text((x, y), ln, font=f, fill=(0, 0, 0, 190)); d.text((x, y), ln, font=f, fill=(255, 255, 255, 255)); y += 104
    sh = sh.filter(ImageFilter.GaussianBlur(12)); sh.alpha_composite(lay)
    return np.asarray(sh, dtype=np.float32) / 255.0


def clip_frames(path, ss, dur):
    """Videoyu dikey 1080x1920'ye ölçekleyip ortadan kırpar; kareleri numpy dizisi olarak döndürür."""
    cmd = [T.ffmpeg(), '-loglevel', 'error', '-ss', f'{ss:.2f}', '-t', f'{dur:.2f}', '-i', path,
           '-vf', f'{reelkit.STABILIZE},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},{reelkit.GRADE}',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def render(R, urls, tmp):
    T.REEL = {'end_line': R['end_line'], 'web': R['web'], 'title': ''}
    bub = T.logo_bubble()
    end = np.asarray(T.end_static(T.load(R['end_photo'], urls)), dtype=np.uint8)
    xf = int(R['xf'] * FPS)
    os.makedirs(T.OUT, exist_ok=True)
    silent = os.path.join(T.OUT, R['slug'] + '-sessiz.mp4')
    p = subprocess.Popen([T.ffmpeg(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '7M', '-bufsize', '14M', '-pix_fmt', 'yuv420p',
                          '-movflags', '+faststart', silent], stdin=subprocess.PIPE)
    state = {'count': 0, 'thumb': None}

    def emit(f):
        p.stdin.write(f.tobytes()); state['count'] += 1
        if state['count'] == FPS: state['thumb'] = f

    def scenes():
        for n, ss, dur, text in R['clips']:
            src = os.path.join(tmp, f'{n}.mov'); urllib.request.urlretrieve(urls[n], src)
            total = probe(src)
            dur = reelkit.on_beat(dur, R['music'])   # kesme müziğin vuruşunda
            dur = max(1.0, min(dur, total - ss - 0.05)) if total else dur
            cap = caption_layer(text); cap.alpha_composite(bub, reelkit.bubble_pos(bub))
            a = np.asarray(cap, dtype=np.float32) / 255.0
            alpha, rgb = a[..., 3:4], a[..., :3] * 255
            out = [(f.astype(np.float32) * (1 - alpha) + rgb * alpha) for f in clip_frames(src, ss, dur)]
            if R.get('hook') and n == R['clips'][0][0]:
                hk = hook_layer(R['hook']); ha, hr = hk[..., 3:4], hk[..., :3] * 255
                for k in range(min(len(out), int(1.6 * FPS))):
                    o = 1.0 if k < int(1.2 * FPS) else 1 - (k - int(1.2 * FPS)) / (0.4 * FPS)   # 1,2 sn sabit, 0,4 sn'de söner
                    out[k] = out[k] * (1 - ha * o) + hr * (ha * o)
            yield [f.astype(np.uint8) for f in out]
        yield [end] * int(R['end_s'] * FPS)

    tail = None   # önceki sahnenin son xf karesi (yumuşak geçiş için); bellekte yalnızca bir sahne tutulur
    for sc in scenes():
        for k, f in enumerate(sc):
            if tail is not None and k < xf:
                e = (k + 1) / (xf + 1); e = e * e * (3 - 2 * e)
                f = (tail[k].astype(np.float32) * (1 - e) + f.astype(np.float32) * e).astype(np.uint8)
            if k < len(sc) - xf: emit(f)
        tail = sc[-xf:]
    for f in tail: emit(f)
    p.stdin.close(); p.wait()
    total = state['count'] / FPS
    Image.fromarray(state['thumb']).save(os.path.join(T.OUT, R['slug'] + '.jpg'), quality=88)
    music = os.path.join(T.ROOT, 'scripts', 'reels', 'music', R['music'] + '.m4a')
    out = os.path.join(T.OUT, R['slug'] + '.mp4')
    reelkit.mix_music(T.ffmpeg(), silent, music, out, total)
    reelkit.qc(T.ffmpeg(), silent); reelkit.qc(T.ffmpeg(), out)
    print(f"{R['slug']}: {len(R['clips']) + 1} sahne, {total:.1f} sn")


def main():
    urls = {it['n']: it['url'] for it in json.load(open(os.path.join(T.ROOT, 'scripts', 'media-sheets', 'list.json')))}
    urls.update({int(k): v for k, v in json.loads(os.environ.get('LOCAL_URLS', '{}')).items()})   # yerel deneme için
    with tempfile.TemporaryDirectory() as tmp:
        for R in TOURS: render(R, urls, tmp)


if __name__ == '__main__':
    main()
