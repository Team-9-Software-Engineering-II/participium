describe("External Maintainer Chat Flow", () => {
  const replyMessage = "Message received. I am on my way to check.";

  beforeEach(() => {
    cy.intercept("GET", "**/offices/reports/assigned").as("getAssignedReports");
    cy.intercept("GET", "**/reports/*").as("getReportDetails");
    cy.intercept("GET", "**/messages/reports/*").as("getMessages");
    cy.intercept("POST", "**/messages/reports/*").as("sendMessage");

    // 2. Login
    cy.visit("/login");
    cy.get('input[name="username"]').type("em_waste_amiat");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();

    cy.contains("External Maintainer Dashboard").should("be.visible");
  });

  it("should view the assigned report and reply to the technical officer", () => {
    // --- STEP 1: Attendi caricamento dati ---
    cy.wait("@getAssignedReports");

    // --- STEP 2: Interazione con la Tabella (Desktop View) ---
    // Verifica che la tabella esista
    cy.get('[data-cy="reports-table"]').should("be.visible");

    // Trova la prima riga della tabella (report attivo)
    cy.get('[data-cy="report-row"]')
      .first()
      .within(() => {
        // Cerca il bottone che contiene "View" o l'icona ArrowRight
        cy.contains("button", "View").click();
      });

    // --- STEP 3: Verifica Pagina Dettaglio ---
    cy.wait("@getReportDetails");
    // Verifica che siamo nella pagina dettaglio (il titolo generico o il bottone chat)
    cy.get('[data-cy="report-title"]').should("be.visible");

    // --- STEP 4: Apri la Chat ---
    cy.get("button svg.lucide-message-square")
      .parent()
      .should("be.visible")
      .click();

    // --- STEP 5: Scrivi e Invia ---
    cy.wait("@getMessages");
    cy.contains("Conversation with").should("be.visible");

    cy.get('input[placeholder="Type a message..."]')
      .should("be.visible")
      .type(replyMessage);

    cy.get('form button[type="submit"]').click();

    // --- STEP 6: Verifica ---
    cy.wait("@sendMessage")
      .its("response.statusCode")
      .should("be.oneOf", [200, 201]);
    cy.contains(replyMessage).should("be.visible");
  });
});
