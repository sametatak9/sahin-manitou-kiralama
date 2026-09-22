# Embay Yapı ve Kiralık İş Makineleri — Uygulama Yol Haritası

## Çalışma ilkesi

Bu proje mevcut çalışan yapı bozulmadan, önce denetim sonra mimari çekirdek, ardından modül modül gerçek veri bağlantısı ve en son production doğrulaması yaklaşımıyla ilerletilecektir. Dış hesap, API anahtarı, OAuth onayı veya kullanıcı müdahalesi gerektiren adımlar yapılabildiği yere kadar uygulanacak; bloke olanlar sonraki aşamaya engel yapılmayacak ve final raporunda açıkça listelenecektir.

## Sıra

1. **Audit ve temizlik:** Public site ile yönetim panelini ayırmak, müşteri-facing metinleri temizlemek, Supabase bağlantısını doğrulamak ve deployment sınırlarını netleştirmek.
2. **Güvenlik çekirdeği:** Gerçek Supabase Auth, roller, RLS, oturum, audit log ve secrets yönetimi.
3. **CRM:** Lead, firma, kişi, duplicate kontrolü, pipeline, notlar, aktiviteler ve gerçek dashboard verileri.
4. **Approval ve sosyal içerik omurgası:** Onay kuyruğu, içerik takvimi, medya varlıkları ve yayın durumları.
5. **Sosyal medya portföy yönetimi:** Platform hesabı, marka profili, kampanya/seri portföyü ve uygulama bazlı gönderi planı.
6. **Tasarım bağlantıları:** Gönderi taslaklarında Figma ve Canva çalışma bağlantıları, tasarım dosyası/şablon referansı, dışa aktarılan medya ve onay ilişkisi. Resmi API veya kullanıcı tarafından sağlanan bağlantılar kullanılacak; hesap erişimi olmayan yerde bağlantı alanı ve güvenli placeholder hazırlanacak.
7. **AI ve SEO:** Orchestrator, SEO/Content/CRM/Social botları, Search Console/GBP/Bing/Yandex resmi veri akışları.
8. **Raporlama:** Aylık plan, platform performansı, lead/dönüşüm, ROI ve özel gün raporları.
9. **Production:** Test, build, deployment, yedekleme, hata yönetimi ve eksiklerin son raporu.

## Sosyal medya portföy ve planlama kapsamı

Sosyal medya yönetim sekmesinde her marka ve platform için ayrı portföy tutulacaktır. Her portföy; hesap, hedef kitle, içerik sütunları, kampanyalar, seri adı, görsel kimlik, hedef ve ölçüm metriklerini içerecektir. Gönderi planı platform ve uygulama bazında yapılacaktır: Instagram gönderisi, Reels, Story, Facebook gönderisi, LinkedIn paylaşımı, Google Business güncellemesi, YouTube Shorts ve TikTok gibi uygulamalar birbirinden farklı metin, ölçü, CTA, medya ve yayın zamanı ile yönetilecektir.

Aylık takvim; eğitici içerik, saha/proje, sempatik mizah, ticari teklif, çevre, sosyal fayda, müşteri güveni ve özel gün başlıklarını içerecektir. Bayramlar, resmi günler, sektör günleri, yerel etkinlikler ve şirketin sosyal sorumluluk faaliyetleri için önceden hazırlanmış rapor formatı bulunacaktır. Her özel gün kaydı; amaç, mesaj, hedef kitle, platformlar, tasarım bağlantısı, metin varyantları, yayın durumu, erişim, etkileşim, lead ve sonraki önerileri içerecektir.

## Marka ve içerik sınırı

Public tarafta müşteri ve arama motorlarının görmesi gereken marka/hizmet içeriği bulunacak; yapay zeka talimatları, iç operasyon notları, promptlar, test PIN'leri, yönetici açıklamaları ve panel verileri public sayfaya taşınmayacaktır. İçerik etik, gerçek ve doğrulanabilir olacak; sahte yorum, spam, otomatik arama sorgusu ve manipülatif SEO kullanılmayacaktır.
