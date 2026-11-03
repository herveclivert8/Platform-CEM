import { HandHeart, Handshake, UserPlus, type LucideIcon } from "lucide-react";

export type MembershipType = "ACTIVE" | "BENEFACTOR" | "SPONSOR";
/** Types that leave their details instead of creating an account. */
export type SupporterKind = Exclude<MembershipType, "ACTIVE">;

/** The three membership types, in display order. Texts: i18n `membership_types.<key>`. */
export const MEMBERSHIP_TYPES: { key: MembershipType; icon: LucideIcon; anchor: string }[] = [
  { key: "ACTIVE", icon: UserPlus, anchor: "membres-actifs" },
  { key: "BENEFACTOR", icon: HandHeart, anchor: "membres-bienfaiteurs" },
  { key: "SPONSOR", icon: Handshake, anchor: "parrains-marraines" },
];

/** Section of « Qui sommes-nous » describing the membership types in full. */
export const MEMBERSHIP_TYPES_SECTION = "types-adhesion";
