import { CheckCircle2, XCircle, ShieldAlert, Cpu, UserCheck } from 'lucide-react';
import { TASK_BOUNDARIES } from '../data/marketingData';

export function RoleMatrixSection() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <ShieldAlert className="w-4 h-4" />
          Şeffaf Görev Dağılımı & Güvenlik
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          Sistem Ne Yapar? Sizin Sahada Ne Yapmanız Gerekir?
        </h2>
        <p className="text-slate-300 text-sm mt-1 max-w-3xl">
          Beyaz şapka (White-hat) SEO ve kalıcı popülerlik için sahte hesap girişleri veya botlar yerine, gerçek saha emeğini profesyonel dijital stratejiyle birleştiriyoruz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* What Digital Kokpit / AI Does */}
        <div className="rounded-xl border border-emerald-500/30 bg-slate-900/90 p-5 space-y-4 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                Sistemin / Dijital Masanın Yaptıkları (Hazır Çıktılar)
              </h3>
              <p className="text-xs text-emerald-400">1 Tıkla Kopyalanıp Kullanıma Hazır</p>
            </div>
          </div>

          <div className="space-y-3">
            {TASK_BOUNDARIES.aiCanDo.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What The Business Owner / Team Must Do */}
        <div className="rounded-xl border border-amber-500/30 bg-slate-900/90 p-5 space-y-4 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <UserCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                Sizin Bizzat Yapmanız Gerekenler (Fiziki Adımlar)
              </h3>
              <p className="text-xs text-amber-400">Google & Instagram Güvenliği Nedeniyle</p>
            </div>
          </div>

          <div className="space-y-3">
            {TASK_BOUNDARIES.humanMustDo.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Safety Notice Box */}
      <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-xs text-slate-300 space-y-2">
        <h4 className="font-bold text-red-400 flex items-center gap-1.5 text-sm">
          ⛔ Kesinlikle Yasak Olanlar (Google Ceza Sebepleri):
        </h4>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li><strong>Google Harita adına anahtar kelime doldurmak:</strong> İşletme adı resmiyette ne ise (Şahin Manitou Kiralama & Embay Yapı) o kalmalıdır. Yanına parantezle "En Ucuz Manitou" vb. eklemek askıya alınmaya (suspension) yol açar.</li>
          <li><strong>Yapay zeka (AI) üretimi veya stok şantiye görseli kullanmak:</strong> Google Haritalar gerçek fotoğrafları EXIF konum verisiyle analiz eder. Sahada çekilen telefon fotoğrafları her zaman 10 kat daha değerlidir.</li>
          <li><strong>Sabit TL fiyat vaat etmek:</strong> İnşaat ve makine kiralama işlerinde her işin riski ve saati farklıdır. "Net teklif için arayın" CTA'sı en güvenli ve en karlı yoldur.</li>
        </ul>
      </div>
    </div>
  );
}
