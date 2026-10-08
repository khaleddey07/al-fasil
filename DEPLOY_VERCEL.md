# 🚀 Déployer Al-Fasil (سوقي) sur Vercel — Guide complet

Ce guide t'accompagne étape par étape, **sans aucun jargon technique inutile**.
Durée totale : **15 à 20 minutes**. Aucune carte bancaire requise (tout est gratuit
pour démarrer).

---

## 📋 Ce qui a déjà été préparé pour toi

Le code a été adapté pour Vercel. Voici ce qui a changé :

| Élément | Avant | Après (prêt pour Vercel) |
|---|---|---|
| Base de données | SQLite (fichier local) | **PostgreSQL** (création des tables automatique au build) |
| Intelligence artificielle | SDK du bac à sable | **Gemini 1.5 Flash** (comme dans le SRS) via `GEMINI_API_KEY` |
| Voix → texte | ffmpeg (absent sur Vercel) | **Gemini multimodal** (audio direct, sans ffmpeg) |
| Studio photo IA | Moteur de la plateforme | **Replicate Flux-Kontext** avec ta clé (BYOK, réglable dans les Paramètres) |
| Config de build | Script du bac à sable | `vercel.json` dédié |

**Aucune fonctionnalité n'a changé** — mêmes écrans, mêmes commandes vocales,
mêmes notifications Telegram et WhatsApp.

---

## Étape 1 — Pousser le code sur GitHub

Depuis le dossier du projet :

```bash
git add .
git commit -m "Prêt pour Vercel : PostgreSQL + Gemini + config de déploiement"
git push origin main
```

> 💡 Si tu n'as pas encore de dépôt GitHub : crée-en un sur
> [github.com/new](https://github.com/new), puis suis les commandes que GitHub
> te propose (git remote add origin …).

---

## Étape 2 — Créer la base de données PostgreSQL (2 min)

La base SQLite ne fonctionne pas sur Vercel (les fichiers sont effacés à chaque
redémarrage du serveur — tes commandes seraient perdues). On utilise une vraie
base PostgreSQL **gratuite** :

**Option recommandée — Neon (gratuit, rapide) :**
1. Va sur [neon.tech](https://neon.tech) → **Sign up** (avec GitHub)
2. **Create project** → choisis une région proche (ex. `Europe - Frankfurt`)
3. Copie la **Connection string** — elle ressemble à :
   ```
   postgresql://utilisateur:motdepasse@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Garde-la de côté — c'est ton `DATABASE_URL`.

> Alternative équivalente : **Vercel Postgres** (onglet Storage de ton projet
> Vercel) ou **Supabase** — n'importe quelle URL `postgresql://…` fonctionne.

---

## Étape 3 — Importer le projet dans Vercel (3 min)

1. Va sur [vercel.com](https://vercel.com) → **Sign up** avec GitHub
2. **Add New… → Project** → sélectionne ton dépôt GitHub → **Import**
3. Vercel détecte Next.js automatiquement — **ne modifie rien** dans les réglages
   de build (le fichier `vercel.json` s'en charge : schéma PostgreSQL copié,
   tables créées, build Next.js).
4. **Avant de cliquer sur Deploy** : ouvre **Environment Variables** et ajoute
   les variables du tableau ci-dessous ↓

### Variables d'environnement obligatoires

| Nom | Valeur | Où la trouver |
|---|---|---|
| `DATABASE_URL` | `postgresql://…` | Étape 2 (Neon) |
| `APP_SECRET` | 64 caractères aléatoires | Génère : `openssl rand -hex 32` (ou [random.org](https://www.random.org/strings/?num=1&len=32&format=html&rnd=new) ×2 collés) |
| `APP_PUBLIC_URL` | `https://ton-projet.vercel.app` | L'URL que Vercel te donne (tu pourras la corriger après) |
| `GEMINI_API_KEY` | `AIza…` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Get API key** |

### Variables optionnelles (Social Sync)

| Nom | Utilité | Où la trouver |
|---|---|---|
| `FACEBOOK_APP_ID` | Connexion « حساباتي » + publication sur ta Page | [developers.facebook.com/apps](https://developers.facebook.com/apps) |
| `FACEBOOK_APP_SECRET` | (avec l'APP_ID) | Même page → Settings → Basic |
| `FB_WEBHOOK_VERIFY_TOKEN` | Récupération auto des commandes Facebook Lead Ads | Chaîne secrète que **tu choisis** (ex. `alfasil-token-2026`) |

5. Clique **Deploy** ☕ — le premier build dure 2 à 3 minutes.
   Les tables de la base sont créées automatiquement pendant le build.

---

## Étape 4 — Finaliser l'URL publique (1 min)

1. Quand le déploiement est terminé, Vercel affiche ton URL
   (ex. `https://al-fasil.vercel.app`)
2. Va dans **Settings → Environment Variables** → corrige `APP_PUBLIC_URL`
   avec cette URL exacte (sans slash final)
3. **Settings → Deployments** → clique ⋯ sur le dernier déploiement →
   **Redeploy** (pour que la nouvelle valeur soit prise en compte)

> Cette URL est utilisée par : le bot Telegram (boutons du mini-magasin),
> les liens d'affiliation, les liens de confirmation WhatsApp et le retour OAuth Facebook.

---

## Étape 5 — Connecter les services (optionnel, au fil de tes besoins)

### 📣 Bot Telegram (notifications + mini-magasin)
Rien à installer : dans l'app → **الإعدادات (Paramètres)** → colle le token de
ton bot (créé via [@BotFather](https://t.me/BotFather)) → **تفعيل البوت**.
Le webhook est configuré automatiquement grâce à `APP_PUBLIC_URL`.

### 📱 Facebook — publication automatique + Lead Ads
1. Sur [developers.facebook.com](https://developers.facebook.com/apps) → ton app →
   **Settings → Basic** → dans **Valid OAuth Redirect URIs**, ajoute :
   ```
   https://ton-projet.vercel.app/api/social/facebook/callback
   ```
2. Dans ton app → **Webhooks** → objet **Page** → champ **leadgen** :
   - **Callback URL** : `https://ton-projet.vercel.app/api/webhooks/facebook-leads`
   - **Verify token** : la valeur de `FB_WEBHOOK_VERIFY_TOKEN`
3. Rend l'app « publique » (toggle **App Mode → Live**)
4. Dans l'app Al-Fasil → onglet **حساباتي** → **ربط صفحة فيسبوك** — c'est tout.

> ⚠️ Facebook exige HTTPS et une URL publique — c'est automatiquement le cas
> sur Vercel. Pour valider le webhook, l'app doit être en mode Live.

### 🎬 Studio vidéo & photo IA sur Vercel
Le moteur vidéo « sans clé » de la plateforme de développement n'est pas
disponible sur Vercel. Rien de compliqué :
- **Paramètres → مفتاح Replicate** : colle ta clé
  ([replicate.com/account/api-tokens](https://replicate.com/account/api-tokens))
- Le **Studio Photo** bascule automatiquement sur Flux-Kontext et la
  **vidéo 9:16** sur MiniMax — sans rien changer d'autre.
- De même, **UltraMsg (WhatsApp)** se règle dans les Paramètres — chiffré AES-256-GCM.

---

## Étape 6 — Vérifier que tout marche (5 min)

| Test | Comment | Résultat attendu |
|---|---|---|
| Site en ligne | Ouvre `https://ton-projet.vercel.app` | Vitrine Dark Cosmos & Gold ✨ |
| Inscription | Crée ton compte marchand | Connecté au tableau de bord |
| Voix | « عطر شرقي فاخر بـ 8500 دج » dans le Playground | Produit extrait ✅ |
| Commande client | Passe une commande sur ta boutique | Notification Telegram reçue |
| Social Sync | « بارطاجي » + boutons de publication | Bannière dorée + post publié |
| Lead Ads | Soumets un formulaire test Facebook | Commande créée automatiquement |

---

## 🆘 Dépannage rapide

| Problème | Cause probable | Solution |
|---|---|---|
| Build échoue sur `prisma db push` | `DATABASE_URL` absente/fausse | Vérifie la variable dans Vercel → Environment Variables |
| « La connexion au serveur a été perdue » | Base en pause (Neon gratuit) | Ouvre [console.neon.tech](https://console.neon.tech) → le projet se réveille automatiquement |
| L'IA répond une erreur 401 | `GEMINI_API_KEY` invalide | Régénère la clé sur AI Studio et redéploie |
| Le bot Telegram ne répond pas | `APP_PUBLIC_URL` incorrecte | Corrige l'URL puis Redeploy |
| Webhook Facebook « Forbidden » | Verify token différent | La valeur dans Facebook doit être **identique** à `FB_WEBHOOK_VERIFY_TOKEN` |
| Enregistrement vocal refusé | Audio > 4 Mo (limite serverless) | Des commandes courtes suffisent — c'est le comportement attendu |

### Notes techniques (pour aller plus loin)
- **Rate-limit et file d'attente IA** sont en mémoire par instance (parfait pour
  démarrer ; si un jour tu passes à plusieurs serveurs, migre-les vers Redis/Upstash).
- **Chaque déploiement recrée/synchronise les tables** (`prisma db push`) —
  pratique pour itérer ; renomme une colonne dans le schéma seulement si tu
  acceptes de perdre ces données.
- **Domaine personnalisé** : Settings → Domains → ajoute ton domaine (.dz, .com…)
  puis mets à jour `APP_PUBLIC_URL`.
