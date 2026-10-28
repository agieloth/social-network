Corriger les problèmes de sécurité EN PREMIER (cookies, validation, upload)
Corriger les bugs identifiés (double envoi de messages, URLs en dur)
Améliorer l’architecture (interfaces, erreurs typées)
Optimiser les performances (connection pooling, pagination)


// ❌ ANCIEN CODE
await fetch('http://localhost:8080/api/login', { ... })

// ✅ NOUVEAU CODE
await fetch(`${API_BASE_URL}/api/login`, { ...})