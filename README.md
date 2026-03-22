ksumak# Zikki — KI-gestützte Ernährungs-App

## Setup

### 1. PostgreSQL Datenbank einrichten

```bash
# Lokal (mit Homebrew):
brew install postgresql@16
brew services start postgresql@16
createdb zikki

# ODER Supabase (empfohlen):
# Neues Projekt auf supabase.com erstellen
# Connection String aus Settings > Database kopieren
```

### 2. Backend konfigurieren

```bash
cd backend

# .env anpassen:
# DATABASE_URL=postgresql://user:password@localhost:5432/zikki
# ANTHROPIC_API_KEY=sk-ant-api03-...  (von console.anthropic.com)
# JWT_SECRET=<min. 64 zufällige Zeichen>

# Dependencies installieren (bereits erledigt)
npm install

# Datenbank-Schema und Seed-Daten einspielen:
npm run db:migrate

# Server starten:
npm run dev
# → Läuft auf http://localhost:3000
# → Test: http://localhost:3000/health
```

### 3. Mobile App starten

```bash
cd mobile
npm install

# Für iOS Simulator:
npm run ios

# Für Android Emulator:
npm run android

# Für physisches Gerät:
# In constants/api.ts die API_BASE_URL auf deine LAN-IP setzen:
# z.B. 'http://192.168.1.100:3000'
# Dann: npm start → QR-Code mit Expo Go scannen
```

## Projektstruktur

```
Zikkiapp/
├── backend/          Express API (Port 3000)
│   ├── src/
│   │   ├── config/   DB-Verbindung, Migrations-SQL
│   │   ├── services/ Geschäftslogik (AI, Food, Log, Weight, Auth)
│   │   ├── routes/   API-Endpunkte
│   │   └── ...
│   └── .env         ← API Keys hier eintragen!
│
└── mobile/           Expo React Native App
    ├── app/
    │   ├── (auth)/       Login, Register
    │   ├── (onboarding)/ 3-Schritt Onboarding
    │   ├── (tabs)/       Dashboard, Log, Gewicht, Profil
    │   └── modals/       Barcode, Suche, Mahlzeit-Detail
    ├── components/   UI-Komponenten
    ├── store/        Zustand State Management
    └── services/     API-Client
```

## API-Endpunkte

| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | /api/auth/register | Registrierung |
| POST | /api/auth/login | Login |
| GET/PUT | /api/profile | Profil lesen/aktualisieren |
| POST | /api/profile/calculate | TDEE berechnen |
| GET | /api/foods/search?q=... | Lebensmittel suchen |
| GET | /api/foods/barcode/:ean | Barcode-Lookup |
| GET | /api/log?date=YYYY-MM-DD | Tagesprotokoll |
| POST | /api/log | Mahlzeit eintragen |
| POST | /api/log/bulk | Mehrere Items hinzufügen |
| DELETE | /api/log/:id | Eintrag löschen |
| POST | /api/weight | Gewicht eintragen |
| GET | /api/weight | Gewichtsverlauf |
| POST | /api/ai/parse-meal | KI-Mahlzeiterkennung |
| GET | /api/ai/daily-insight | KI-Coaching |
