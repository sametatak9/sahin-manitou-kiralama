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
  const [resetSent, setResetSent] = useState(false);

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

  const handlePasswordReset = async () => {
    setErrorMsg('');
    setResetSent(false);
    if (!supabase || !email.trim()) {
      setErrorMsg('Şifre sıfırlama bağlantısı için önce e-posta adresinizi yazın.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/?reset=1`,
    });
    if (error) setErrorMsg('Şifre sıfırlama e-postası gönderilemedi. E-posta adresini kontrol edin.');
    else setResetSent(true);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-emerald-50 text-slate-600 flex items-center justify-center text-sm">Oturum kontrol ediliyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #3DAA5C 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-7 shadow-xl shadow-emerald-900/5 space-y-6 relative z-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 mx-auto flex items-center justify-center"><Lock className="w-7 h-7" /></div>
        <div>
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest block mb-1">Yetkili İç Komuta Merkezi</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Embay Yapı ve Kiralık İş Makineleri</h1>
          <p className="text-xs text-slate-500 mt-1.5">Bu panel halka açık değildir. Yetkili kullanıcı hesabıyla giriş yapın.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4 text-left text-xs">
          <label className="block"><span className="text-slate-700 font-semibold block mb-1.5">E-posta</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-emerald-500" /></label>
          <label className="block"><span className="text-slate-700 font-semibold block mb-1.5">Şifre</span><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-emerald-500" /></label>
          {errorMsg && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0 text-rose-700" /><span>{errorMsg}</span></div>}
          <button type="submit" disabled={isLoading} className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"><ShieldCheck className="w-4 h-4" /><span>Güvenli Giriş Yap</span><ArrowRight className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={handlePasswordReset} className="w-full text-xs text-slate-500 hover:text-emerald-700 transition">Şifremi sıfırlama bağlantısı gönder</button>
          {resetSent && <p className="text-center text-xs text-emerald-700">Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.</p>}
        </form>
        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /><span>Supabase Auth ile korunan yönetici oturumu</span></div>
      </div>
    </div>
  );
}
