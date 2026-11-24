# Evolutio

Réponses et collecte d'avis Google pour les commerces locaux : site vitrine en motion design, comptes clients, abonnements Stripe, rédaction par IA, collecte d'avis.

## Lancer sur votre ordinateur, sans installation

Il faut seulement Node.js 20 ou plus récent. Dans le Terminal, depuis ce dossier :

```bash
sh demarrer.sh
```

Le site s'ouvre sur http://localhost:3000. Cette version prête à lancer (dossier `lancer/`) ne télécharge rien : pas de `npm install`.

Pour arrêter : Ctrl + C dans le Terminal.

## Brancher les services : l'assistant

Ouvrez http://localhost:3000/installation. L'assistant montre l'état de chaque service et enregistre vos clés dans `.env.local`, sans redémarrage.

| Étape | Ce que vous faites | Ce que l'assistant fait |
| --- | --- | --- |
| 1. Supabase (obligatoire) | Créer un projet gratuit, coller l'adresse et les 2 clés | Teste la connexion, vous donne le script SQL à coller, vérifie les tables |
| 2. Stripe | Coller la clé secrète de test (`sk_test_…`) | Crée les 3 formules, leurs prix et la page de gestion d'abonnement |
| 3. IA | Coller une clé Anthropic | Active la rédaction des réponses et la synthèse des avis |
| 4. Resend | Coller la clé et l'adresse d'expédition | Active les alertes et les demandes d'avis par e-mail |
| 5. Google | Coller l'identifiant et le secret OAuth | Active la connexion des fiches (après accord de Google sur l'accès à son API) |

Après l'étape 1, créez votre compte : en local, il est validé tout de suite, sans e-mail de confirmation. Sans Stripe, l'application reste en mode découverte, tout est ouvert sans paiement.

Tester un paiement : Stripe fournit la carte de test `4242 4242 4242 4242`.

## Ce que contient l'application

- **Site vitrine** : page d'accueil animée, tarifs, questions fréquentes.
- **Avis** : import depuis Google, brouillon par IA, publication en un clic, publication automatique en option pour les 4 et 5 étoiles, avis d'exemple et avis collés à la main.
- **Analyse** : note moyenne, taux de réponse, répartition des notes, avis par mois, synthèse IA des forces et des irritants.
- **Collecte** : page publique, QR code, affiche à imprimer, demande par e-mail (une seule par client), messages privés.
- **Abonnement** : 3 formules, essai de 14 jours sans carte, changement de formule et résiliation en ligne.

Deux choix volontaires, à ne pas « corriger » : aucun tri des clients avant Google (Google l'interdit), et jamais de publication automatique sous 4 étoiles.

## Mettre en ligne (Vercel)

1. Créez un dépôt GitHub et poussez-y ce dossier (le dossier `lancer/` et `.env.local` sont ignorés par git).
2. Sur vercel.com, importez le dépôt.
3. Dans les variables d'environnement Vercel, recopiez le contenu de votre `.env.local` (voir `.env.example` pour la liste).
4. Dans Supabase, Authentication, URL Configuration : mettez l'adresse du site en Site URL et ajoutez `https://votre-site/auth/callback` aux Redirect URLs.
5. Dans Stripe, Développeurs, Webhooks : ajoutez `https://votre-site/api/stripe/webhook` avec les événements `checkout.session.completed` et `customer.subscription.*`, puis copiez son secret dans `STRIPE_WEBHOOK_SECRET`.
6. Dans Google Cloud, ajoutez `https://votre-site/api/google/callback` aux adresses de redirection.

En ligne, l'assistant `/installation` est en lecture seule et disparaît dès que la base est connectée.

## Modifier le code

```bash
npm install
npm run dev        # http://localhost:3000, avec rechargement à chaud
npm test           # tests unitaires
npm run build      # version de production
```

| Fichier | Contenu |
| --- | --- |
| `src/app/page.tsx`, `src/components/landing/` | Page d'accueil et ses animations |
| `src/app/globals.css` | Tout le design (couleurs, typographie, animations) |
| `src/lib/config.ts` | Formules, prix, limites, secteurs, tons |
| `src/lib/prompt.ts` | Consignes données à l'IA |
| `src/app/installation/` | Assistant de connexion |
| `src/app/app/` | Espace connecté : avis, analyse, collecte, réglages, abonnement |
| `supabase/schema.sql` | Tables et règles de sécurité |

## Vérifié, et pas encore vérifié

Vérifié sur cette version : compilation, contrôle de types, 11 tests unitaires, et un essai de bout en bout du serveur prêt à lancer avec une base simulée (assistant, enregistrement des clés, pages connectées, analyse, affiche, page de collecte).

Pas encore vérifié, car il faut vos comptes : l'inscription réelle sur Supabase, la création des formules et un paiement de test sur Stripe, la rédaction par l'IA, l'envoi d'e-mails et les appels à Google. La version prête à lancer a été construite et testée sous Linux ; elle est en JavaScript pur et devrait tourner à l'identique sur Mac, mais ce n'est pas testé.

## Avant d'encaisser de vrais clients

Un statut pour facturer, des mentions légales, des conditions de vente et une politique de confidentialité (non fournies), un contrat de sous-traitance des données pour vos clients, et le passage de Stripe en mode réel.

## Sécurité

- Les clés vivent dans `.env.local`, lisible par vous seul, jamais réaffichées par l'assistant. Ne partagez pas ce fichier.
- En local, le serveur n'écoute que sur votre ordinateur (127.0.0.1).
- Le jeton Google de chaque client est chiffré avant stockage ; chaque table a des règles d'accès par utilisateur ; les webhooks Stripe sont vérifiés par signature.
