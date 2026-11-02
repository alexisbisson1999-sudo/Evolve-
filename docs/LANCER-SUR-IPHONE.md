# Lancer Evolve sur ton iPhone — pas à pas

Il te faut : ton iPhone, un ordinateur (Mac ou Windows) et le même Wi-Fi pour les deux.
Durée : environ 20 minutes la première fois, puis 1 minute les fois suivantes.

## Étape 1 — Sur l'iPhone : installer Expo Go

1. Ouvre l'App Store, cherche **Expo Go** et installe-la (gratuite).

## Étape 2 — Créer un compte Expo (gratuit)

Sur iPhone, Expo Go exige d'être connecté au **même compte Expo** que l'ordinateur.

1. Va sur https://expo.dev/signup et crée un compte (note l'e-mail et le mot de passe).
2. Ouvre Expo Go sur l'iPhone, touche l'icône de compte en haut à droite et connecte-toi avec ce compte.

## Étape 3 — Sur l'ordinateur : installer Node.js

1. Va sur https://nodejs.org et télécharge la version **LTS**.
2. Installe-la en laissant les options par défaut.

## Étape 4 — Télécharger le code de l'app

1. Connecté à GitHub, ouvre ce lien (il télécharge un fichier ZIP) :
   https://github.com/alexisbisson1999-sudo/Evolve-/archive/refs/heads/claude/home-fitness-app-v1-euxk48.zip
2. Décompresse le ZIP (double-clic). Tu obtiens un dossier `Evolve--claude-home-fitness-app-v1-euxk48`.
   Place-le par exemple dans **Documents**.

## Étape 5 — Ouvrir un terminal dans ce dossier

- **Mac** : ouvre l'app **Terminal**, tape `cd ` (avec un espace après), fais glisser le dossier dans
  la fenêtre du Terminal, puis appuie sur Entrée.
- **Windows** : ouvre le dossier dans l'Explorateur, clique dans la barre d'adresse en haut, tape `cmd`
  et appuie sur Entrée.

## Étape 6 — Installer et lancer (dans le terminal)

Tape ces commandes une par une, en appuyant sur Entrée après chacune :

```bash
npm install
```
(2 à 5 minutes la première fois ; des avertissements en jaune sont normaux.)

```bash
npx expo login
```
(saisis l'e-mail et le mot de passe du compte Expo de l'étape 2.)

```bash
npx expo start
```

Un **QR code** s'affiche dans le terminal. Laisse cette fenêtre ouverte.

## Étape 7 — Ouvrir l'app sur l'iPhone

1. Ouvre l'**Appareil photo** de l'iPhone et vise le QR code.
2. Touche la bannière **« Ouvrir dans Expo Go »**.
3. Si l'iPhone demande l'accès au **réseau local**, réponds **Autoriser**.
4. Le premier chargement prend environ 30 secondes, puis l'app Evolve s'affiche.

## Les fois suivantes

Ouvre un terminal dans le dossier (étape 5), tape `npx expo start`, puis ouvre Expo Go : le projet
apparaît dans la liste « Récemment ouverts ». L'ordinateur doit rester allumé avec la commande en cours
pendant que tu utilises l'app. Tes données (séances, mesures) restent enregistrées sur l'iPhone.

## En cas de problème

| Message ou symptôme | Solution |
| --- | --- |
| « You need to be signed in to Expo Go and Expo CLI » | Connecte-toi au même compte : `npx expo login` sur l'ordinateur et dans Expo Go (étape 2), puis touche **Try Again**. |
| Chargement infini ou « Could not connect » | Vérifie que l'iPhone et l'ordinateur sont sur le même Wi-Fi. Sinon, arrête avec `Ctrl + C` et relance avec `npx expo start --tunnel` (réponds `y` si on te propose d'installer un module). |
| « Project is incompatible with this version of Expo Go » | Mets à jour Expo Go dans l'App Store. |
| Réglages > Confidentialité > Réseau local | Active Expo Go si tu as refusé l'accès par erreur. |
| `npm` ou `npx` « introuvable » | Ferme puis rouvre le terminal après l'installation de Node.js (ou redémarre l'ordinateur). |
| Sur Windows, erreur de « stratégie d'exécution » | Utilise l'**Invite de commandes** (`cmd`, étape 5) plutôt que PowerShell. |

## Avoir l'app sans ordinateur (plus tard)

Pour que l'app s'installe sur l'iPhone comme une vraie app (icône, sans ordinateur allumé), il faut un
compte **Apple Developer** (99 USD par an) puis une compilation dans le cloud avec EAS :

```bash
npx eas-cli@latest build --profile preview --platform ios
```

Voir le README, section « Build installable ».
