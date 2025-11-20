Cypress.Commands.add(
  "loginAsAdmin",
  (username = "admin", password = "AdminPass123!") => {
    cy.visit("/login");
    cy.get("input[name=username]").type(username);
    cy.get("input[name=password]").type(password);
    cy.get("button[type=submit]").click();
  }
);

Cypress.Commands.add("loginAsUser", (username, password) => {
  cy.visit("/login");
  cy.get("input[name=username]").type(username);
  cy.get("input[name=password]").type(password);
  cy.get("button[type=submit]").click();
});

Cypress.Commands.add("logout", () => {
  cy.get("button#logout").click();
});
