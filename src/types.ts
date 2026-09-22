export interface PostTemplate {
  id: string;
  title: string;
  category: 'gbp' | 'reels' | 'review' | 'qa' | 'story';
  targetAudience: string;
  hook?: string;
  content: string;
  callToAction: string;
  hashtags?: string[];
  tip?: string;
}

export interface KeywordCategory {
  title: string;
  intent: 'İş Makinesi Kiralama' | 'İnşaat & Taahhüt' | 'Bölgesel / Semt Bazlı';
  keywords: {
    term: string;
    monthlyInterest: 'Çok Yüksek' | 'Yüksek' | 'Hedef / Spesifik';
    usageArea: string;
  }[];
}

export interface DayPlan {
  day: string;
  dayNumber: number;
  platform: 'Google GBP' | 'Instagram (@embayyapi)' | 'Müşteri WhatsApp' | 'Web Sitesi';
  action: string;
  goal: string;
  details: string;
  copyText: string;
}
