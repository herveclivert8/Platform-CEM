/**
 * Fonctionnalités activables. Passer une valeur à `true` puis reconstruire le site (npm run build)
 * pour la réafficher : rien n'a été supprimé, le backend reste en place.
 */
export const FEATURES = {
  /**
   * Lettre d'information : formulaire d'abonnement en bas de page et page admin « Abonnés newsletter ».
   * Masquée tant que le CEM n'envoie pas de lettres (l'envoi se fait avec un outil externe, à partir
   * de l'export CSV des abonnés). Les liens de confirmation / désinscription déjà envoyés restent valides.
   */
  newsletter: false,
};
