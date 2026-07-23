import { Injectable } from '@nestjs/common';

const ENGLISH_TERMS = [
  'fuck',
  'fucking',
  'fucker',
  'shit',
  'bitch',
  'bastard',
  'asshole',
  'damn',
  'cunt',
  'dick',
  'piss',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'retard',
];

const ARABIC_TERMS = [
  'كس',
  'زب',
  'شرموط',
  'عرص',
  'متناك',
  'منيك',
  'قحبة',
  'لبوة',
  'خول',
  'زانية',
  'كسم',
  'يلعن',
  'ابن الكلب',
  'ابنك',
  'حمار',
  'غبي',
  'احا',
  'يا كلب',
];

export type LanguageFilterResult = {
  clean: boolean;
  matchedTerms: string[];
};

@Injectable()
export class ChatLanguageFilterService {
  private readonly englishPatterns: RegExp[];
  private readonly arabicPatterns: RegExp[];

  constructor() {
    this.englishPatterns = ENGLISH_TERMS.map(
      (term) => new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i'),
    );
    this.arabicPatterns = ARABIC_TERMS.map(
      (term) => new RegExp(this.escapeRegex(this.normalizeArabic(term)), 'i'),
    );
  }

  check(content: string): LanguageFilterResult {
    const normalized = this.normalize(content);
    const matchedTerms = new Set<string>();

    for (const pattern of this.englishPatterns) {
      if (pattern.test(normalized)) {
        matchedTerms.add(pattern.source.replace(/\\b/g, ''));
      }
    }

    const arabicNormalized = this.normalizeArabic(normalized);
    for (const term of ARABIC_TERMS) {
      const normalizedTerm = this.normalizeArabic(term);
      if (normalizedTerm && arabicNormalized.includes(normalizedTerm)) {
        matchedTerms.add(term);
      }
    }

    return {
      clean: matchedTerms.size === 0,
      matchedTerms: [...matchedTerms],
    };
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[@4]/g, 'a')
      .replace(/3/g, 'e')
      .replace(/1/g, 'i')
      .replace(/0/g, 'o')
      .replace(/\$/g, 's')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeArabic(value: string): string {
    return value
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
