export type PlanId = 'free' | 'pro' | 'creator' | 'newsroom';

export interface PricingPlan {
  id: PlanId;
  name: { el: string; en: string };
  monthlyPrice: number;
  annualPrice: number;
  perSeat?: boolean;
  hoursLabel: { el: string; en: string };
  features: { el: string[]; en: string[] };
  cta: { el: string; en: string };
  highlighted?: boolean;
}

/**
 * Pricing plans for Grecho.
 *
 * Cost basis (see model_pricing.md): enhanced Greek pipeline is ~$0.62/hour
 * (ElevenLabs Scribe v2 + keyterm extraction + corrections), ~$0.44/hour with
 * Gemini fallback. Prices below target Greek purchasing power and keep a
 * healthy margin while undercutting Otter ($8-17) and Good Tape (~$17).
 */
export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: { el: 'Free', en: 'Free' },
    monthlyPrice: 0,
    annualPrice: 0,
    hoursLabel: { el: '30 λεπτά / μήνα', en: '30 minutes / month' },
    features: {
      el: [
        '30 λεπτά μεταγραφής',
        '1 αποθηκευμένο αρχείο',
        'Εξαγωγή με watermark',
        'Βασική αναγνώριση ομιλητών',
      ],
      en: [
        '30 minutes of transcription',
        '1 saved file',
        'Watermarked exports',
        'Basic speaker identification',
      ],
    },
    cta: { el: 'Ξεκινήστε δωρεάν', en: 'Start free' },
  },
  {
    id: 'pro',
    name: { el: 'Pro', en: 'Pro' },
    monthlyPrice: 9,
    annualPrice: 7,
    hoursLabel: { el: '5 ώρες / μήνα', en: '5 hours / month' },
    features: {
      el: [
        '5 ώρες μεταγραφής / μήνα',
        'Όλα τα exports (txt, docx, pdf, υπότιτλοι)',
        'Highlights & quotes με timestamps',
        'AI περίληψη ανά συνέντευξη',
        'Χωρίς watermark',
      ],
      en: [
        '5 hours of transcription / month',
        'All exports (txt, docx, pdf, subtitles)',
        'Highlights & quotes with timestamps',
        'AI summary per interview',
        'No watermark',
      ],
    },
    cta: { el: 'Δοκιμάστε Pro', en: 'Try Pro' },
    highlighted: true,
  },
  {
    id: 'creator',
    name: { el: 'Creator', en: 'Creator' },
    monthlyPrice: 19,
    annualPrice: 15,
    hoursLabel: { el: '30 ώρες / μήνα', en: '30 hours / month' },
    features: {
      el: [
        '30 ώρες μεταγραφής / μήνα',
        'Show notes & κεφάλαια επεισοδίου',
        'Προτάσεις clips για reels/shorts',
        'Αυτόματη μεταγραφή μέσω RSS feed',
        'Προτεραιότητα επεξεργασίας',
      ],
      en: [
        '30 hours of transcription / month',
        'Show notes & episode chapters',
        'Clip suggestions for reels/shorts',
        'Automatic transcription via RSS feed',
        'Priority processing',
      ],
    },
    cta: { el: 'Γίνετε Creator', en: 'Become a Creator' },
  },
  {
    id: 'newsroom',
    name: { el: 'Newsroom', en: 'Newsroom' },
    monthlyPrice: 19,
    annualPrice: 15,
    perSeat: true,
    hoursLabel: { el: '30 ώρες / θέση', en: '30 hours / seat' },
    features: {
      el: [
        'Κοινό workspace για την ομάδα',
        'Συνεργασία σε μεταγραφές',
        'Δικαιώματα & ρόλοι',
        'Priority support',
        'Ειδικές ρυθμίσεις ασφαλείας',
      ],
      en: [
        'Shared team workspace',
        'Collaboration on transcripts',
        'Permissions & roles',
        'Priority support',
        'Custom security settings',
      ],
    },
    cta: { el: 'Επικοινωνήστε μαζί μας', en: 'Contact us' },
  },
];
