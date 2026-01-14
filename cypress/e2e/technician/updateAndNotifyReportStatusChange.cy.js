describe("E2E - Flusso Completo: Tecnico aggiorna, Cittadino riceve notifica", () => {
  const baseUrl = "http://localhost:5173"; // Aggiorna con la tua porta se diversa

  // Credenziali
  const techUser = { user: "tech_roads", pass: "password123" };
  const citizenUser = { user: "paolo.gialli", pass: "password123" };

  beforeEach(() => {
    // Gestione eccezioni non gestite da React per evitare che il test fallisca inutilmente
    cy.on("uncaught:exception", () => false);
  });

  it("Dovrebbe gestire il ciclo di vita della segnalazione", () => {
    // ==========================================
    // FASE 1: LOGIN STAFF TECNICO
    // ==========================================
    cy.visit(`${baseUrl}/login`);

    // 1. Inserimento credenziali (usando gli ID del componente Login.jsx)
    cy.get("#username").clear().type(techUser.user);
    cy.get("#password").clear().type(techUser.pass);

    // 2. Click sul bottone di submit (uso il data-cy presente nel tuo codice)
    cy.get('[data-cy="submit-button"]').click();

    // 3. Gestione eventuale schermata "Select Your Role"
    // Se tech_roads ha più ruoli, apparirà la schermata di scelta.
    // Verifichiamo se esiste il testo "Select Your Role" e clicchiamo "Technical Staff"
    cy.get("body").then(($body) => {
      if ($body.find('h1:contains("Select Your Role")').length > 0) {
        cy.contains("Technical Staff").click();
      }
    });

    // 4. Verifica atterraggio sulla dashboard tecnica
    cy.location("pathname").should("include", "/technical");
    cy.get('[data-cy="technician-sidebar"]').should("be.visible");

    // ==========================================
    // FASE 2: AGGIORNAMENTO STATO (TECNICO)
    // ==========================================

    // 1. Naviga ai report attivi
    cy.get('[data-cy="nav-active-reports"]').click();

    // 2. Attendi caricamento lista
    cy.get('[data-cy="report-list"]').should("be.visible");

    // 3. Seleziona il primo report e cambia stato
    cy.get('[data-cy="report-card"]')
      .first()
      .within(() => {
        // Clicca sul trigger della Select (Shadcn UI)
        cy.get('[data-cy="status-select"]').click();
      });

    // IMPORTANTE: Le opzioni della Select sono renderizzate nel body (fuori dalla card)
    // Clicchiamo su "Suspended"
    cy.get('[role="option"]').contains("Suspended").click();

    // 4. Conferma l'aggiornamento
    // Cerchiamo il bottone di salvataggio dentro la card specifica
    cy.get('[data-cy="report-card"]')
      .first()
      .find('[data-cy="update-status-btn"]')
      .click();

    // 5. Verifica messaggio di successo (Toast)
    cy.contains("Status Updated Successfully").should("be.visible");

    // Piccola attesa per assicurarsi che il backend abbia processato la notifica
    cy.wait(1500);

    // ==========================================
    // FASE 3: LOGOUT
    // ==========================================

    // Cerchiamo un bottone di logout.
    // Se è dentro un menu utente (comune nelle navbar), clicchiamo prima l'icona utente.
    // Qui cerco genericamente un bottone o link che contenga "Log out", "Esci" o un'icona di uscita.
    cy.get("header button, nav button").last().should("be.visible").click();

    // 2. Ora il menu è aperto e "Logout" dovrebbe essere visibile
    // Aggiungiamo un piccolo controllo di visibilità per sicurezza
    cy.contains(/Log out|Esci|Logout/i)
      .should("be.visible")
      .click();

    // 3. Verifica di essere tornati alla pagina di login
    cy.get("#username").should("be.visible");

    // ==========================================
    // FASE 4: LOGIN CITTADINO & VERIFICA
    // ==========================================

    // 1. Login Cittadino
    cy.get("#username").clear().type(citizenUser.user);
    cy.get("#password").clear().type(citizenUser.pass);
    cy.get('[data-cy="submit-button"]').click();

    cy.get(".lucide-bell")
      .should("be.visible")
      .closest("button, a") // Trova il pulsante o link che contiene l'icona
      .click();

    // 3. Verifica di essere atterrati nella pagina Notifiche
    //cy.url().should("include", "/notifications");

    // 4. Clicca sulla prima notifica della lista (la più recente)
    // Nella pagina Notifiche, cerchiamo il primo elemento della lista cliccabile
    cy.contains("Notifications").should("be.visible"); // Assicuriamoci che la pagina sia carica

    cy.contains("Report Suspended").should("be.visible").click();

    // ==========================================
    // FASE 5: ASSERZIONE FINALE
    // ==========================================

    // Ci aspettiamo di essere reindirizzati al dettaglio del report
    cy.url().should("include", "/reports/");

    // Verifica che lo stato aggiornato sia visibile
    // (Cerca "In Progress" o "Suspended" ignorando maiuscole/minuscole)
    cy.contains(/Suspended/i).should("be.visible");
  });
});
