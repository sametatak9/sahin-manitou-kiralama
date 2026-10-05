// İstanbul'un 39 ilçesi (site yazıları ve ilçe sayfaları). Sıra: villa / müstakil ev talebine göre öncelik.
export const ISTANBUL_DISTRICTS = [
  'Çatalca', 'Silivri', 'Büyükçekmece', 'Arnavutköy', 'Beylikdüzü', 'Esenyurt', 'Şile', 'Beykoz', 'Sarıyer', 'Eyüpsultan', 'Başakşehir', 'Sancaktepe', 'Çekmeköy',
  'Tuzla', 'Pendik', 'Avcılar', 'Küçükçekmece', 'Kartal', 'Maltepe', 'Ümraniye', 'Ataşehir', 'Sultanbeyli', 'Sultangazi', 'Gaziosmanpaşa', 'Bahçelievler', 'Bağcılar',
  'Güngören', 'Esenler', 'Bayrampaşa', 'Zeytinburnu', 'Bakırköy', 'Fatih', 'Beyoğlu', 'Şişli', 'Kağıthane', 'Beşiktaş', 'Kadıköy', 'Üsküdar', 'Adalar',
] as const;

export const slugTr = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Bulunma eki: Çatalca'da, Silivri'de, Esenyurt'ta, Beşiktaş'ta */
export function locative(name: string) {
  const low = name.toLocaleLowerCase('tr-TR');
  const vowels = [...low].filter((c) => 'aeıioöuü'.includes(c));
  const last = vowels[vowels.length - 1] ?? 'a';
  const v = 'aıou'.includes(last) ? 'a' : 'e';
  const c = 'fstkçşhp'.includes(low[low.length - 1]) ? 't' : 'd';
  return `${name}'${c}${v}`;
}

export const DISTRICTS = ISTANBUL_DISTRICTS.map((name) => ({ name, slug: slugTr(name) }));
