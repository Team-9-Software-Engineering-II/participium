describe("Technical Officer Chat Flow", () => {
  const reportTitle = "Abandoned shopping cart";
  const testMessage = "Hello maintainer, please check this asap.";

  beforeEach(() => {
    // 1. Intercettiamo le chiamate API per aspettare che i dati siano pronti
    cy.intercept("GET", "**/offices/reports/assigned").as("getAssignedReports"); // Per la dashboard
    cy.intercept("GET", "**/reports/*").as("getMyAssignedReports"); // Per i dettagli
    cy.intercept("GET", "**/messages/reports/**").as("getMessagesByReportId"); // Per caricare la chat
    cy.intercept("POST", "**/messages/reports/*").as("createMessage"); // Per l'invio

    // 2. Login come Technical Officer (tech_waste)
    cy.visit("/login");
    cy.get('input[name="username"]').type("tech_waste");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();

    // Verifica di essere atterrati sulla dashboard
    cy.url().should("include", "/technical");
  });

  it("should navigate to Maintainers Reports, click View Full Details, and send a message", () => {
    // --- STEP 1: Naviga a "Maintainers Reports" ---
    // Basato su TechnicianLayout.jsx: text="Maintainers Reports"
    cy.get('[data-cy="nav-maintainer"]').click();

    // Verifica URL
    cy.url().should("include", "/reports/maintainer");

    cy.wait("@getMyAssignedReports");

    // --- STEP 2: Trova il report e clicca "View Full Details" ---
    // Basato su OfficerReports.jsx: Cerchiamo la card con il titolo specifico
    /*cy.contains('[data-cy="report-card-title"]', reportTitle)
      .parents('[data-cy="report-card"]') // Risaliamo al contenitore della card
      .contains("View Full Details") // Cerchiamo SOLO il testo/bottone specifico
      .click();*/

    cy.get('[data-cy="report-card"]')
      .first()
      .within(() => {
        cy.contains("View Full Details").click();
      });

    // Aspettiamo che i dettagli vengano caricati
    cy.contains("h1", reportTitle).should("be.visible");

    // --- STEP 3: Apri la Chat ---
    // Basato su ReportDetails.jsx: Button con icona MessageSquare
    // Il bottone ha classi: "fixed bottom-6 right-6..."
    // Usiamo l'icona SVG lucide-message-square per trovarlo in modo robusto
    cy.get("button svg.lucide-message-square")
      .parent() // Seleziona il bottone genitore dell'icona
      .should("be.visible")
      .click();

    // Verifica che la ChatSheet si sia aperta
    cy.wait("@getMessagesByReportId"); // Aspetta il caricamento messaggi
    cy.contains("Conversation with").should("be.visible");

    // --- STEP 4: Digita e Invia Messaggio ---
    // Basato su ChatSheet.jsx: Input con placeholder e Button type="submit"
    cy.get('input[placeholder="Type a message..."]')
      .should("be.visible")
      .type(testMessage);

    // Clicca invio (icona Send)
    cy.get('form button[type="submit"]').click();

    // --- STEP 5: Verifica successo ---
    // Aspetta che la chiamata POST ritorni 200/201
    cy.wait("@createMessage")
      .its("response.statusCode")
      .should("be.oneOf", [200, 201]);

    // Verifica che il messaggio appaia nella lista (ChatSheet.jsx renderizza i messaggi in div)
    cy.contains(testMessage).should("be.visible");
  });
});
