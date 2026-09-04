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
