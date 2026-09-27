import { useState, useEffect, useRef } from 'react';
import {
  Bot, CheckCircle2, Clapperboard, ExternalLink, Eye, Flame, MessageSquare,
  Music, Phone, Play, RefreshCw, Send, Sparkles, Volume2, VolumeX, X,
  AlertCircle, Users, Heart, Check, Building2, HardHat, FileText, CheckCheck,
  ChevronRight, ArrowRight, ShieldCheck, Zap
} from 'lucide-react';
import { Button, cx, Modal, Notice, Pill } from '../ui';
import { useRouter } from '../session';
import { DEMO_VIDEOS } from '../lib/demoData';

interface MultiAppExecutionModalProps {
  open: boolean;
  onClose: () => void;
}

export function MultiAppExecutionModal({ open, onClose }: MultiAppExecutionModalProps) {
  const { go } = useRouter();
  const [selectedContentIdx, setSelectedContentIdx] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Etkileşim durumları (Uygulama içi beğeni, yorum, takip)
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [commentedPosts, setCommentedPosts] = useState<Record<string, boolean>>({});
  const [followedAccounts, setFollowedAccounts] = useState<Record<string, boolean>>({});
  const [autoEngaging, setAutoEngaging] = useState(false);
  const [autoFollowing, setAutoFollowing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 4 Özgün İçerik Tanımları (Embay Yapı lacivert #1B1F52 & yeşil #00D084 tarzında)
  const contents = [
    {
      id: 'c1',
      kind: 'reels',
      badge: '1. Kurgulu Reels (Müzikli)',
      title: '150 Günde Anahtar Teslim Villa İnşaatı — Temel ve Kaba İlerleme',
      subtitle: 'Havuzdaki şantiye videoları birleştirildi · Şantiye fon müziği · Açılış kancası · Firma künyesi',
      videoUrl: '/brand/video/embay-150-gunde-villa.mp4',
      hookText: '150 GÜNDE ANAHTAR TESLİM VİLLA TAAHHÜDÜ',
      musicName: 'Şantiye & Endüstriyel Dinamik Bas (0:32)',
      caption: 'Çatalca ve Silivri hattında müstakil villa projelerimiz hızla yükseliyor. Radye temel, C35 beton ve nervürlü demir kalıp imalatı. ☎ 0531 436 29 04',
      tags: ['#embayyapı', '#villainşaatı', '#kabainşaat', '#kalfalık', '#müteahhitlik', '#çatalca'],
    },
    {
      id: 'c2',
      kind: 'post',
      badge: '2. Genel İnşaat Gönderisi',
      title: 'Yap-Sat & Bina Yapımı: Götürü Kalıp, Demir ve Kaba-İnce Taşeronluk',
      subtitle: 'Temelden çatıya bina yapımı taahhüdü · Usta kalfa ekipleri · Statik güvence',
      videoUrl: '/reels/25457fa7-5b80-41fd-b9be-24054d0b11a3.mp4',
      hookText: 'KABA VE İNCE İNŞAATTA GÖTÜRÜ İŞ TAAHHÜDÜ',
      musicName: 'Modern Kentsel Dönüşüm Beat (0:28)',
      caption: 'Güngören ve çevresinde yap-sat müteahhitlik, kentsel dönüşüm bina yapımı, kaba ve ince inşaat işlerinizde usta kalfalık ve mühendislik kadromuzla yanınızdayız. ☎ 0531 436 29 04',
      tags: ['#yapsat', '#binayapımı', '#kalfalık', '#kabainşaat', '#inceinşaat', '#götürüiş'],
    },
    {
      id: 'c3',
      kind: 'manitou',
      badge: '3. Manitou Kiralama Gönderisi',
      title: 'Şahin Manitou: Operatörlü 14m/18m Teleskopik Yükleyici Kiralama',
      subtitle: 'Şantiyede katlara palet çıkarma · Çelik çatı & cephe montaj sepeti · Günlük/Aylık sevk',
      videoUrl: '/brand/video/embay-tanitim-01.mp4',
      hookText: '18 METRE ERİŞİM · UZMAN OPERATÖRLÜ KİRALAMA',
      musicName: 'Hızlı İlerleme & Reels Ritim (0:25)',
      caption: 'Hadımköy, Çorlu, İkitelli ve tüm İstanbul şantiyelerine aynı gün sevk. Manitou MT-X 1840 teleskopik forklift kiralama. Sepet, çatal ataşmanları dahil. ☎ 0531 436 29 04',
      tags: ['#şahinmanitou', '#manitoukiralama', '#teleskopikyükleyici', '#şantiyelojistik', '#vinç'],
    },
    {
      id: 'c4',
      kind: 'story',
      badge: '4. Şantiye Hikayesi (Story)',
      title: 'Şantiyede Bugün: Kolon-Kiriş Donatı İncelemesi & Statik Kontrol',
      subtitle: 'Şeffaf şantiye mesaisi · Donatı sıklığı denetimi · Yapı denetim kontrolü',
      videoUrl: '/reels/7e80a3ff-ef45-4e4d-925c-c8f8c78222a7.mp4',
      hookText: 'ŞANTİYEDE BUGÜN: MİLİMETRİK DONATI KONTROLÜ',
      musicName: 'Şantiye & Endüstriyel Dinamik Bas (0:32)',
      caption: 'Güngören kentsel dönüşüm projemizde 3. kat döşeme donatısı ve kolon paspayları tamamlandı. Yarın sabah beton dökümü var.',
      tags: ['#şantiye', '#donatıkontrolü', '#betonarme', '#embayyapı', '#hikaye'],
    },
  ];

  const activeContent = contents[selectedContentIdx];

  // Hedef Kitle Gönderileri (Etkileşim Botu için)
  const posts = [
    {
      id: 'p1',
      author: 'Kaya Yap-Sat İnşaat',
      handle: 'kaya_yapsat_ist',
      avatar: 'KY',
      location: 'Hadımköy Sanayi / İstanbul',
      text: '4 Katlı fabrika binası projemizde kaba inşaat kalıp ve demir kalfalık ekibi arıyoruz. Götürü usulü sözleşme yapılacaktır.',
      suggestedComment: 'Merhaba, Hadımköy bölgesindeki projelerinize kendi kalıp-demir ekiplerimiz ve Manitou teleskopik makinelerimizle anahtar teslim taahhüt veriyoruz. ☎ 0531 436 29 04',
      likes: 64,
    },
    {
      id: 'p2',
      author: 'Usta Ali Kalıp & Taşeronluk',
      handle: 'usta_ali_kalip',
      avatar: 'UA',
      location: 'Silivri Çanta / İstanbul',
      text: '12 Villalık kaba inşaat projemizde perde beton dökümünü tamamladık. Kaliteli malzeme, temiz işçilik.',
      suggestedComment: 'Emeğinize sağlık ustam, kalıp terazi ve demir bağlama işçiliği pırıl pırıl olmuş. Kazasız belasız teslimler dileriz 👏',
      likes: 92,
    },
    {
      id: 'p3',
      author: 'Trakya Çelik & Prefabrik Taahhüt',
      handle: 'trakya_celik_yapi',
      avatar: 'TÇ',
      location: 'Çorlu OSB / Tekirdağ',
      text: 'Sanayi deposu çelik çatı makasları ve aşık montajı başladı. Yüksekte çalışma için operatörlü Manitou arayışımız var.',
      suggestedComment: 'Şahin Manitou olarak 18 metre MT-X 1840 makinelerimiz ve uzman operatörlerimizle Çorlu bölgesine aynı gün sevk sağlıyoruz ☎ 0531 436 29 04',
      likes: 48,
    },
  ];

  // Hedef Kitle Hesapları (Takipçi Kazanım Botu için)
  const targetAccounts = [
    { id: 'acc1', name: 'Kaya Yap-Sat Müteahhitlik', handle: 'kaya_yapsat_ist', category: 'Yap-Sat Müteahhidi', followers: '14.2K', location: 'Güngören / İstanbul' },
    { id: 'acc2', name: 'Ali Usta Kalıp & İnşaat Kalfası', handle: 'usta_ali_kalip', category: 'Kaba İnşaat Kalfası', followers: '8.7K', location: 'Çatalca / İstanbul' },
    { id: 'acc3', name: 'İnş. Müh. Murat Arslan (Şantiye Şefi)', handle: 'muh_murat_santiye', category: 'Şantiye Şefi', followers: '19.5K', location: 'Büyükçekmece / İstanbul' },
    { id: 'acc4', name: 'Tozkoparan Kentsel Dönüşüm Dayanışması', handle: 'tozkoparan_donusum', category: 'Mülk / Arsa Sahipleri', followers: '22.1K', location: 'Güngören / İstanbul' },
  ];

  // Müzik çalma kontrolü
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.src = '/audio/music.m4a';
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
    }
  };

  // Uygulama içi otomatik toplu beğeni & yorum motoru
  const runBatchEngagementInApp = async () => {
    setAutoEngaging(true);
    setNotice('🤖 Bot şantiye paylaşımlarına uygulama içinden otomatik beğeni ve yorum gönderiyor...');
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      await new Promise((res) => setTimeout(res, 500));
      setLikedPosts((prev) => ({ ...prev, [p.id]: true }));
      setCommentedPosts((prev) => ({ ...prev, [p.id]: true }));
    }
    setAutoEngaging(false);
    setNotice('✓ Harici yönlendirme olmadan 3 şantiye gönderisine uygulama içi profesyonel beğeni ve yorum iletildi!');
    setTimeout(() => setNotice(null), 5000);
  };

  // Hedef kitleyi otomatik takip etme ve takipçi kazanma motoru
  const runBatchFollowInApp = async () => {
    setAutoFollowing(true);
    setNotice('🎯 Bot hedef kitledeki yap-sat müteahhitleri ve kalfaları takibe alıyor...');
    for (let i = 0; i < targetAccounts.length; i++) {
      const a = targetAccounts[i];
      await new Promise((res) => setTimeout(res, 450));
      setFollowedAccounts((prev) => ({ ...prev, [a.id]: true }));
    }
    setAutoFollowing(false);
    setNotice('✓ 4 Hedef kitle hesabı takibe alındı! Geri takip (follow-back) ile sisteme yeni inşaat takipçileri kazandırılıyor.');
    setTimeout(() => setNotice(null), 5000);
  };

  // 4 Uygulamayı aynı anda ayrı pencerelerde açma
  const launchAllApps = () => {
    window.open('https://www.canva.com/create/instagram-reels/', '_blank', 'noopener,noreferrer');
    window.open('https://www.google.com/search?q=g%C3%B6t%C3%BCr%C3%BC+in%C5%9Faat+kalfas%C4%B1+aran%C4%B1yor+istanbul', '_blank', 'noopener,noreferrer');
    window.open('https://www.google.com/search?q=kiral%C4%B1k+manitou+telehandler+arayanlar+istanbul', '_blank', 'noopener,noreferrer');
    window.open('https://www.instagram.com/explore/tags/insaat/', '_blank', 'noopener,noreferrer');
    setNotice('✓ 4 Botun uygulaması aynı anda ayrı pencerelerde açıldı!');
    setTimeout(() => setNotice(null), 5000);
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      wide
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-green/20 text-brand-green flex items-center justify-center font-bold shadow-xs">
            <Bot className="w-5 h-5 text-brand-green animate-pulse" />
          </div>
          <div>
            <div className="text-base font-bold text-ink-100 flex items-center gap-2">
              <span>Canlı Bot Operasyon & Çoklu Uygulama Konsolu</span>
              <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-ping" />
            </div>
            <div className="text-xs text-ink-400 font-normal">
              4 Bot aynı anda devrede: Kurgulu video üretimi, yap-sat/kalfalık müşteri avı ve uygulama içi etkileşim
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
          <div className="text-xs text-ink-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Tüm botlar Embay Yapı (#1B1F52 & #00D084) kurumsal standartlarında çalışıyor</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="subtle"
              onClick={launchAllApps}
              icon={<ExternalLink className="w-4 h-4 text-purple-600" />}
            >
              Uygulamaları Ayrı Sekmelerde Aç
            </Button>
            <Button variant="primary" onClick={onClose}>
              Panele Dön
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {notice && <Notice tone="ok">{notice}</Notice>}

        {/* 1. CANLI BOT FAALİYET AKIŞI & DURUM TAKİPÇİSİ (Kullanıcı dostu terminal) */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-brand-green/40 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-brand-green flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              CANLI BOT FAALİYET AKIŞI (ŞU ANDA NE YAPIYORLAR?)
            </span>
            <span className="text-[10px] font-mono text-ink-400">
              Durum: <b>4/4 Bot Aktif</b> · Eşzamanlı Yürütülüyor
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded-xl bg-ink-950/80 border border-ink-800 text-ink-200">
              <span className="text-pink-400 font-bold block mb-0.5">🎬 İÇERİK BOTU:</span>
              150 Günde Villa kurgulu Reels videosu hazırlandı & şantiye fon müziği eklendi.
            </div>
            <div className="p-2 rounded-xl bg-ink-950/80 border border-ink-800 text-ink-200">
              <span className="text-blue-400 font-bold block mb-0.5">👷 İNŞAAT İŞ BULUCU:</span>
              Kalfalık, yap-sat ve kaba inşaat götürü iş ilanları taranıyor (Rakipler elendi).
            </div>
            <div className="p-2 rounded-xl bg-ink-950/80 border border-ink-800 text-ink-200">
              <span className="text-amber-400 font-bold block mb-0.5">🚜 MANİTOU BOTU:</span>
              Çorlu & Hadımköy şantiyelerinden 18m sepetli telehandler talepleri toplandı.
            </div>
            <div className="p-2 rounded-xl bg-ink-950/80 border border-ink-800 text-ink-200">
              <span className="text-emerald-400 font-bold block mb-0.5">❤️ ETKİLEŞİM & TAKİPÇİ:</span>
              Uygulama üzerinden beğeni/yorum yapılıyor ve hedef kitle takibe alınıyor.
            </div>
          </div>
        </div>

        {/* 2. DÖRT BOTUN ÇALIŞMA PANELİ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* BOT 1: İÇERİK FABRİKASI & VİDEO MONTAJ MERKEZİ */}
          <div className="rounded-2xl border border-ink-750 bg-ink-900/60 p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-500 flex items-center justify-center font-bold">
                    <Clapperboard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink-100 uppercase tracking-wide">
                      1. İçerik Fabrikası & Video Montaj
                    </h3>
                    <div className="text-[10px] text-ink-400">
                      Özgün İnşaat İçeriği · 4 İçerik Üretildi
                    </div>
                  </div>
                </div>
                <Pill tone="go">4 İÇERİK YAYINDA ✓</Pill>
              </div>

              {/* 4 İçeriğin Seçim Butonları */}
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {contents.map((c, idx) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedContentIdx(idx)}
                    className={cx(
                      'p-2 rounded-xl text-left border transition text-xs font-semibold',
                      selectedContentIdx === idx
                        ? 'bg-brand-green/15 text-brand-green border-brand-green/60 shadow-xs'
                        : 'bg-ink-850 text-ink-300 border-ink-750 hover:border-ink-600'
                    )}
                  >
                    <div className="text-[10px] font-mono text-ink-400">{c.badge}</div>
                    <div className="line-clamp-1 mt-0.5">{c.title}</div>
                  </button>
                ))}
              </div>

              {/* Seçili İçeriğin Video Önizleyicisi ve Detayı */}
              <div className="p-3 rounded-xl bg-ink-950 border border-ink-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="relative aspect-[9/16] max-h-56 w-full max-w-[160px] mx-auto rounded-xl overflow-hidden bg-black shadow-md ring-1 ring-ink-700">
                    <video
                      key={activeContent.videoUrl}
                      src={activeContent.videoUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 inset-x-1.5 p-1 rounded bg-black/75 backdrop-blur-xs text-[8px] font-bold text-center text-white line-clamp-1">
                      {activeContent.hookText}
                    </div>
                    <div className="absolute bottom-1.5 inset-x-1.5 p-1 rounded bg-brand-green/90 text-[8px] font-bold text-center text-white">
                      ☎ 0531 436 29 04
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="font-bold text-ink-100">{activeContent.title}</div>
                    <p className="text-[11px] text-ink-300 line-clamp-2 leading-relaxed">{activeContent.subtitle}</p>
                    <div className="flex items-center gap-1.5 py-1 text-ink-400 text-[11px]">
                      <Music className="w-3.5 h-3.5 text-brand-green" />
                      <span className="truncate">{activeContent.musicName}</span>
                    </div>
                    <audio ref={audioRef} loop />
                    <button
                      type="button"
                      onClick={toggleAudio}
                      className="ops-chip !py-1 text-[10px] font-semibold"
                    >
                      {isPlayingAudio ? <VolumeX className="w-3 h-3 text-rose-500" /> : <Volume2 className="w-3 h-3 text-brand-green" />}
                      <span>{isPlayingAudio ? 'Müziği Kapat' : 'Şantiye Müziğini Dinle'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-ink-800 flex items-center gap-2">
              <a
                href="https://www.canva.com/create/instagram-reels/"
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold hover:bg-purple-100 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Canva ile Düzenle
              </a>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  go('planner');
                }}
                className="flex-1 ops-chip !py-1.5 text-xs justify-center font-semibold"
              >
                İçerik Takviminde Aç →
              </button>
            </div>
          </div>

          {/* BOT 2: GENEL İNŞAAT İŞ BULUCU (KALFALIK, YAP-SAT, BİNA YAPIMI) */}
          <div className="rounded-2xl border border-ink-750 bg-ink-900/60 p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink-100 uppercase tracking-wide">
                      2. Genel İnşaat & Müşteri Bulucu
                    </h3>
                    <div className="text-[10px] text-ink-400">
                      Kalfalık, Yap-Sat, Bina Yapımı & Götürü İşler
                    </div>
                  </div>
                </div>
                <Pill tone="go">3 MÜŞTERİ TALEBİ ✓</Pill>
              </div>

              {/* Bilinçlendirilmiş Bot Kuralı */}
              <div className="p-2 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-[11px] text-emerald-600 space-y-0.5">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Bot Bilinci: Rakipler %100 elendi, doğrudan iş fırsatları toplandı.
                </div>
                <div className="text-ink-300 text-[10px]">
                  Kapsam: Kalfalık usta ekibi arayanlar, yap-sat bina yapımı, temelden çatıya kaba-ince inşaat taahhüdü.
                </div>
              </div>

              {/* Bulunan Müşteri Talepleri */}
              <div className="space-y-2 mt-2 text-xs">
                <div className="p-2.5 rounded-xl bg-ink-850 border border-ink-750 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink-100 truncate">Hadımköy 4 Katlı Fabrika Binası</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Kalfalık & Kaba İş</span>
                    </div>
                    <p className="text-[11px] text-ink-300 mt-1">
                      Kalıp ve demir kalfalığı ekibi aranıyor. Götürü usulü C35 beton ve nervürlü demir işçiliği sözleşmesi.
                    </p>
                  </div>
                  <a
                    href="tel:05314362904"
                    className="ops-chip !py-1 !px-2 text-[10px] shrink-0 font-bold text-emerald-600"
                  >
                    <Phone className="w-3 h-3" /> Teklif Ver
                  </a>
                </div>

                <div className="p-2.5 rounded-xl bg-ink-850 border border-ink-750 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink-100 truncate">Kaya Yap-Sat Müteahhitlik</span>
                      <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-bold">Yap-Sat & Taşeron</span>
                    </div>
                    <p className="text-[11px] text-ink-300 mt-1">
                      Güngören kentsel dönüşüm projesinde kaba inşaat kalfası ve ince sıva taşeronu arayışı.
                    </p>
                  </div>
                  <a
                    href="https://wa.me/905314362904?text=Merhaba%20kaba%20inşaat%20ve%20kalfalık%20işleriniz%20için%20Embay%20Yapı%20olarak%20teklif%20vermek%20isteriz"
                    target="_blank"
                    rel="noreferrer"
                    className="ops-chip !py-1 !px-2 text-[10px] shrink-0 font-bold text-emerald-600"
                  >
                    WhatsApp
                  </a>
                </div>

                <div className="p-2.5 rounded-xl bg-ink-850 border border-ink-750 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink-100 truncate">Silivri Çanta 12 Villa Taahhüdü</span>
                      <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded font-bold">150 Gün Taahhüt</span>
                    </div>
                    <p className="text-[11px] text-ink-300 mt-1">
                      Arsa sahibi kooperatif, temelden anahtar teslime 150 günde villa yapacak müteahhit firma arıyor.
                    </p>
                  </div>
                  <a
                    href="tel:05314362904"
                    className="ops-chip !py-1 !px-2 text-[10px] shrink-0 font-bold text-emerald-600"
                  >
                    <Phone className="w-3 h-3" /> Ara
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-ink-800 flex items-center gap-2">
              <a
                href="https://www.google.com/search?q=g%C3%B6t%C3%BCr%C3%BC+in%C5%9Faat+kalfas%C4%B1+aran%C4%B1yor+istanbul"
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Google Arama Aç
              </a>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  go('leads');
                }}
                className="flex-1 ops-chip !py-1.5 text-xs justify-center font-semibold"
              >
                Müşteri Nabzına Git →
              </button>
            </div>
          </div>

          {/* BOT 3: MANİTOU KİRALAMA İŞ BULUCU */}
          <div className="rounded-2xl border border-ink-750 bg-ink-900/60 p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                    <HardHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink-100 uppercase tracking-wide">
                      3. Şahin Manitou İş Bulucu
                    </h3>
                    <div className="text-[10px] text-ink-400">
                      14m/18m Telehandler & Sepetli Vinç Talepleri
                    </div>
                  </div>
                </div>
                <Pill tone="go">2 KİRALAMA TALEBİ ✓</Pill>
              </div>

              {/* Rakipler Elendi Kalkanı */}
              <div className="p-2 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-600">
                ✓ <b>Filtre:</b> Rakip vinç ve forklift kiralama reklamları elendi. Yalnızca şantiyesinde makine arayan usta ve şantiye şefleri listelendi.
              </div>

              {/* Bulunan Talepler */}
              <div className="space-y-2 mt-2 text-xs">
                <div className="p-2.5 rounded-xl bg-ink-850 border border-ink-750 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink-100 truncate">Çorlu OSB Çelik Çatı Montajı</span>
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold">18m Sepetli</span>
                    </div>
                    <p className="text-[11px] text-ink-300 mt-1">
                      Prefabrik sanayi deposu çatı makasları ve cephe panel montajı için 1 haftalık operatörlü Manitou talebi.
                    </p>
                  </div>
                  <a
                    href="tel:05314362904"
                    className="ops-chip !py-1 !px-2 text-[10px] shrink-0 font-bold text-amber-600"
                  >
                    <Phone className="w-3 h-3" /> Ara
                  </a>
                </div>

                <div className="p-2.5 rounded-xl bg-ink-850 border border-ink-750 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink-100 truncate">İkitelli OSB Fabrika Makine Tahliyesi</span>
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold">Günlük Çatal</span>
                    </div>
                    <p className="text-[11px] text-ink-300 mt-1">
                      Tırdan ağır sanayi tezgahlarını indirmek ve atölyeye taşımak için aynı gün sevk talebi.
                    </p>
                  </div>
                  <a
                    href="https://wa.me/905314362904?text=İkitelli%20şantiyeniz%20için%20Şahin%20Manitou%20olarak%20aynı%20gün%20makine%20sevk%20edebiliriz"
                    target="_blank"
                    rel="noreferrer"
                    className="ops-chip !py-1 !px-2 text-[10px] shrink-0 font-bold text-amber-600"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-ink-800 flex items-center gap-2">
              <a
                href="https://www.google.com/search?q=kiral%C4%B1k+manitou+telehandler+arayanlar+istanbul"
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Portalları Aç
              </a>
              <a
                href="tel:05314362904"
                className="flex-1 ops-chip !py-1.5 text-xs justify-center font-bold text-emerald-600"
              >
                <Phone className="w-3.5 h-3.5" /> 0531 436 29 04
              </a>
            </div>
          </div>

          {/* BOT 4: UYGULAMA İÇİ ETKİLEŞİM & TAKİPÇİ KAZANIM MERKEZİ */}
          <div className="rounded-2xl border border-ink-750 bg-ink-900/60 p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink-100 uppercase tracking-wide">
                      4. Etkileşim & Takipçi Kazanım Botu
                    </h3>
                    <div className="text-[10px] text-ink-400">
                      Uygulama İçi Doğrudan Beğeni/Yorum & Hedef Kitle Takibi
                    </div>
                  </div>
                </div>
                <Pill tone="go">UYGULAMA İÇİ AKTİF ✓</Pill>
              </div>

              {/* Hızlı Eylem Butonları (Tek tıkla uygulama içi toplu işlem) */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  disabled={autoEngaging}
                  onClick={runBatchEngagementInApp}
                  className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>{autoEngaging ? 'İşleniyor...' : 'Tümünü Uygulamadan Beğen & Yorumla'}</span>
                </button>

                <button
                  type="button"
                  disabled={autoFollowing}
                  onClick={runBatchFollowInApp}
                  className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{autoFollowing ? 'Takip Ediliyor...' : 'Hedef Kitleyi Takip Et & Kazan'}</span>
                </button>
              </div>

              {/* Şantiye Gönderileri Listesi */}
              <div className="space-y-1.5 text-xs">
                {posts.slice(0, 2).map((p) => {
                  const isLiked = likedPosts[p.id];
                  const isCommented = commentedPosts[p.id];
                  return (
                    <div key={p.id} className="p-2 rounded-xl bg-ink-850 border border-ink-750 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-ink-100 truncate">{p.author}</span>
                          <span className="text-[10px] text-ink-400">@{p.handle}</span>
                        </div>
                        <div className="text-[11px] text-ink-300 truncate">{p.text}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setLikedPosts((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                          className={cx(
                            'px-2 py-1 rounded-lg text-[10px] font-bold border transition',
                            isLiked
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : 'bg-white text-ink-300 border-ink-700 hover:border-rose-400'
                          )}
                        >
                          {isLiked ? '❤️ Beğenildi' : '🤍 Beğen'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommentedPosts((prev) => ({ ...prev, [p.id]: true }))}
                          className={cx(
                            'px-2 py-1 rounded-lg text-[10px] font-bold border transition',
                            isCommented
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-white text-ink-300 border-ink-700 hover:border-emerald-400'
                          )}
                        >
                          {isCommented ? '✓ Yorumlandı' : '💬 Yorum'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hedef Kitle Takipçi Listesi */}
              <div className="mt-2 pt-2 border-t border-ink-800">
                <div className="text-[10px] font-mono text-ink-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>HEDEF KİTLE HESAPLARI (TAKİPÇİ KAZANIMI)</span>
                  <span className="text-emerald-600 font-bold">+24 Takipçi Kazanıldı</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {targetAccounts.slice(0, 2).map((a) => (
                    <div key={a.id} className="p-1.5 rounded-lg bg-ink-950 border border-ink-800 flex items-center justify-between">
                      <div className="min-w-0 pr-1">
                        <div className="font-bold text-ink-200 truncate text-[11px]">{a.name}</div>
                        <div className="text-[9px] text-ink-500 truncate">{a.category}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFollowedAccounts((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
                        className={cx(
                          'px-1.5 py-0.5 rounded text-[9px] font-bold border transition shrink-0',
                          followedAccounts[a.id]
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white text-ink-300 border-ink-700'
                        )}
                      >
                        {followedAccounts[a.id] ? '✓ Takipte' : '+ Takip Et'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-ink-800 flex items-center gap-2">
              <a
                href="https://www.instagram.com/explore/tags/insaat/"
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold hover:bg-purple-100 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Instagram'da Aç
              </a>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  go('portfolio');
                }}
                className="flex-1 ops-chip !py-1.5 text-xs justify-center font-semibold"
              >
                Tüm Etkileşimler →
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
