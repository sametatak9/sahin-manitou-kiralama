"""EMBAY Reels kalite kiti — tüm Reels üreticilerinin ortak kuralları.
- Güvenli alan: Instagram arayüzü üstte ~250px (Reels başlığı), altta ~380px (açıklama/kullanıcı adı), sağda ~150px
  (beğen/yorum düğmeleri) kapatır; logo ve yazılar bu alanların dışında kalır.
- Ritim: kesmeler müziğin vuruşuna oturur (dosya adındaki BPM: house_120_7 → 120).
- Görüntü: hafif sabitleme + netleştirme + sıcak ton; aşırı filtre yok (gerçek proje görünümü korunur).
- Ses: müzikli kopya Instagram önerisi olan −14 LUFS'a normalize edilir.
- Kalite kontrol: süre, çözünürlük, kare hızı, siyah kare ve ses düzeyi kontrol edilip public/reels/qc/<video>.json'a yazılır."""
import json, os, re, subprocess

W, H = 1080, 1920
SAFE_TOP, SAFE_BOTTOM, SAFE_RIGHT = 250, 380, 150
# Gerçek çekim videoları için: titreşimi azalt, hafif netleştir, sıcak/canlı ama doğal ton
GRADE = 'eq=contrast=1.05:saturation=1.10:gamma=1.02,colorbalance=rs=0.02:bs=-0.02:rh=0.02:bh=-0.02,unsharp=5:5:0.55:5:5:0.0'
STABILIZE = 'deshake=rx=32:ry=32'


def bpm(music_name, default=120):
    m = re.search(r'_(\d{2,3})_', music_name or '')
    return int(m.group(1)) if m else default


def on_beat(seconds, music_name):
    """Süreyi en yakın vuruş katına yuvarlar (en az 2 vuruş) → kesmeler ritme oturur."""
    beat = 60.0 / bpm(music_name)
    return max(2 * beat, round(seconds / beat) * beat)


def bubble_pos(bubble):
    """Logo rozeti: sol üst, Reels başlığının hemen altında (alt bölge açıklama yazısıyla kapanır)."""
    return 44, SAFE_TOP + 20


def mix_music(ffmpeg, silent, music, out, total):
    """Müzikli kopya: yumuşak giriş/çıkış + −14 LUFS normalize."""
    subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', silent, '-i', music, '-filter_complex',
                    f'[1:a]atrim=0:{total:.2f},afade=t=in:d=0.6,afade=t=out:st={max(0.0, total - 1.5):.2f}:d=1.5,'
                    f'loudnorm=I=-14:TP=-1.5:LRA=11[a]',
                    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
                    '-movflags', '+faststart', '-t', f'{total:.2f}', out], check=True)


def qc(ffmpeg, path, min_s=6.0, max_s=60.0):
    """Basit kalite kontrolü; sorunları liste olarak döndürür ve rapor dosyasına yazar."""
    err = subprocess.run([ffmpeg, '-hide_banner', '-i', path, '-vf', 'blackdetect=d=0.4:pix_th=0.08', '-af', 'ebur128',
                          '-f', 'null', '-'], capture_output=True, text=True).stderr
    issues = []
    dur = re.search(r'Duration: (\d+):(\d+):([\d.]+)', err)
    secs = int(dur.group(1)) * 3600 + int(dur.group(2)) * 60 + float(dur.group(3)) if dur else 0
    if not (min_s <= secs <= max_s): issues.append(f'süre {secs:.1f} sn (hedef {min_s:.0f}-{max_s:.0f})')
    if f'{W}x{H}' not in err: issues.append('çözünürlük 1080x1920 değil')
    if not re.search(r'\b30 fps\b', err): issues.append('kare hızı 30 değil')
    blacks = re.findall(r'black_start:([\d.]+)', err)
    if blacks: issues.append(f'siyah kare: {", ".join(blacks[:3])} sn')
    lufs = re.findall(r'I:\s+(-?[\d.]+) LUFS', err)
    loud = float(lufs[-1]) if lufs else None
    if loud is not None and loud > -60 and not (-17 <= loud <= -11): issues.append(f'ses düzeyi {loud} LUFS (hedef −14)')
    # her video için ayrı rapor (aynı anda çalışan iş akışları aynı dosyada çakışmasın): public/reels/qc/<yol>.json
    reels_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'public', 'reels')
    rel = os.path.relpath(os.path.abspath(path), reels_dir)
    rep_path = os.path.join(reels_dir, 'qc', rel + '.json'); os.makedirs(os.path.dirname(rep_path), exist_ok=True)
    json.dump({'video': rel, 'sure_sn': round(secs, 1), 'lufs': loud, 'sorunlar': issues}, open(rep_path, 'w'), ensure_ascii=False, indent=1)
    print(('✅' if not issues else '⚠️'), os.path.basename(path), f'{secs:.1f} sn', loud, '; '.join(issues))
    return issues
