export const APP_DOMAINS = [
  // Core Domains
  { id: 'books', label: 'Books', type: 'book', icon: 'BookOpen' },
  { id: 'presentations', label: 'Presentations', type: 'presentation', icon: 'Mic' },
  { id: 'tasks', label: 'Tasks', type: 'task', icon: 'CheckCircle2' },
  
  // Modules merged as Domains
  { 
    id: 'dowra', 
    label: 'Dowra e Quran', 
    type: 'dowra',
    icon: 'BookOpen',
    subOptions: [
      { id: 'dowra_25_26', label: 'Islamic Year 2025-26' },
      { id: 'dowra_24_25', label: 'Islamic Year 2024-25' }
    ]
  },
  { 
    id: 'tafsir', 
    label: 'Tafsir',
    type: 'tafsir',
    icon: 'BookOpen',
    subOptions: [
      { id: 'tafsir_nisaa', label: 'Surah Nisaa' }
    ]
  },
  { 
    id: 'seerah', 
    label: 'Seerah',
    type: 'seerah',
    icon: 'BookOpen'
  },
  { 
    id: 'articles', 
    label: 'Articles',
    type: 'articles',
    icon: 'BookOpen'
  }
] as const;

export const MODULES = APP_DOMAINS.filter(d => 
  !['book', 'presentation', 'task'].includes(d.type as string)
);

export const ISLAMIC_BOOKS = [
  "Sahih Bukhari",
  "Sahih Muslim",
  "Sunan Abu Dawood",
  "Jami' at-Tirmidhi",
  "Sunan an-Nasa'i",
  "Sunan Ibn Majah",
  "Muwatta Imam Malik",
  "Riyadh as-Salihin",
  "Bulugh al-Maram"
];