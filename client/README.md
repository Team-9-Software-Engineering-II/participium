# Participium Client

Frontend React per l'applicazione Participium del Comune di Torino.

## 🚀 Tecnologie

- **React** - Libreria UI
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Componenti UI
- **Axios** - HTTP client
- **Lucide React** - Icone

## 📁 Struttura del Progetto

```
src/
├── components/
│   ├── auth/          # Componenti per autenticazione
│   ├── common/        # Componenti comuni (Navbar, Footer, etc.)
│   ├── dashboard/     # Componenti dashboard
│   ├── reports/       # Componenti segnalazioni
│   └── ui/            # Componenti UI base (Button, Input, Card, etc.)
├── contexts/          # React Context (AuthContext)
├── hooks/             # Custom hooks
├── pages/             # Pagine principali
│   ├── Login.jsx
│   ├── Register.jsx
│   └── Dashboard.jsx
├── services/          # API services
│   └── api.js
├── utils/             # Utility functions
├── lib/               # Librerie helper (Tailwind merge)
└── App.jsx            # Component principale con routing
```

## 🛠️ Setup

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Configura l'ambiente

Copia il file `.env.example` in `.env` e modifica l'URL del backend:

```bash
cp .env.example .env
```

Modifica `.env`:
```
VITE_API_URL=http://localhost:3000/v1
```

### 3. Avvia il server di sviluppo

```bash
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:5173`

## 🔑 Funzionalità Implementate

### ✅ Autenticazione
- [x] Login
- [x] Registrazione
- [x] Logout
- [x] Protezione rotte con ProtectedRoute
- [x] Context API per gestione stato utente

### ✅ Dashboard Cittadino
- [x] Dashboard base con menu
- [x] Profilo utente nell'header
- [x] Quick actions

### 🚧 Da Implementare
- [ ] Creazione nuova segnalazione
- [ ] Lista segnalazioni utente
- [ ] Mappa interattiva
- [ ] Dettaglio segnalazione
- [ ] Messaggi/notifiche
- [ ] Statistiche pubbliche
- [ ] Profilo utente (modifica)

## 📦 Scripts Disponibili

```bash
# Avvia il server di sviluppo
npm run dev

# Build per produzione
npm run build

# Preview build di produzione
npm run preview

# Lint del codice
npm run lint
```

## 🎨 Componenti UI Disponibili

I seguenti componenti Shadcn/ui sono già configurati e pronti all'uso:

- `Button` - Bottoni con varianti (default, outline, ghost, etc.)
- `Input` - Input text
- `Card` - Card container con Header, Content, Footer

### Esempio d'uso:

```jsx
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/Card';

function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Titolo</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Inserisci testo" />
        <Button>Invia</Button>
      </CardContent>
    </Card>
  );
}
```

## 🔗 Integrazione Backend

Il client si connette al backend tramite axios. Tutte le chiamate API sono centralizzate in `src/services/api.js`.

### Configurazione API

L'interceptor axios aggiunge automaticamente:
- Token JWT nell'header `Authorization: Bearer <token>`
- Gestione automatica errori 401 (redirect a login)

### Endpoints disponibili:

```javascript
import { authAPI, userAPI, reportAPI } from './services/api';

// Autenticazione
await authAPI.login({ username, password });
await authAPI.register({ email, username, firstName, lastName, password });

// Utente
await userAPI.getProfile();
await userAPI.updateProfile(data);

// Segnalazioni
await reportAPI.create(reportData);
await reportAPI.getAll(filters);
await reportAPI.getById(id);
// ... e altri
```

## 🎯 Prossimi Passi

1. **Implementare pagina creazione segnalazione**
   - Form con mappa OpenStreetMap
   - Upload foto (max 3)
   - Selezione categoria

2. **Lista segnalazioni**
   - Tabella con filtri
   - Paginazione

3. **Mappa interattiva**
   - Integrazione OpenStreetMap/Leaflet
   - Markers per segnalazioni

4. **Sistema notifiche**
   - Toast notifications
   - Badge notifiche non lette

## 📝 Note

- Il progetto usa **ES Modules** (import/export)
- Tailwind è configurato con tema custom Shadcn
- Le variabili CSS per i colori sono in `src/index.css`

## 🐛 Troubleshooting

### Errore CORS
Se ottieni errori CORS, assicurati che il backend abbia configurato correttamente i CORS headers per `http://localhost:5173`

### Token non salvato
Verifica che il localStorage sia abilitato nel browser

## 📄 Licenza

Comune di Torino - Participium
