export function shortenAddress(s: string, max = 44): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function geocodeErrorMessage(code: string): string {
  const map: Record<string, string> = {
    missing_q: 'Saisissez une adresse.',
    not_found: 'Adresse introuvable. Précisez la ville ou le code postal.',
    geocode_upstream: 'Service d’adresse indisponible (vérifiez la connexion ou lancez l’API : npm run start:express).',
    network:
      'Impossible de joindre le serveur. Lancez l’API sur le port 3000 et le front avec Vite (proxy /api), ou utilisez le mode démo ci-dessous.',
    timeout: 'La recherche d’adresse a expiré. Réessayez ou utilisez le mode démo.',
    invalid_coordinates: 'Coordonnées invalides renvoyées par le service.',
  };
  return map[code] ?? 'Impossible de localiser cette adresse.';
}
