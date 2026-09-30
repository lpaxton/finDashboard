/*
 * The server's own voice, in the reader's language (AX-12).
 *
 * The dashboard has its own dictionary for what it renders itself. This one is for the prose
 * the backend composes: a next action's title and the reason under it, what the activity log
 * says the platform did, the line that says a suggestion is only a draft.
 *
 * The line between the two files is not arbitrary. The dashboard translates what it writes;
 * the server translates what it writes. Neither translates the other's.
 *
 * And neither translates a RECORD. A household's name, a person's name, an alert or compliance
 * item as it arrives from the custodian or the CRM: those are data, and a platform that
 * rewrites them has changed the record. In this mock those arrive as fixtures and stay English;
 * in a real build the rules engine that emits an alert would compose its title through here,
 * the same way nextActions() does below.
 */

const FR = {
  // next actions (PL-02)
  'Reconnect with {name}': 'Reprendre contact avec {name}',
  'No contact in {n} days.': 'Aucun contact depuis {n} jours.',
  'Flagged as high severity {when}.': 'Signalé comme critique {when}.',
  'Review the draft to {name}': 'Relire le brouillon destiné à {name}',
  'the practice': 'le cabinet',
  'Flagged for compliance review {when}.': 'Signalé pour contrôle de conformité {when}.',
  'Review harvesting for {name}': 'Étudier la concrétisation des moins-values pour {name}',
  'About {amount} of unrealised losses.': 'Environ {amount} de moins-values latentes.',
  'Prepare for {name}': 'Préparer {name}',
  '{type} on {when} has no prep.': '{type} du {when} sans préparation.',
  'Move {name} forward': 'Faire avancer {name}',
  '{open} of {total} steps outstanding: {steps}.': '{open} étapes sur {total} restantes : {steps}.',
  'These are drafts. Nothing has been created, and nothing will be until you add one to your follow-ups.':
    'Ce sont des brouillons. Rien n’a été créé, et rien ne le sera tant que vous n’en aurez pas ajouté un à vos suivis.',

  // when something happened, in words rather than in days (UX-004)
  'today': 'aujourd’hui',
  'yesterday': 'hier',
  '{n} days ago': 'il y a {n} jours',
  'tomorrow': 'demain',

  // the activity log (X-05)
  'Ranked today by role': 'Journée classée par rôle',
  'Clients first today: the day has two reviews and a market move.':
    'Les clients d’abord aujourd’hui : deux revues et un mouvement de marché.',
  'Prepared the briefs for today’s meetings': 'Préparé les notes des rendez-vous du jour',
  'From custodian records, your CRM and your calendar.': 'D’après les relevés du conservateur, votre CRM et votre agenda.',
  'Checked every household against its policy limits': 'Contrôlé chaque foyer au regard de ses limites',
  'One breach found and flagged.': 'Un dépassement détecté et signalé.',
  'Read overnight custodian records': 'Lu les relevés du conservateur de la nuit',
  'Balances, positions and open tax lots are current as of 6:10am.':
    'Les soldes, les positions et les lots fiscaux ouverts sont à jour à 6 h 10.',
  '{name} opened your book': '{name} a consulté votre portefeuille',
  'A principal can read the firm’s records for your households. They cannot act in your name, and this is the record of it.':
    'Un dirigeant peut consulter les données du cabinet relatives à vos foyers. Il ne peut pas agir en votre nom, et ceci en est la trace.',
  'Shared "{title}" with {name}': '« {title} » partagé avec {name}',
  'The client can see this. Sharing cannot be taken back from here.':
    'Le client peut le voir. Un partage ne peut pas être annulé d’ici.',
  'Added to your follow-ups: {title}': 'Ajouté à vos suivis : {title}',
  'From a meeting the platform drafted next steps for.':
    'Issu d’un rendez-vous pour lequel la plateforme a proposé des prochaines étapes.',
  'Completed: {title}': 'Terminé : {title}',
  'Reopened: {title}': 'Rouvert : {title}',
  'Connected {name}': '{name} connecté',
  'Disconnected {name}': '{name} déconnecté',
  'Set aside the alert: {title}': 'Alerte mise de côté : {title}',
  'Put away the alert: {title}': 'Alerte écartée : {title}',
  'Reopened the alert: {title}': 'Alerte rouverte : {title}',
  'Comes back {when}': 'Revient {when}',
  'Edited the message to {name}': 'Message à {name} modifié',
  'The text changed.': 'Le texte a été modifié.',
  'The subject changed.': 'L’objet a été modifié.',
  'Sent the message to {name}': 'Message envoyé à {name}',
  'Approved the message to {name}': 'Message à {name} approuvé',
  'Returned the message to {name} to draft': 'Message à {name} repassé en brouillon',
  'This left the firm and cannot be taken back.': 'Ceci a quitté le cabinet et ne peut pas être rappelé.',

  // portfolio signals (FO-09)
  'Tax-loss harvesting opportunities': 'Moins-values à concrétiser',
  'About {amount} in unrealized losses': 'Environ {amount} de moins-values latentes',
  'Households over concentration limit': 'Foyers au-delà de la limite de concentration',
  'Largest: {n}% in one holding': 'Plus élevée : {n} % sur une seule position',
  'Households outside target allocation': 'Foyers hors allocation cible',
  'Drift beyond 5 points': 'Écart supérieur à 5 points',
  'Households with idle cash above 10%': 'Foyers avec plus de 10 % de liquidités dormantes',
  'About {amount} total': 'Environ {amount} au total',
  'Resolved the alert: {title}': 'Alerte résolue : {title}',

  // reporting metrics (PO-07, AX-08) — the label under every number on a scorecard or a report
  'Households': 'Foyers',
  'Assets under management': 'Encours sous gestion',
  'Meetings held': 'Rendez-vous tenus',
  'Meetings scheduled': 'Rendez-vous planifiés',
  'Follow-ups completed': 'Suivis terminés',
  'Follow-ups overdue': 'Suivis en retard',
  'Messages sent': 'Messages envoyés',
  'Messages awaiting approval': 'Messages en attente d’approbation',
  'Compliance items overdue': 'Obligations de conformité en retard',
  'Households not contacted in 45 days': 'Foyers sans contact depuis 45 jours',

  // what the firm is billed for (PO-10)
  'AI drafts generated': 'Brouillons générés par l’IA',
  'Meeting transcription': 'Transcription de rendez-vous',
  'Documents processed': 'Documents traités',
  'drafts': 'brouillons',
  'hours': 'heures',
  'documents': 'documents',

  // SimGPT — the scene, which is a statement of the record and never an invention
  '{type} with {who}. Last contact {when}. {open}': '{type} avec {who}. Dernier contact {when}. {open}',
  'Likely to come up: {list}.': 'Sujets probables : {list}.',
  'Nothing is open on the record.': 'Rien n’est ouvert au dossier.',
  'not recorded': 'non renseigné',
  'a prospect': 'un prospect',
  'losses worth harvesting': 'des moins-values à concrétiser',
  'a holding over the concentration limit': 'une position au-delà de la limite de concentration',
  'drift from the target allocation': 'un écart par rapport à l’allocation cible',
  'more cash than the target': 'plus de liquidités que la cible'
};

const DICT = { fr: FR };

/* Same contract as the dashboard's t(): the English string is the key, a missing entry renders
   the English rather than a key, and placeholders are filled after lookup so the French can put
   them in a different order. */
export function tr(lang, key, vars) {
  const dict = DICT[lang];
  let out = (dict && dict[key]) || key;
  if (vars) for (const k of Object.keys(vars)) out = out.split('{' + k + '}').join(vars[k]);
  return out;
}

/* For a caller that has a language and wants to stop passing it. */
export const translator = (lang) => (key, vars) => tr(lang, key, vars);
