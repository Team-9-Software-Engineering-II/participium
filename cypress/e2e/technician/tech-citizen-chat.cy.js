describe("E2E - Flusso Chat: Staff Tecnico <-> Cittadino", () => {
  const baseUrl = "http://localhost:5173"; // Aggiorna se la porta è diversa (es. 3000)

  // Dati del test
  const reportTitle = "Broken wall"; // Il titolo della segnalazione da cercare
  const techMessage = "Ciao";
  const citizenReply = "Grazie, ho ricevuto il messaggio";

  // Credenziali
  const techUser = { user: "tech_roads", pass: "password123" };
  const citizenUser = { user: "paolo.gialli", pass: "password123" };

  beforeEach(() => {
    // Ignora errori non critici di React
    cy.on("uncaught:exception", () => false);
  });

  it("Il tecnico invia un messaggio e il cittadino risponde", () => {
    // ==========================================
    // 1. LOGIN STAFF TECNICO
    // ==========================================
    cy.visit(`${baseUrl}/login`);
    cy.get("#username").clear().type(techUser.user);
    cy.get("#password").clear().type(techUser.pass);
    cy.get('[data-cy="submit-button"]').click();

    // Gestione scelta ruolo (se presente)
    cy.get("body").then(($body) => {
      if ($body.find('h1:contains("Select Your Role")').length > 0) {
        cy.contains("Technical Staff").click();
      }
    });

    // Assicuriamoci di essere sulla dashboard
    cy.get('[data-cy="technician-sidebar"]').should("be.visible");

    // ==========================================
    // 2. APERTURA DETTAGLI REPORT
    // ==========================================

    // Naviga ai report assegnati (Active)
    cy.get('[data-cy="nav-active-reports"]').click();

    // Cerca la card specifica con "Broken wall" e clicca "View Full Details"
    // Usiamo .contains per trovare il titolo, risaliamo alla card padre, e troviamo il bottone
    cy.contains(reportTitle)
      .parents('[data-cy="report-card"]')
      .find('[data-cy="view-details-button"]') // O cy.contains("View Full Details")
      .click();

    // Verifica di essere nella pagina di dettaglio
    cy.contains("h1", reportTitle).should("be.visible");

    // ==========================================
    // 3. INVIO MESSAGGIO "CIAO"
    // ==========================================

    // Clicca sull'icona della chat in basso a destra
    // Usiamo il selettore robusto basato sull'icona Lucide
    cy.get("button svg.lucide-message-square")
      .should("be.visible")
      .closest("button") // Prende il bottone che contiene l'icona
      .click();

    // Verifica apertura chat
    cy.contains("Conversation with").should("be.visible");

    // Scrivi "Ciao" nell'input
    cy.get('input[placeholder="Type a message..."]')
      .should("be.visible")
      .type(techMessage);

    // Premi invio (bottone submit del form chat)
    cy.get('form button[type="submit"]').click();

    // Verifica che il messaggio sia apparso nella lista
    cy.contains(techMessage).should("be.visible");

    // Chiudi la chat (opzionale, ma pulito) o procedi al logout
    cy.wait(1000); // Piccola pausa per assicurarsi che il messaggio sia salvato

    // ==========================================
    // 4. LOGOUT
    // ==========================================

    // Clicca icona utente in alto a destra
    cy.get("header button, nav button").last().click();

    // Clicca Logout
    cy.contains(/Log out|Esci|Logout/i).click();

    // Verifica ritorno al login
    cy.get("#username").should("be.visible");

    // ==========================================
    // 5. LOGIN CITTADINO
    // ==========================================
    cy.get("#username").clear().type(citizenUser.user);
    cy.get("#password").clear().type(citizenUser.pass);
    cy.get('[data-cy="submit-button"]').click();

    // Scelta ruolo cittadino (se serve)
    cy.get("body").then(($body) => {
      if ($body.find('h1:contains("Select Your Role")').length > 0) {
        cy.contains("Citizen").click();
      }
    });

    // ==========================================
    // 6. CITTADINO APRE REPORT E CHAT
    // ==========================================

    // Nella dashboard cittadino, cerca "Broken wall" nella lista laterale e cliccaci
    // (Assumiamo che il testo sia cliccabile o ci sia un "View in map"/"Dettagli")
    cy.contains(reportTitle).should("be.visible").click();

    // Ora dovremmo vedere i dettagli o la mappa centrata.
    // Il bottone della chat in basso a destra dovrebbe essere presente.
    cy.get("button svg.lucide-message-square")
      .should("be.visible")
      .closest("button")
      .click();

    // ==========================================
    // 7. VERIFICA E RISPOSTA
    // ==========================================

    // Verifica di aver ricevuto "Ciao" (il messaggio del tecnico)
    // Nota: potrebbe esserci scritto "Andrea Blu" o "Tech" come mittente
    cy.contains(techMessage).should("be.visible");

    // Invia risposta
    cy.get('input[placeholder="Type a message..."]').type(citizenReply);
    cy.get('form button[type="submit"]').click();

    // Verifica che anche la risposta sia apparsa
    cy.contains(citizenReply).should("be.visible");
  });
});
