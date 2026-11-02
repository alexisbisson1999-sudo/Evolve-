# Étapes pour une publication future

Liste de contrôle pour passer de l'app personnelle à une app publiée (gratuite, puis achats intégrés).
À faire vérifier par un professionnel pour les aspects juridiques.

## 1. Comptes et identité

- [ ] **Apple Developer Program** : 99 USD / an. Compte individuel ou organisation (organisation = numéro
      D-U-N-S, utile si tu crées une société). https://developer.apple.com/programs/
- [ ] **Google Play Console** : 25 USD une fois. Vérification d'identité obligatoire ; pour un compte
      personnel récent, test fermé avec au moins 12 testeurs pendant 14 jours avant la production.
- [ ] **Compte Expo / EAS** (gratuit pour commencer) pour les builds et la soumission.
- [ ] Nom définitif, vérification de disponibilité (stores, INPI / EUIPO pour la marque), nom de domaine.
- [ ] Remplacer `com.evolve.fitness` (`app.json`) par un identifiant à toi (ex. `fr.tondomaine.evolve`) :
      il ne peut plus changer après la première publication.
- [ ] Icône, écran de démarrage, captures d'écran (iPhone 6,7" et 6,5", Android), texte de présentation.

## 2. Données personnelles et RGPD

Poids et tour de taille sont des **données de santé** au sens du RGPD (article 9) : consentement explicite,
minimisation, sécurité renforcée.

- [ ] **Politique de confidentialité** publiée sur une URL publique (obligatoire sur les deux stores) :
      responsable du traitement, données collectées (e-mail, mesures, séances), finalités, base légale
      (consentement), durée de conservation, sous-traitants (Supabase, région UE), droits (accès,
      rectification, suppression, portabilité), contact, droit de réclamation auprès de la CNIL.
- [ ] **Consentement explicite** à l'inscription pour le traitement des données de santé
      (case non pré-cochée), et enregistré.
- [ ] Projet Supabase hébergé dans l'**UE** ; contrat de sous-traitance (DPA) signé.
- [ ] **Suppression de compte depuis l'app** (exigée par Apple et Google) : bouton qui supprime le compte
      et la ligne `user_state` (fonction Edge Supabase avec la clé service).
- [ ] Export des données (déjà présent : export JSON) — à garder pour la portabilité.
- [ ] Registre des traitements ; analyse d'impact (AIPD) recommandée pour les données de santé à grande échelle.
- [ ] Apple : **App Privacy** (« étiquette nutritionnelle ») et fichier `PrivacyInfo.xcprivacy`
      (déclaration des API sensibles, gérée en partie par Expo).
- [ ] Google : formulaire **Data safety** et, si nécessaire, déclaration « Health apps ».
- [ ] Si analytics / suivi d'erreurs ajoutés : les déclarer, et demander le consentement si non essentiels.

## 3. Mentions santé

- [ ] Avertissement visible au premier lancement et dans l'app (déjà présent dans Réglages et les fiches
      d'exercice) : l'app ne remplace pas un avis médical ; consulter un médecin avant de reprendre une
      activité physique en cas d'antécédents ; arrêter en cas de douleur thoracique, malaise, douleur vive.
- [ ] Pas de promesse de résultats (« perdez X kg en 4 semaines ») dans l'app ni sur les fiches stores.
- [ ] Ne pas se présenter comme un dispositif médical (sinon marquage CE / règlement 2017/745).
- [ ] Contenus relus par un coach diplômé (BPJEPS / STAPS) — argument de qualité et de crédibilité.
- [ ] Nutrition (kit futur) : rester sur des conseils généraux ; pas de régimes à visée thérapeutique ;
      mention pour les personnes avec troubles du comportement alimentaire, femmes enceintes, mineurs.
- [ ] Âge minimum (16 ans recommandé avec les données de santé) dans les CGU et la classification d'âge.

## 4. Documents juridiques

- [ ] **Conditions générales d'utilisation** (et de vente dès les achats intégrés).
- [ ] **Mentions légales** (éditeur, hébergeur) sur le site.
- [ ] Statut pour encaisser (micro-entreprise ou société), TVA : les stores collectent la TVA sur les
      achats intégrés dans l'UE, mais les revenus restent à déclarer.

## 5. Achats intégrés (v2)

- [ ] Paiement obligatoirement via Apple / Google pour du contenu numérique (commission 15 % via le
      Small Business Program / 15 % Google sur le premier million).
- [ ] Choix technique : **RevenueCat** (le plus simple avec Expo) ou `react-native-iap`.
- [ ] Produits non consommables (kits) ou abonnement ; bouton **« Restaurer les achats »** obligatoire.
- [ ] Accords « Paid Apps » (Apple) et profil de paiement (Google), informations bancaires et fiscales.
- [ ] Contenu des kits livré sous forme de JSON (déjà le format de l'app), vérifié côté serveur.

## 6. Qualité avant soumission

- [ ] Tests sur plusieurs appareils réels (petit écran, Android ancien, iPhone récent), mode sombre.
- [ ] Accessibilité : VoiceOver / TalkBack, tailles de police agrandies.
- [ ] Suivi des erreurs (Sentry) et version minimale d'OS définie.
- [ ] Tests fermés : TestFlight (iOS), test fermé Play Console (Android).
- [ ] `eas build --profile production` puis `eas submit` ; mises à jour mineures via `eas update`.

## 7. Après publication

- [ ] Répondre aux avis, suivre les plantages.
- [ ] Mettre à jour le SDK Expo environ une fois par an (les stores exigent des versions d'OS cibles récentes).
