import MapViewPage from "../pages/map.page";

describe("Interactions with the map as a logged user", () => {
  beforeEach(() => {
    cy.loginAsUser();
    MapViewPage.visit();
  });

  it("should move the user marker when searching for an address", () => {
    cy.get("body").then(($body) => {
      console.log($body.html());
    });

    cy.get('[data-cy="map-container"]', { timeout: 15000 }).should("exist");

    cy.get('[data-cy="search-input"]:visible', { timeout: 15000 })
      .should("be.visible")
      .click({ force: true })
      .type("Via Roma", { force: true });

    cy.get('[data-cy="search-result"]', { timeout: 10000 })
      .first()
      .click({ force: true });

    cy.get(".custom-user-marker", { timeout: 15000 }).should("exist");
  });

  it("should move the user marker when clicking on the map", () => {
    cy.get(".leaflet-container").first().clickMapAt({ x: 200, y: 200 });

    cy.get(".leaflet-marker-icon.custom-user-marker", { timeout: 10000 })
      .should("exist")
      .and("be.visible");
  });

  it("should open a popup when clicking on map and display action button", () => {
    cy.get(".leaflet-container").first().click(250, 250, { force: true });

    cy.get('[data-cy="create-report-button"]')
      .should("exist")
      .and("contain.text", "New Report");
  });
});

describe("Interactions with the map as a guest", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.visit("/");
    cy.get('[data-cy="map-container"]', { timeout: 15000 }).should("exist");
  });

  it("should move the user marker when guest clicks on the map", () => {
    cy.get(".leaflet-marker-icon.custom-user-marker", { timeout: 10000 })
      .should("exist")
      .then(($marker) => {
        const before = $marker[0].style.transform || "";

        cy.get(".leaflet-container").first().click(300, 300, { force: true });

        cy.wait(400);

        cy.get(".leaflet-marker-icon.custom-user-marker")
          .should("exist")
          .then(($marker2) => {
            const after = $marker2[0].style.transform || "";
            expect(after).to.not.equal(before);
          });
      });
  });

  it("should display the report button when clicking on the map and redirect guest to login when clicked", () => {
    cy.get(".leaflet-container").first().click(350, 250, { force: true });

    cy.get('[data-cy="create-report-button"]')
      .should("exist")
      .and("be.visible");

    cy.get('[data-cy="create-report-button"]').click({ force: true });

    cy.url().should("include", "/login");
  });
});
