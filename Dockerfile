# --- Stage 1: Build del Frontend (React/Vite) ---
FROM node:18-alpine as client-builder

WORKDIR /app/client

# Copia i file di dipendenze del client e installa
COPY client/package*.json ./
RUN npm install

# Copia tutto il codice del client e costruisci (crea la cartella 'dist')
COPY client/ .
RUN npm run build


# --- Stage 2: Setup del Backend e Run ---
FROM node:18-alpine AS final_runtime

WORKDIR /app/server

# Copia i file di dipendenze del server
COPY server/package*.json ./

# Installa le dipendenze del server
RUN npm install --production

# Copia il codice sorgente del server
COPY server/ .

# Crea le cartelle necessarie per i volumi
RUN mkdir -p uploads/reports data

# --- COPIA CRUCIALE ---
# Prende la cartella 'dist' generata nello Stage 1 e la copia
# dentro la cartella 'public' del server (quella che abbiamo configurato in Express)
COPY --from=client-builder /app/client/dist ./public

# Espone la porta (assicurati che sia quella usata nel tuo index.js, es. 3000 o 3001)
EXPOSE 3000

# Avvia il server
CMD ["npm", "run", "start"]
# (o il comando che usi tu, es: "npm start" o "node src/index.js")