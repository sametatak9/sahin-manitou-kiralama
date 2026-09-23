/**
 * Sosyal medya yayın köprüsü.
 * Yayın yalnızca ops edge function üzerinden, onaylı içerik ve bağlı hesapla yapılır.
 * Sonuç her zaman platform API yanıtıdır; bağlantı yoksa hata döner (sahte başarı yok).
 */
import { callOps } from '../ops/lib/api';

export interface PublishResult {
  published: boolean;
  publication_id: string;
  external_post_id: string;
  external_url: string | null;
}

export function publishApprovedContent(contentId: string, platform?: string): Promise<PublishResult> {
  return callOps<PublishResult>('publish_content', { content_id: contentId, platform });
}
