# EcoEats — client web (React)

## Lancer en local

1. Démarrer l’API Express à la racine du repo : `npm run start:express` (port **3000** par défaut). L’API expose notamment `GET /api/geocode?q=…` (proxy Nominatim) pour convertir une adresse en coordonnées.
2. Dans ce dossier : `npm install` puis `npm run dev` (Vite, port **5173**). Les appels `/api` sont proxifiés vers `http://localhost:3000`.

En production ou si l’API n’est pas sur le même hôte : définir `VITE_API_BASE_URL` (ex. `https://api.example.com`).

## Erreur `UNABLE_TO_VERIFY_LEAF_SIGNATURE`

Cela vient du **certificat TLS** (proxy d’entreprise, inspection HTTPS, antivirus). À corriger côté machine, par exemple :

- importer la **CA racine** de l’organisation dans le magasin Windows, ou  
- `npm config set cafile "C:\chemin\vers\corp-root.pem"` (recommandé plutôt que désactiver la vérification SSL).

Ne pas commiter de `.npmrc` avec `strict-ssl=false` dans un dépôt partagé.
