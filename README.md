# Evolve — reprise du sport à la maison

Application mobile (iOS et Android) de reprise du sport à la maison avec peu de matériel : une barre longue,
deux barres d'haltères et 30 kg de disques. Programme de 4 semaines, séance du jour, chrono, suivi du poids
et du tour de taille, rappels quotidiens, données hors ligne et synchro facultative via un compte.

> v1 personnelle, pensée pour devenir un produit gratuit avec achats intégrés (kits programme, nutrition,
> mobilité). Pas de paiement dans cette version.

## Stack

| Besoin | Choix |
| --- | --- |
| Framework | **Expo SDK 58** (React Native 0.88, nouvelle architecture), TypeScript strict |
| Navigation | Expo Router (fichiers dans `src/app`) |
| État + hors ligne | Zustand + persistance AsyncStorage |
| Compte + synchro | Supabase (Auth e-mail / mot de passe + Postgres avec RLS), facultatif |
| Rappels | `expo-notifications` (notifications locales planifiées) |
| Chrono | `expo-audio` (bip), `expo-haptics` + `Vibration`, `expo-keep-awake` |
| Graphiques | `react-native-svg` (courbe maison, légère) |
| Tests | Jest (`jest-expo`) sur la logique métier |

Pourquoi Expo plutôt que Flutter : un seul code TypeScript, test immédiat sur ton téléphone avec Expo Go,
builds et publication sur les stores dans le cloud (EAS) sans Mac pour Android et sans Xcode local pour iOS,
mises à jour à distance (EAS Update), et un écosystème mûr pour les achats intégrés plus tard
(RevenueCat / `react-native-iap`).

Détails : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Lancer l'app sur ton téléphone

Prérequis : Node.js 20 ou plus récent sur ton ordinateur, et l'app **Expo Go** (App Store / Google Play) sur ton téléphone.

```bash
git clone <ce dépôt> && cd Evolve-
npm install
npx expo start
```

Scanne le QR code affiché :
- **iPhone** : avec l'appareil photo, puis ouvre le lien dans Expo Go ;
- **Android** : depuis Expo Go (« Scan QR code »).

Le téléphone et l'ordinateur doivent être sur le même Wi-Fi. Sinon : `npx expo start --tunnel`.

Tout fonctionne dans Expo Go : séances, chrono, son, vibration, écran maintenu allumé, suivi et rappels
(notifications locales). Pour une app installée « pour de vrai » (icône, sans Expo Go), voir
« Build installable » plus bas.

### Commandes utiles

```bash
npm test            # tests de la logique (planning, progression, synchro)
npm run typecheck   # vérification TypeScript
npm run lint        # ESLint
npx expo start --web  # aperçu rapide dans le navigateur (sans notifications ni vibration)
```

## Synchro entre appareils (facultatif)

Sans configuration, l'app est 100 % hors ligne : les données restent sur le téléphone (avec export JSON
dans Réglages). Pour activer le compte et la sauvegarde en ligne :

1. Crée un projet gratuit sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécute [`supabase/schema.sql`](supabase/schema.sql) (table + règles d'accès RLS).
3. Dans **Authentication > Providers**, laisse « Email » activé (tu peux désactiver la confirmation
   d'e-mail pour un usage perso).
4. Copie `.env.example` en `.env` et renseigne l'URL et la clé `anon` (Project Settings > API).
5. Relance `npx expo start` puis connecte-toi dans **Réglages > Compte et synchro**.

La synchro se fait au démarrage, au retour dans l'app et quelques secondes après chaque modification.
Les séances et mesures sont fusionnées élément par élément (rien n'est perdu si tu utilises deux
appareils hors ligne), les réglages suivent la règle « la modification la plus récente gagne ».

## Contenu du programme

Le programme est un fichier de données, séparé du code :
[`content/programs/reprise-maison-4-semaines.json`](content/programs/reprise-maison-4-semaines.json).

- `schedule` : planning de la semaine (`rotation:full` = alternance A/B lundi, mercredi, vendredi ;
  M mardi, jeudi, samedi ; O dimanche).
- `warmup` : les 5 mouvements de mobilité ajoutés au début de chaque séance.
- `sessions` : blocs de chaque séance, avec **une entrée de paramètres par semaine** (séries,
  répétitions ou durée, tempo, repos). Après la semaine 4, la semaine 4 se répète (`repeatLastWeek`).
- `repsPctMax` : répétitions en % de ton max de pompes (réglable dans l'app).
- `exercises` : nom, muscles, matériel, étapes, conseils, liens de démonstration, charge par défaut,
  et un champ `media` prévu pour les images / vidéos embarquées hors ligne.

Pour ajouter un programme : copie le fichier JSON, modifie-le, puis ajoute-le dans `content/index.ts`.
Le contenu est vérifié au démarrage (exercice inconnu, paramètres manquants…) avec un message explicite.

## Build installable (sans Expo Go)

```bash
npm install -g eas-cli   # ou npx eas-cli@latest …
eas login
eas build:configure
eas build --profile preview --platform android   # APK à installer directement
eas build --profile production --platform ios    # nécessite un compte Apple Developer
```

Les variables `EXPO_PUBLIC_SUPABASE_*` doivent aussi être définies dans EAS
(`eas env:create`) pour les builds cloud.

## Publication future

Voir [docs/PUBLICATION.md](docs/PUBLICATION.md) : comptes développeur, politique de confidentialité,
mentions santé, fiches stores, achats intégrés.

## Structure

```
content/                 Programmes (JSON) + registre
src/app/                 Écrans (Expo Router)
  (tabs)/index.tsx       Aujourd'hui
  (tabs)/seances.tsx     Liste des séances
  (tabs)/suivi.tsx       Poids, tour de taille, historique
  (tabs)/reglages.tsx    Réglages, rappel, compte
  seance/index.tsx       Séance en cours
  apercu/[id].tsx        Aperçu d'une séance (progression S1–S4)
  exercice/[id].tsx      Explication d'un exercice
src/domain/              Logique pure et testée (planning, progression, durée, fusion)
src/store/               État persistant (Zustand + AsyncStorage)
src/services/            Notifications, synchro Supabase, son et vibration
src/components/          Composants d'interface
supabase/schema.sql      Schéma de la base pour la synchro
```
