#!/usr/bin/env bash
# Vercel "Ignored Build Step": exit 0 = derlemeyi atla, exit 1 = derle.
# Hobby planda günlük 100 deploy sınırı var ve her push iki projeyi (panel + site) derliyor.

# main'e giden (production) derleme hep yapılır.
if [ "$VERCEL_ENV" = "production" ]; then exit 1; fi

# Site projesi aynı kodu derler; PR önizlemesini panel projesi zaten doğruluyor.
case "$VERCEL_PROJECT_PRODUCTION_URL" in
  *panel*) ;;
  *) echo "Site projesi: önizleme atlandı"; exit 0 ;;
esac

# Panel önizlemesi yalnız arayüz dosyaları değiştiyse; HEAD^ okunamazsa güvenli tarafta kalıp derler.
if git diff --quiet HEAD^ HEAD -- src public index.html vite.config.ts tsconfig.json package.json package-lock.json vercel.json scripts/vercel-ignore.sh 2>/dev/null; then
  echo "Arayüz değişikliği yok: önizleme atlandı"; exit 0
fi
exit 1
