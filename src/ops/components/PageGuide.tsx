// Her ekranın üstünde kısa kullanım rehberi: "Bu ekran ne işe yarar, nasıl kolayca kullanılır?"
// Kapatılırsa telefonda hatırlanır (yalnızca görünüm tercihi; veri değil).
import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import type { Route } from '../session';

const GUIDE: Partial<Record<Route, { what: string; tips: string[] }>> = {
  home: { what: 'Günün özeti: botlar ne yaptı, neyin onayı bekliyor, hangi uygulama bağlı.', tips: ['Kırmızı/sarı satıra dokunun → ilgili ekrana gider.', 'Onay bekleyen işler sizi bekler; botlar onaysız dışarıya bir şey göndermez.'] },
  bots: { what: 'Botlarınız burada. Bir bota görev verin, süre belirleyin; bot araştırır ve rapor hazırlar.', tips: ['“Görev ver” → hazır görevlerden birini seçmeniz yeterli.', 'Görev sürerken “Canlı rapor” ile bulunanları anında görürsünüz.', 'Ekonomik model (Sonnet) aynı işi daha az krediyle yapar.'] },
  reports: { what: 'Botların bitirdiği tüm görevler ve raporlar.', tips: ['“Otomatik görevler” sekmesi: İhale alarmı gibi her sabah kendiliğinden çalışan görevler.', 'Görevi açın → “Onayla ve kaydet” ile sonucu kalıcı listeye alın.', 'PDF kaydet ve WhatsApp ile gönder butonları raporun altında.'] },
  approvals: { what: 'Botların hazırladığı paylaşım, mesaj ve teklifler burada onayınızı bekler.', tips: ['Onaylamadığınız hiçbir şey dışarıya gönderilmez.', 'Hatırlatma mesajlarında “WhatsApp’ta aç” ile tek dokunuşla gönderirsiniz.'] },
  connections: { what: 'Instagram, Facebook, YouTube ve diğer uygulamalar.', tips: ['“Hesabımla bağla” ile bir kez giriş yapın; botlar hesabı programın içinden kullanır.', '“Uygulamayı aç” uygulamanın kendisini açar.'] },
  queue: { what: 'Telefondan fotoğraf/video yükleyin, nerede ve ne zaman paylaşılacağını seçin.', tips: ['Birden çok dosya seçip “her gün bir tane” derseniz günlük paylaşım planı kurulur.', 'Hesap bağlı değilse paylaşım sırada bekler, bağlanınca gider.'] },
  videos: { what: 'Video yükleyin, havuzda saklayın, uygulamasını seçin, kırpın ve paylaşım saatini belirleyin.', tips: ['“Telefondan video seç” → video havuza kaydolur.', 'Videoya dokunun: uygulama seçimi, kırpma, kapak, açıklama ve “Kaydet ve kuyruğa gönder”.'] },
  planner: { what: 'Paylaşımların takvimi: ay, hafta, gün görünümü.', tips: ['Bir gönderiyi sürükleyip başka güne bırakarak tarihini değiştirebilirsiniz.'] },
  studio: { what: 'AI ile gönderi metni ve tasarımı hazırlayın, önizleyin, onaya gönderin.', tips: ['Konu ve amacı yazın → “AI ile üret”.'] },
  portfolio: { what: 'Botların ve sizin bulduğunuz firmalar arşivi; belirli aralıklarla hatırlatma.', tips: ['Firmayı açın → hatırlatma sıklığını seçip kaydedin.', 'Her sabah zamanı gelen firmalar için hazır mesaj Onay Merkezi’ne düşer.'] },
  construction: { what: 'İnşaat (kentsel dönüşüm, konut) müşterileriniz.', tips: ['Müşteriyi açın → “Teklif hazırla” ile logolu PDF teklif oluşturun.', 'Kartı sürükleyip aşamasını değiştirin; her değişiklik tarihli kaydedilir.'] },
  rental: { what: 'Makine kiralama (Manitou) müşterileriniz.', tips: ['Müşteriyi açın → “Teklif hazırla”: kalemleri girin, KDV otomatik hesaplanır; PDF veya WhatsApp ile gönderin.', 'Not ekleyin veya WhatsApp takip mesajı hazırlayın.'] },
  leads: { what: 'Web sitesinden gelen başvurular ve botların bulduğu adaylar.', tips: ['Başvuruyu inşaat veya kiralama müşterisine dönüştürmek için onaya gönderin.'] },
  skills: { what: 'Botların yetenekleri (talimatları) ve kullanabildiği araçlar.', tips: ['Yeni yetenek eklemek için Bot Merkezi → bot → “Prompt ile yetenek ekle”.'] },
  settings: { what: 'Marka bilgileri, AI anahtarı, ekip ve işlem kayıtları.', tips: ['AI anahtarı bölümüne anahtarı yapıştırmanız yeterli; sistem doğrular.'] },
  system: { what: 'Her şey çalışıyor mu? Tek ekranda kontrol + uygulama giriş bilgileri.', tips: ['Sarı/kırmızı satırdaki bağlantıya dokunun → düzeltme ekranı açılır.'] },
};

export function PageGuide({ route }: { route: Route }) {
  const g = GUIDE[route];
  const key = `ops-guide-hidden-${route}`;
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { setHidden(localStorage.getItem(key) === '1'); } catch { setHidden(false); } }, [key]);
  if (!g) return null;
  if (hidden) return (
    <button type="button" onClick={() => { setHidden(false); try { localStorage.removeItem(key); } catch { /* yok */ } }} className="mb-3 inline-flex items-center gap-1 text-[11px] text-ink-400 hover:text-brand-green">
      <Info className="w-3.5 h-3.5" /> Bu ekran ne işe yarar?
    </button>
  );
  return (
    <div className="mb-4 rounded-2xl bg-emerald-50/70 ring-1 ring-emerald-200 px-3.5 py-2.5 flex gap-2.5">
      <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 text-xs text-ink-200">
        <div className="font-semibold text-ink-100">{g.what}</div>
        <ul className="mt-1 space-y-0.5 text-ink-300">{g.tips.map((t) => <li key={t}>• {t}</li>)}</ul>
      </div>
      <button type="button" aria-label="Rehberi gizle" onClick={() => { setHidden(true); try { localStorage.setItem(key, '1'); } catch { /* yok */ } }} className="self-start p-1 rounded-lg text-ink-500 hover:bg-emerald-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}
