# Architecture

## Principes

1. **Hors ligne d'abord** : toutes les données vivent sur le téléphone (AsyncStorage). Le réseau ne sert
   qu'à la sauvegarde et à la synchro, jamais au fonctionnement d'une séance.
2. **Contenu séparé du code** : programmes, exercices et progression sont des fichiers JSON validés au
   chargement. Un nouveau programme (ou un kit acheté plus tard) est une donnée, pas une nouvelle version.
3. **Logique pure et testée** : le calcul de la séance du jour, de la semaine, de la progression, de la
   durée et la fusion des données sont des fonctions sans effet de bord (`src/domain`).
4. **Utilisable en pleine séance** : gros chiffres, zones tactiles ≥ 48–60 pt, actions principales en
   bas de l'écran (pouce), écran maintenu allumé, mode clair / sombre.

## Couches

```
┌───────────── Écrans (src/app, Expo Router) ─────────────┐
│ Aujourd'hui · Séances · Suivi · Réglages · Séance · …    │
└───────────────┬───────────────────────────┬─────────────┘
                │ hooks (src/hooks)          │ composants (src/components)
┌───────────────▼────────────┐  ┌───────────▼──────────────┐
│ Store Zustand persistant    │  │ Services                  │
│ réglages, charges, repos,   │  │ notifications, synchro,   │
│ mesures, historique,        │  │ son / vibration           │
│ séance en cours             │  └───────────┬──────────────┘
└───────────────┬────────────┘              │
┌───────────────▼──────────────────────────▼──────────────┐
│ Domaine (pur) : dates, planning, progression, durée,     │
│ fusion pour la synchro                                    │
└───────────────┬──────────────────────────────────────────┘
┌───────────────▼────────────┐
│ Contenu : content/*.json    │
└─────────────────────────────┘
```

## Règles métier

- **Semaine du programme** = `floor(jours depuis la date de départ / 7) + 1`, plafonnée à 4
  (`repeatLastWeek`) : la semaine 4 se répète ensuite.
- **Alternance A/B** : on compte les jours « rotation » (lun, mer, ven) écoulés depuis la date de départ ;
  pair → A, impair → B. L'alternance continue donc d'une semaine sur l'autre (lun A, mer B, ven A, lun B…),
  quel que soit le jour de départ.
- **Pompes** : `répétitions = arrondi(max × %)`, minimum 1.
- **Repos** : valeur du programme, personnalisable par exercice (45 à 120 s), mémorisée.
- **Charges** : mémorisées par exercice, pré-remplies à la séance suivante.
- **Durée estimée** : séries × (répétitions × durée du tempo, ou durée d'effort) + repos + 20 s de
  transition par bloc.
- **Séance en cours** : persistée (on peut quitter l'app et reprendre). À la fin, si des blocs ne sont pas
  validés, l'app propose « Tout valider » ou « Enregistrer tel quel ».

## Chrono

Le chrono stocke **l'heure de fin** plutôt qu'un compteur, ce qui le garde juste si l'app passe brièvement
en arrière-plan. Repos lancé automatiquement quand on coche une série (sauf la toute dernière de la séance),
chrono d'effort pour les exercices en secondes (deux phases gauche / droite pour les exercices par côté),
puis série cochée automatiquement et repos enchaîné. Fin : bip (même en mode silencieux iOS, sans couper
la musique) + vibration.

## Synchro

Une ligne par utilisateur dans `user_state` (JSON). À chaque synchro : lecture distante → fusion → écriture.

- Séances et mesures : fusion par identifiant, la version la plus récente gagne ; les suppressions sont
  conservées sous forme de « pierres tombales » pour ne pas réapparaître.
- Réglages et préférences (charges, repos) : « dernier écrit gagne ».

Ce modèle simple suffit pour un utilisateur sur quelques appareils. Si le volume grossit (années
d'historique, photos), on passera à des tables par entité avec synchro incrémentale.

## Rappels

Notifications locales planifiées sur 30 jours glissants, à l'heure choisie, avec le nom et la durée de la
séance du jour ; les jours déjà faits sont sautés. Reprogrammées à chaque ouverture et à chaque changement
de réglage.

## Évolutions prévues (v2+)

- **Achats intégrés** : RevenueCat (ou `react-native-iap`) ; chaque kit = un ou plusieurs JSON de contenu
  téléchargés et passés à `registerProgram`, avec un champ d'accès (`free` / `entitlement`).
- **Médias hors ligne** : champ `media` des exercices (images / vidéos embarquées ou téléchargées avec
  `expo-file-system`), affichage avec `expo-image` / `expo-video`.
- **Choix du programme** dans Réglages (le registre et `settings.programId` existent déjà).
- **Tests de bout en bout** (Maestro) et suivi d'erreurs (Sentry).
- **Traductions** : textes regroupés dans un fichier de chaînes si une autre langue est ajoutée.
