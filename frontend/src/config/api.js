// ✅ NOUVEAU FICHIER (à créer)
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const WS_URL = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080').replace(/\/$/, '');

export { API_BASE_URL, WS_URL };