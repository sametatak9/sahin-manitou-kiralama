import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Filter,
  ArrowRight,
  Plus,
  Play,
  RotateCw,
  Sliders,
  Send,
  Trash2,
  Edit3,
  Image,
  Bell,
  MessageCircle,
  FolderPlus,
  X,
  ExternalLink
} from 'lucide-react';
import { ContentItem, PlatformType } from '../../types';

interface ContentCalendarViewProps {
  contentItems: ContentItem[];
  onApproveContent: (id: string) => void;
  onGenerate30DayPlan: () => void;
  onAddContent: (item: Omit<ContentItem, 'id' | 'approvalStatus' | 'publishStatus'>) => void;
  onUpdateContent: (id: string, updated: Partial<ContentItem>) => void;
  onDeleteContent: (id: string) => void;
  onClearAllPlans: () => void;
}

export const ContentCalendarView: React.FC<ContentCalendarViewProps> = ({
  contentItems,
  onApproveContent,
  onGenerate30DayPlan,
  onAddContent,
  onUpdateContent,
  onDeleteContent,
  onClearAllPlans
}) => {
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST' | 'CAMPAIGNS'>('KANBAN');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal State for New / Edit Content
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  // Form States
  const [formCampaignTitle, setFormCampaignTitle] = useState('Fuar & Şantiye Paylaşımları');
  const [formTitle, setFormTitle] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formPlatform, setFormPlatform] = useState<PlatformType>('INSTAGRAM');
  const [formPlannedDate, setFormPlannedDate] = useState('');
  const [formPlannedTime, setFormPlannedTime] = useState('10:30');
  const [formMediaUrl, setFormMediaUrl] = useState('');
  const [formHashtags, setFormHashtags] = useState('#manitoukiralama #embayyapi #tozkoparan');
  const [formCta, setFormCta] = useState('Bilgi & Rezervasyon: 0531 436 29 04');
  const [formAlarmSet, setFormAlarmSet] = useState(false);
  const [formAlarmNote, setFormAlarmNote] = useState('');
  const [formRecipientPhone, setFormRecipientPhone] = useState('0531 436 29 04');

  // WhatsApp Send Modal State
  const [whatsappModalItem, setWhatsappModalItem] = useState<ContentItem | null>(null);
  const [targetPhone, setTargetPhone] = useState('0531 436 29 04');
  const [customWhatsappNote, setCustomWhatsappNote] = useState('');

  // Campaigns List (Dynamic extraction)
  const allCampaigns = Array.from(
    new Set(
      contentItems
        .map((i) => i.campaignTitle || i.campaign || 'Genel Şantiye Paylaşımları')
        .filter(Boolean)
    )
  );

  const openCreateModal = (campaignName?: string) => {
    setEditingItem(null);
    setFormCampaignTitle(campaignName || 'Fuar Paylaşımları');
    setFormTitle('');
    setFormCaption('');
    setFormPlatform('INSTAGRAM');
    const today = new Date().toISOString().split('T')[0];
    setFormPlannedDate(today);
    setFormPlannedTime('10:30');
    setFormMediaUrl('');
    setFormHashtags('#manitoukiralama #embayyapi #tozkoparan');
    setFormCta('Bilgi & Rezervasyon: 0531 436 29 04');
    setFormAlarmSet(true);
    setFormAlarmNote('Paylaşım saati hatırlatıcısı');
    setFormRecipientPhone('0531 436 29 04');
    setIsModalOpen(true);
  };

  const openEditModal = (item: ContentItem) => {
    setEditingItem(item);
    setFormCampaignTitle(item.campaignTitle || item.campaign || 'Genel');
    setFormTitle(item.title);
    setFormCaption(item.caption);
    setFormPlatform(item.platform);
    const parts = item.plannedAt.split(' ');
    setFormPlannedDate(parts[0] || '');
    setFormPlannedTime(parts[1] || '10:30');
    setFormMediaUrl(item.mediaUrl || '');
    setFormHashtags(item.hashtags?.join(' ') || '');
    setFormCta(item.cta || '');
    setFormAlarmSet(Boolean(item.alarmSet));
    setFormAlarmNote(item.alarmNote || '');
    setFormRecipientPhone(item.recipientPhone || '0531 436 29 04');
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const plannedAtCombined = `${formPlannedDate} ${formPlannedTime}`;
    const parsedHashtags = formHashtags
      .split(' ')
      .map((h) => h.trim())
      .filter((h) => h.startsWith('#'));

    if (editingItem) {
      onUpdateContent(editingItem.id, {
        campaignTitle: formCampaignTitle,
        campaign: formCampaignTitle,
        title: formTitle,
        caption: formCaption,
        platform: formPlatform,
        plannedAt: plannedAtCombined,
        mediaUrl: formMediaUrl || undefined,
        hashtags: parsedHashtags.length > 0 ? parsedHashtags : ['#embayyapi', '#manitoukiralama'],
        cta: formCta,
        alarmSet: formAlarmSet,
        alarmNote: formAlarmNote,
        recipientPhone: formRecipientPhone
      });
    } else {
      onAddContent({
        platform: formPlatform,
        account:
          formPlatform === 'INSTAGRAM'
            ? '@sahinmanitou_kiralama'
            : formPlatform === 'FACEBOOK'
            ? 'Şahin Manitou & Embay Yapı'
            : 'Embay Yapı & Şahin Manitou (Güngören)',
        plannedAt: plannedAtCombined,
        timezone: 'Europe/Istanbul',
        title: formTitle,
        caption: formCaption,
        hashtags: parsedHashtags.length > 0 ? parsedHashtags : ['#embayyapi', '#manitoukiralama'],
        cta: formCta,
        mediaType: 'IMAGE',
        mediaUrl: formMediaUrl || undefined,
        bot: 'İnsan Planlaması (Samet Bey)',
        campaign: formCampaignTitle,
        campaignTitle: formCampaignTitle,
        alarmSet: formAlarmSet,
        alarmNote: formAlarmNote,
        recipientPhone: formRecipientPhone
      });
    }
    setIsModalOpen(false);
  };

  const handleSendViaWhatsApp = (item: ContentItem) => {
    const cleanPhone = (targetPhone || '0531 436 29 04').replace(/\D/g, '');
    const message = `*${item.campaignTitle || item.campaign || 'İçerik Planı'}*\n📌 *Başlık:* ${item.title}\n📱 *Platform:* ${item.platform}\n⏰ *Tarih:* ${item.plannedAt}\n\n📝 *Metin:*\n${item.caption}\n\n🔗 ${item.cta}\n${item.mediaUrl ? `\n🖼️ *Görsel:* ${item.mediaUrl}` : ''}\n${customWhatsappNote ? `\n💬 *Not:* ${customWhatsappNote}` : ''}`;
    
    const url = `https://wa.me/90${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setWhatsappModalItem(null);
  };

  const filteredItems = contentItems.filter((item) => {
    if (platformFilter !== 'ALL' && item.platform !== platformFilter) return false;
    if (
      selectedCampaignFilter !== 'ALL' &&
      (item.campaignTitle || item.campaign) !== selectedCampaignFilter
    )
      return false;
    return true;
  });

  const pendingItems = filteredItems.filter((i) => i.approvalStatus === 'PENDING_APPROVAL');
  const approvedItems = filteredItems.filter(
    (i) => i.approvalStatus === 'APPROVED' && i.publishStatus !== 'PUBLISHED'
  );
  const publishedItems = filteredItems.filter((i) => i.publishStatus === 'PUBLISHED');

  return (
    <div className="space-y-6">
      {/* Top Banner with Actions */}
      <div className="bg-white border border-emerald-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              GERÇEK İÇERİK & KAMPANYA TAKVİMİ
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Yayın Planlama & WhatsApp Sevk Masası
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Fuar paylaşımları, şantiye teslimleri veya kentsel dönüşüm kampanyaları için içerik oluşturabilir, görseller ekleyebilir, alarm kurabilir ve tek tıkla WhatsApp üzerinden operatöre/ekibe gönderebilirsiniz.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Clear all dummy plans button */}
            {contentItems.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Tüm mevcut planları sıfırlamak istediğinize emin misiniz? Kendi özel listelerinizi sıfırdan ekleyebilirsiniz.')) {
                    onClearAllPlans();
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Tüm deneme planlarını temizle"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Mevcut Planları Temizle</span>
              </button>
            )}

            {/* Add new manual content */}
            <button
              onClick={() => openCreateModal()}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Plan / İçerik Ekle</span>
            </button>

            {/* AI Auto generator */}
            <button
              onClick={() => {
                setIsGenerating(true);
                setTimeout(() => {
                  onGenerate30DayPlan();
                  setIsGenerating(false);
                }, 1000);
              }}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Oluşturuluyor...' : '30 Günlük Otomatik Öneri'}</span>
            </button>
          </div>
        </div>

        {/* View Switchers, Platform & Campaign Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100 mt-4 text-xs font-semibold">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'KANBAN'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600'
              }`}
            >
              Kanban Pano ({filteredItems.length})
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'LIST'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600'
              }`}
            >
              Liste Görünümü
            </button>
            <button
              onClick={() => setViewMode('CAMPAIGNS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'CAMPAIGNS'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600'
              }`}
            >
              Kampanya / Liste Grupları ({allCampaigns.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Campaign Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs">Liste/Kampanya:</span>
              <select
                value={selectedCampaignFilter}
                onChange={(e) => setSelectedCampaignFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-emerald-600 font-medium"
              >
                <option value="ALL">Tüm Listeler ({allCampaigns.length})</option>
                {allCampaigns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Platform Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs">Platform:</span>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-emerald-600 font-medium"
              >
                <option value="ALL">Tüm Platformlar</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="GOOGLE_BUSINESS">Google İşletme</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="WHATSAPP_BUSINESS">WhatsApp</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* EMPTY STATE */}
      {contentItems.length === 0 && (
        <div className="bg-white border-2 border-dashed border-emerald-200 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
            <CalendarIcon className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-extrabold text-lg text-slate-900">
              Takvimde Henüz Plan Yok
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tüm deneme verileri temizlendi. Artık gerçek şantiye teslimlerinizi, fuar paylaşımlarınızı veya kentsel dönüşüm kampanyalarınızı ekleyebilirsiniz.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openCreateModal('Fuar Paylaşımları')}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>İlk Planı Ekle (Fuar Paylaşımları)</span>
            </button>
            <button
              onClick={onGenerate30DayPlan}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Taslak Öner</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: CAMPAIGN / LIST GROUP VIEW */}
      {viewMode === 'CAMPAIGNS' && contentItems.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCampaigns.map((camp) => {
              const campItems = contentItems.filter(
                (i) => (i.campaignTitle || i.campaign) === camp
              );
              return (
                <div
                  key={camp}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-emerald-500 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        {campItems.length} İçerik
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {campItems.filter((i) => i.approvalStatus === 'APPROVED').length} Onaylı
                      </span>
                    </div>

                    <h3 className="font-heading font-extrabold text-base text-slate-900">
                      📁 {camp}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      Bu gruptaki paylaşımlar şantiye ve sosyal medya operasyonlarına göre zamanlanmıştır.
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <button
                        onClick={() => openCreateModal(camp)}
                        className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Bu Listeye Ekle</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCampaignFilter(camp);
                          setViewMode('KANBAN');
                        }}
                        className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                      >
                        <span>İçerikleri Gör</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: KANBAN PANO */}
      {viewMode === 'KANBAN' && contentItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Onay Bekleyenler */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Onay Bekleyenler ({pendingItems.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3 relative group"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800">
                      {item.platform}
                    </span>
                    <span className="text-slate-400 font-mono">{item.plannedAt}</span>
                  </div>

                  {item.campaignTitle && (
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      📁 {item.campaignTitle}
                    </div>
                  )}

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>

                  {item.mediaUrl && (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-32 bg-slate-50">
                      <img
                        src={item.mediaUrl}
                        alt="Önizleme"
                        className="w-full h-28 object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.caption}
                  </p>

                  {item.alarmSet && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60">
                      <Bell className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Alarm: {item.alarmNote || 'Hatırlatıcı devrede'}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      {/* Edit Button */}
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Güncelle"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* WhatsApp Button */}
                      <button
                        onClick={() => {
                          setWhatsappModalItem(item);
                          setTargetPhone(item.recipientPhone || '0531 436 29 04');
                        }}
                        className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                        title="WhatsApp İle Gönder"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => onDeleteContent(item.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-800 hover:bg-rose-50 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => onApproveContent(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Onayla</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Onaylandı / Planlandı */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Planlandı / Hazır ({approvedItems.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {approvedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 border border-blue-200 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                      {item.platform}
                    </span>
                    <span className="text-blue-700 font-mono font-semibold">{item.plannedAt}</span>
                  </div>

                  {item.campaignTitle && (
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      📁 {item.campaignTitle}
                    </div>
                  )}

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>

                  {item.mediaUrl && (
                    <div className="rounded-lg overflow-hidden border border-slate-200 max-h-32 bg-slate-50">
                      <img
                        src={item.mediaUrl}
                        alt="Önizleme"
                        className="w-full h-28 object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <p className="text-xs text-slate-600 line-clamp-2">{item.caption}</p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => {
                        setWhatsappModalItem(item);
                        setTargetPhone(item.recipientPhone || '0531 436 29 04');
                      }}
                      className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>WhatsApp İle Gönder</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700"
                        title="Düzenle"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteContent(item.id)}
                        className="p-1 rounded text-rose-400 hover:text-rose-700"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Yayınlandı */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Yayınlandı ({publishedItems.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {publishedItems.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                  Henüz arşive aktarılmış yayınlanmış post yok.
                </div>
              ) : (
                publishedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-700 font-bold">{item.title}</span>
                      <span className="text-[10px] text-slate-400">{item.plannedAt}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{item.caption}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: LIST VIEW */}
      {viewMode === 'LIST' && contentItems.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="p-4">Tarih / Saat</th>
                <th className="p-4">Liste / Kampanya</th>
                <th className="p-4">Platform</th>
                <th className="p-4">Başlık</th>
                <th className="p-4">Görsel</th>
                <th className="p-4">Onay Durumu</th>
                <th className="p-4 text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="p-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                    {item.plannedAt}
                  </td>
                  <td className="p-4 font-bold text-slate-700 whitespace-nowrap">
                    {item.campaignTitle || item.campaign || 'Genel'}
                  </td>
                  <td className="p-4 font-bold text-emerald-800">{item.platform}</td>
                  <td className="p-4 font-semibold text-slate-900 max-w-xs truncate">{item.title}</td>
                  <td className="p-4">
                    {item.mediaUrl ? (
                      <span className="text-[10px] text-emerald-700 font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                        Mevcut
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Yok</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.approvalStatus === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.approvalStatus === 'APPROVED' ? 'Onaylandı' : 'Onay Bekliyor'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs font-semibold"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => {
                          setWhatsappModalItem(item);
                          setTargetPhone(item.recipientPhone || '0531 436 29 04');
                        }}
                        className="px-2 py-1 text-emerald-700 hover:bg-emerald-50 rounded text-xs font-semibold"
                      >
                        WhatsApp
                      </button>
                      {item.approvalStatus === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => onApproveContent(item.id)}
                          className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800"
                        >
                          Onayla
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteContent(item.id)}
                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded text-xs font-semibold"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT CONTENT PLAN */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-700" />
                <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900">
                  {editingItem ? 'İçerik Planını Güncelle' : 'Yeni İçerik Planı Oluştur'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              {/* Campaign / List Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Liste / Kampanya Adı *
                </label>
                <input
                  type="text"
                  value={formCampaignTitle}
                  onChange={(e) => setFormCampaignTitle(e.target.value)}
                  placeholder="Örn: Fuar Paylaşımları, Şantiye Sevk, Tozkoparan Bilgilendirme"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Aynı isimdeki tüm paylaşımlar otomatik olarak tek bir liste altında gruplanır.
                </span>
              </div>

              {/* Title */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">İçerik Başlığı *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Örn: Ankomak Fuarı Manitou MT-X 1840 Tanıtımı"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Platform & Date / Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Platform</label>
                  <select
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value as PlatformType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="GOOGLE_BUSINESS">Google İşletme</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="WHATSAPP_BUSINESS">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tarih</label>
                  <input
                    type="date"
                    value={formPlannedDate}
                    onChange={(e) => setFormPlannedDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  >
                  </input>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Saat</label>
                  <input
                    type="time"
                    value={formPlannedTime}
                    onChange={(e) => setFormPlannedTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Caption / Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Paylaşım Açıklaması / Metni *
                </label>
                <textarea
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  rows={3}
                  placeholder="Sosyal medyada veya WhatsApp mesajında yer alacak metin..."
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              {/* Media URL / Photo */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Fotoğraf / Görsel Bağlantısı (URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formMediaUrl}
                    onChange={(e) => setFormMediaUrl(e.target.value)}
                    placeholder="https://.../manitou-resim.jpg"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  {formMediaUrl && (
                    <a
                      href={formMediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Alarm & WhatsApp Recipient Section */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-emerald-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAlarmSet}
                      onChange={(e) => setFormAlarmSet(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Alarm / Hatırlatıcı Kur</span>
                  </label>
                  <Bell className="w-4 h-4 text-emerald-700" />
                </div>

                {formAlarmSet && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      value={formAlarmNote}
                      onChange={(e) => setFormAlarmNote(e.target.value)}
                      placeholder="Alarm notu: 'Bugün paylaşılacak'"
                      className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs"
                    />
                    <input
                      type="tel"
                      value={formRecipientPhone}
                      onChange={(e) => setFormRecipientPhone(e.target.value)}
                      placeholder="WhatsApp No: 0531 436 29 04"
                      className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs"
                >
                  {editingItem ? 'Değişiklikleri Kaydet' : 'Listeye Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: WHATSAPP SEND MODAL */}
      {/* ========================================================================= */}
      {whatsappModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  WhatsApp İle Gönder
                </h3>
              </div>
              <button
                onClick={() => setWhatsappModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Gönderilecek Numara</label>
                <input
                  type="tel"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  placeholder="0531 436 29 04"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Özel İletişim Notu (Opsiyonel)</label>
                <textarea
                  value={customWhatsappNote}
                  onChange={(e) => setCustomWhatsappNote(e.target.value)}
                  rows={2}
                  placeholder="Örn: 'Samet Bey bu postu onayınıza sunuyorum' veya 'Operatör kontrolü'"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-slate-600">
                <span className="font-bold text-slate-800 block">{whatsappModalItem.title}</span>
                <p className="line-clamp-2 text-[11px]">{whatsappModalItem.caption}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsappModalItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleSendViaWhatsApp(whatsappModalItem)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp'ta Aç ve Gönder</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
