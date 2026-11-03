export interface SocialLinks {
  facebookUrl: string | null;
  xUrl: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
}

export interface SocialLinksDto {
  facebook_url: string | null;
  x_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
}

export function mapSocialLinks(dto: SocialLinksDto): SocialLinks {
  return {
    facebookUrl: dto.facebook_url,
    xUrl: dto.x_url,
    linkedinUrl: dto.linkedin_url,
    youtubeUrl: dto.youtube_url,
  };
}

export interface SocialLinksInput {
  facebookUrl?: string;
  xUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
}

export interface PaymentInfo {
  mobileMoneyHolder: string | null;
  mvolaNumber: string | null;
  orangeMoneyNumber: string | null;
  airtelMoneyNumber: string | null;
}

export interface PaymentInfoDto {
  mobile_money_holder: string | null;
  mvola_number: string | null;
  orange_money_number: string | null;
  airtel_money_number: string | null;
}

export function mapPaymentInfo(dto: PaymentInfoDto): PaymentInfo {
  return {
    mobileMoneyHolder: dto.mobile_money_holder,
    mvolaNumber: dto.mvola_number,
    orangeMoneyNumber: dto.orange_money_number,
    airtelMoneyNumber: dto.airtel_money_number,
  };
}

export type PaymentInfoInput = { [K in keyof PaymentInfo]: string };

/**
 * Home page & footer content set by the super admin, in French only. Read in the visitor's language:
 * English texts are automatic translations (French until the translation is ready).
 * A null field means "use the site's default" (default texts / photo, the four pillars).
 */
export interface HomePage {
  heroImageUrl: string | null;
  /** Full logo (header, footer); null = logo shipped with the site */
  logoUrl: string | null;
  /** Square emblem (browser tab, admin menu, member card, badges); null = shipped emblem */
  logoMarkUrl: string | null;
  heroBadge: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  values: string[] | null;
  /** Comment of each value, same order ("" = none), shown on hover in the footer */
  valueDescriptions: string[] | null;
  /** « Ils nous font confiance »; null = the site's default partners */
  partners: Partner[] | null;
  /** Words the automatic translation keeps as they are, across the whole site */
  untranslatedTerms: string[] | null;
  contactAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  /** Sentence under « Nos antennes »; null = computed from the branches. */
  mapSubtitle: string | null;
  /** Transparency page: publish confirmed donation totals */
  showDonationTotals: boolean;
}

/** Kind of institutional partnership: formal agreement, informal, in development */
export type PartnerGroup = "agreement" | "tacit" | "developing";

export interface Partner {
  group: PartnerGroup;
  name: string;
  url: string | null;
  /** Proper noun: shown as is in English, never translated */
  keepName: boolean;
}

export interface PartnerDto {
  group: PartnerGroup;
  name: string;
  url: string | null;
  keep_name: boolean;
}

export interface HomePageDto {
  hero_image_url: string | null;
  logo_url: string | null;
  logo_mark_url: string | null;
  hero_badge: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  values: string[] | null;
  value_descriptions: string[] | null;
  partners: PartnerDto[] | null;
  untranslated_terms: string[] | null;
  contact_address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  map_subtitle: string | null;
  show_donation_totals: boolean;
  lang: "fr" | "en";
}

export function mapHomePage(dto: HomePageDto): HomePage {
  return {
    heroImageUrl: dto.hero_image_url,
    logoUrl: dto.logo_url,
    logoMarkUrl: dto.logo_mark_url,
    heroBadge: dto.hero_badge,
    heroTitle: dto.hero_title,
    heroSubtitle: dto.hero_subtitle,
    values: dto.values,
    valueDescriptions: dto.value_descriptions,
    partners: dto.partners?.map(({ keep_name, ...p }) => ({ ...p, keepName: keep_name })) ?? null,
    untranslatedTerms: dto.untranslated_terms,
    contactAddress: dto.contact_address,
    contactEmail: dto.contact_email,
    contactPhone: dto.contact_phone,
    mapSubtitle: dto.map_subtitle,
    showDonationTotals: dto.show_donation_totals,
  };
}
