import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthGateProps {
  onAuthenticated: () => void;
}

export function SupabaseAuthGate({ onAuthenticated }: AuthGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setErrorMsg('Supabase bağlantısı yapılandırılmamış. Yönetici Vercel environment ayarlarını kontrol etmeli.');
      setIsLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setErrorMsg('Oturum kontrolü başarısız oldu.');
      if (data.session) onAuthenticated();
      setIsLoading(false);
    });

    return () => { mounted = false; };
  }, [onAuthenticated]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    if (!supabase) {
      setErrorMsg('Supabase bağlantısı yapılandırılmamış.');
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMsg('Giriş başarısız. E-posta ve şifrenizi kontrol edin veya yöneticiyle iletişime geçin.');
    } else {
      onAuthenticated();
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-sm">Oturum kontrol ediliyor...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #3DAA5C 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-7 shadow-2xl space-y-6 relative z-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center"><Lock className="w-7 h-7" /></div>
        <div>
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Yetkili İç Komuta Merkezi</span>
          <h1 className="text-xl sm:text-2xl font-black text-white">Embay Yapı ve Kiralık İş Makineleri</h1>
          <p className="text-xs text-slate-400 mt-1.5">Bu panel halka açık değildir. Yetkili kullanıcı hesabıyla giriş yapın.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4 text-left text-xs">
          <label className="block"><span className="text-slate-300 font-semibold block mb-1.5">E-posta</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500" /></label>
          <label className="block"><span className="text-slate-300 font-semibold block mb-1.5">Şifre</span><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500" /></label>
          {errorMsg && <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0 text-rose-400" /><span>{errorMsg}</span></div>}
          <button type="submit" disabled={isLoading} className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"><ShieldCheck className="w-4 h-4" /><span>Güvenli Giriş Yap</span><ArrowRight className="w-3.5 h-3.5" /></button>
        </form>
        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /><span>Supabase Auth ile korunan yönetici oturumu</span></div>
      </div>
    </div>
  );
}
