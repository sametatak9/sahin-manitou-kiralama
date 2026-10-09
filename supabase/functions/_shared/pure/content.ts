export interface ContentDraft {
  title: string;
  headline: string;
  caption: string;
  hashtags: string[];
  cta: string;
  image_idea: string;
  design_brief: string;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function normalizeContentDraft(input: unknown): ContentDraft {
  const row = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const rawHashtags = Array.isArray(row.hashtags) ? row.hashtags : [];
  const hashtags = rawHashtags
    .map(text)
    .filter(Boolean)
    .map((tag) => tag.startsWith('#') ? tag : `#${tag}`)
    .slice(0, 20);
  return {
    title: text(row.title),
    headline: text(row.headline),
    caption: text(row.caption),
    hashtags,
    cta: text(row.cta),
    image_idea: text(row.image_idea),
    design_brief: text(row.design_brief),
  };
}

export function contentDraftErrors(draft: ContentDraft): string[] {
  const errors: string[] = [];
  for (const field of ['title', 'headline', 'caption', 'cta', 'image_idea', 'design_brief'] as const) {
    if (!draft[field]) errors.push(field);
  }
  if (!draft.hashtags.length) errors.push('hashtags');
  return errors;
}
