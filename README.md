# Al-Fasil (الفيصل / سوقي) — Plateforme e-commerce à commande vocale 🇩🇿

La première plateforme **vocale** pour les marchands algériens : décris ton produit
en darija (voix ou texte), l'IA crée ta boutique de luxe instantanément —
paiement à la livraison (COD), livraison 58 wilayas, notifications Telegram &
WhatsApp.

## ✨ Fonctionnalités

- 🎤 **Zéro complexité** : création produit/boutique par la voix (darija algérienne)
- 🎨 **20 templates de luxe** (LUX ENGINE) applicables en 1 clic ou à la voix
- 📸 **Studio IA** : fonds de luxe (marbre, velours doré…) + vidéos 9:16 TikTok/Reels
- ⏱️ **Urgence & rareté** : compte à rebours + stock limité anti-manipulation
- 🛡️ **Anti-faux clients** : liste noire + score de confiance (+213 normalisé)
- ✅ **Confirmation WhatsApp** (UltraMsg) avec page de confirmation d'adresse
- 📣 **Social Sync** : publication auto Facebook/Instagram/TikTok/Telegram/WhatsApp
  + récupération automatique des commandes **Facebook Lead Ads**
- 🤝 **Affiliation** : codes uniques, attribution 30 jours, commission au livrer
- 🗺️ Dashboard doré + **carte 3D de l'Algérie** (commandes par wilaya)
- 📱 PWA — Mobile-First, images WebP < 150 Ko, mode sombre/clair

## 🚀 Démarrage local (développeurs)

```bash
npm install
# .env → DATABASE_URL="file:../db/custom.db"  (SQLite local, démo incluse)
npm run db:push
npm run dev
```

Compte de démo : `test@example.com` / `secret123`

> Sur **Vercel**, tout est déjà configuré (PostgreSQL + Gemini + build auto) —
> suis le guide **[DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)** (15 min, sans jargon).

## 🧰 Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma
(SQLite dev / PostgreSQL prod) · Google Gemini 1.5 Flash · sharp · Telegram Bot API
· Facebook Graph API v19 · Replicate (BYOK)

## 📁 Structure

```
src/
├── app/api/          # Routes API (produits, commandes, voix, social, webhooks…)
├── components/souq/  # UI métier (storefront, dashboard, cartes 58 wilayas…)
├── lib/              # IA (gateway Gemini), wilayas, crypto AES, thèmes luxe…
prisma/               # Schémas SQLite (dev) + PostgreSQL (prod Vercel)
vercel.json           # Build Vercel automatique
DEPLOY_VERCEL.md      # Guide de déploiement en français
```
