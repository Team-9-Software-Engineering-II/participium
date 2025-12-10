Cypress.Commands.add(
  "loginAsAdmin",
  (username = "admin", password = "password123") => {
    cy.visit("/login");
    cy.get("input[name=username]").type(username);
    cy.get("input[name=password]").type(password);
    cy.get("button[type=submit]").click();
  }
);

Cypress.Commands.add("loginAsMunicipalOfficer", (username = "pr_officer", password = "password123") => {
  cy.visit("/login");
  cy.get("input[name=username]").type(username);
  cy.get("input[name=password]").type(password);
  cy.get("button[type=submit]").click();
});

Cypress.Commands.add("loginAsUser", (username = "test", password = "test") => {
  cy.visit("/login");
  cy.get("input[name=username]").type(username);
  cy.get("input[name=password]").type(password);
  cy.get("button[type=submit]").click();
});

Cypress.Commands.add("loginAsTechOfficer", (username = "tech_roads", password = "password123") => {
  cy.visit("/login");
  cy.get("input[name=username]").type(username);
  cy.get("input[name=password]").type(password);
  cy.get("button[type=submit]").click();
});

Cypress.Commands.add("loginAsExternalMaintainer", (username = "em_water_smat", password = "password123") => {
  cy.visit("/login");
  cy.get("input[name=username]").type(username);
  cy.get("input[name=password]").type(password);
  cy.get("button[type=submit]").click();
});

Cypress.Commands.add(
  "clickMapAt",
  { prevSubject: "element" },
  (element, { x, y }) => {
    const dom = element.get(0);
    const rect = dom.getBoundingClientRect();
    const clientX = rect.left + x;
    const clientY = rect.top + y;

    dom.dispatchEvent(
      new MouseEvent("mousedown", { clientX, clientY, bubbles: true })
    );
    dom.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: clientX + 1,
        clientY: clientY + 1,
        bubbles: true,
      })
    );
    dom.dispatchEvent(
      new MouseEvent("mouseup", { clientX, clientY, bubbles: true })
    );
  }
);

Cypress.Commands.add("startNewReport", (locationName) => {
  cy.loginAsUser();

  cy.url().should("include", "/");

  cy.get('[data-cy="new-report-button"]').click();

  cy.url().should("include", "/reports/new");
});

Cypress.Commands.add("selectLocation", (address) => {
  cy.get('[data-cy="location-search-input"]', { timeout: 10000 })
    .should("be.visible")
    .click({ force: true })
    .clear({ force: true })
    .type(address, { force: true });

  cy.get('[data-cy^="location-search-result-"]', { timeout: 10000 })
    .first()
    .click({ force: true });

  cy.get('[data-cy="location-confirm"]', { timeout: 10000 })
    .should("be.visible")
    .click({ force: true });
});
