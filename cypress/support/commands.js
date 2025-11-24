Cypress.Commands.add(
  "loginAsAdmin",
  (username = "admin", password = "password123") => {
    cy.visit("/login");
    cy.get("input[name=username]").type(username);
    cy.get("input[name=password]").type(password);
    cy.get("button[type=submit]").click();
  }
);

Cypress.Commands.add("loginAsUser", (username = "test", password = "test") => {
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
