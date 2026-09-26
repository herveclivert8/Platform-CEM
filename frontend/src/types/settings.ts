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

/** Home page cover; a null field means "use the site's default" (translations / default photo). */
export interface HomeHero {
  imageUrl: string | null;
  badgeFr: string | null;
  badgeEn: string | null;
  titleFr: string | null;
  titleEn: string | null;
  subtitleFr: string | null;
  subtitleEn: string | null;
}

export interface HomeHeroDto {
  hero_image_url: string | null;
  hero_badge_fr: string | null;
  hero_badge_en: string | null;
  hero_title_fr: string | null;
  hero_title_en: string | null;
  hero_subtitle_fr: string | null;
  hero_subtitle_en: string | null;
}

export function mapHomeHero(dto: HomeHeroDto): HomeHero {
  return {
    imageUrl: dto.hero_image_url,
    badgeFr: dto.hero_badge_fr,
    badgeEn: dto.hero_badge_en,
    titleFr: dto.hero_title_fr,
    titleEn: dto.hero_title_en,
    subtitleFr: dto.hero_subtitle_fr,
    subtitleEn: dto.hero_subtitle_en,
  };
}

export type HomeHeroInput = Record<keyof HomeHero, string>;
