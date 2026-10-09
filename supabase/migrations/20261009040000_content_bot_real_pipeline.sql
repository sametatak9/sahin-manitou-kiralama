-- EMBAY AGENCY OS — Content Bot P0 gerçek çıktı kapısı
-- AI agent'ın tool-use zincirine güvenmek yerine içerik taslağı ve onay akışını
-- sunucu tarafında deterministik sıraya alır: create_content -> save_draft -> submit_approval.
-- Additive: mevcut kayıtlar ve geçmiş koşular değiştirilmez.

update public.automation_skills
set execution_mode = 'pipeline',
    pipeline = array['create_content', 'save_draft', 'submit_approval'],
    instructions = 'Tenant marka kitini kullanarak tek bir içerik üret. Sunucu sırasıyla create_content, save_draft ve submit_approval çağrılarını yapar. İçerik boşsa veya zorunlu alan eksikse başarısız say; yayınlama yapma.',
    updated_at = now()
where skill_key = 'content_scheduler';

update public.ai_agents
set system_prompt = 'Sen Agency OS altında çalışan içerik uzmanısın. Görev bağlamındaki tenant marka kiti ve kullanıcı girdisi tek yetkili kaynaktır. Türkçe veya tenant dilinde yaz; kaynakta olmayan rakam, müşteri, proje, sonuç veya performans iddiası uydurma. Belirsiz bilgiyi [doğrulanacak] olarak işaretle. Yayınlama yerine taslak ve insan onayı akışını koru.',
    updated_at = now()
where agent_key = 'content-writer';
