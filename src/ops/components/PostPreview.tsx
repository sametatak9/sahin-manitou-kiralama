// Platform-yerel gönderi önizlemesi (IG feed/story, Facebook, LinkedIn, X). Yalnızca görünüm; yayın durumu iddia etmez.
import { Bookmark, Globe2, Heart, MessageCircle, MoreHorizontal, Repeat2, Send, Share2, ThumbsUp } from 'lucide-react';

export function PostPreview({ platform, caption, hashtags = [], imageUrl, headline, account = 'embayyapi' }: { platform: string; caption: string; hashtags?: string[]; imageUrl: string | null; headline?: string | null; account?: string }) {
  const text = `${caption || ''}${hashtags.length ? `\n\n${hashtags.join(' ')}` : ''}`;
  const Img = ({ ratio = '1 / 1' }: { ratio?: string }) => imageUrl
    ? <img src={imageUrl} alt="Gönderi görseli" className="w-full object-cover bg-ink-800" style={{ aspectRatio: ratio }} />
    : <div className="w-full bg-ink-800 flex items-center justify-center text-[11px] text-ink-500 px-4 text-center" style={{ aspectRatio: ratio }}>Görsel yok — Design Studio’dan PNG dışa aktarın</div>;
  const Avatar = () => <span className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-800 text-white text-[10px] font-bold flex items-center justify-center">EY</span>;

  if (platform === 'facebook' || platform === 'linkedin' || platform === 'google_business') {
    return (
      <div className="rounded-2xl bg-white text-slate-900 overflow-hidden shadow-xl ring-1 ring-black/5 max-w-sm mx-auto">
        <div className="flex items-center gap-2 p-3"><Avatar /><div className="leading-tight"><div className="text-[13px] font-semibold">Embay Yapı</div><div className="text-[11px] text-slate-500 flex items-center gap-1">Şimdi · <Globe2 className="w-3 h-3" /></div></div><MoreHorizontal className="w-4 h-4 ml-auto text-slate-400" /></div>
        <p className="px-3 pb-2 text-[13px] whitespace-pre-line line-clamp-6">{text}</p>
        <Img ratio={platform === 'linkedin' ? '1.91 / 1' : '1.2 / 1'} />
        <div className="flex justify-around py-2 text-[12px] text-slate-500 border-t border-slate-100"><span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" />Beğen</span><span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" />Yorum</span><span className="flex items-center gap-1"><Share2 className="w-4 h-4" />Paylaş</span></div>
      </div>
    );
  }
  if (platform === 'x') {
    return (
      <div className="rounded-2xl bg-black text-white p-3 max-w-sm mx-auto ring-1 ring-white/10">
        <div className="flex gap-2"><Avatar /><div className="min-w-0 flex-1"><div className="text-[13px]"><b>Embay Yapı</b> <span className="text-zinc-500">@{account} · şimdi</span></div>
          <p className="text-[13px] whitespace-pre-line mt-1 line-clamp-6">{(headline ? `${headline}\n` : '') + text.slice(0, 280)}</p>
          <div className="mt-2 rounded-2xl overflow-hidden ring-1 ring-white/10"><Img ratio="16 / 9" /></div>
          <div className="flex justify-between text-zinc-500 mt-2 pr-6"><MessageCircle className="w-4 h-4" /><Repeat2 className="w-4 h-4" /><Heart className="w-4 h-4" /><Share2 className="w-4 h-4" /></div>
        </div></div>
      </div>
    );
  }
  if (platform === 'instagram_story') {
    return (
      <div className="relative max-w-[240px] mx-auto rounded-3xl overflow-hidden ring-1 ring-white/10 bg-black" style={{ aspectRatio: '9 / 16' }}>
        {imageUrl ? <img src={imageUrl} alt="Story" className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-[11px] text-ink-500">Görsel yok</div>}
        <div className="absolute top-2 inset-x-2 h-0.5 bg-white/40 rounded"><div className="w-1/3 h-full bg-white rounded" /></div>
        <div className="absolute top-4 left-3 flex items-center gap-2 text-white text-xs font-semibold"><Avatar />{account}</div>
      </div>
    );
  }
  // Instagram feed (varsayılan)
  return (
    <div className="rounded-2xl bg-white text-slate-900 overflow-hidden shadow-xl ring-1 ring-black/5 max-w-sm mx-auto">
      <div className="flex items-center gap-2 p-2.5"><span className="p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600"><span className="block rounded-full bg-white p-[2px]"><Avatar /></span></span><span className="text-[13px] font-semibold">{account}</span><MoreHorizontal className="w-4 h-4 ml-auto" /></div>
      <Img />
      <div className="flex items-center gap-3 px-3 pt-2.5"><Heart className="w-5 h-5" /><MessageCircle className="w-5 h-5" /><Send className="w-5 h-5" /><Bookmark className="w-5 h-5 ml-auto" /></div>
      <p className="px-3 py-2 text-[13px] whitespace-pre-line line-clamp-5"><b>{account}</b> {text}</p>
    </div>
  );
}
