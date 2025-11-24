import MapViewPage from "../pages/map.page";

describe("Map interactions as logged user", () => {
  beforeEach(() => {
    cy.loginAsUser();
    MapViewPage.visit();
  });

  it("should move the user marker when searching for an address", () => {
    MapViewPage.searchAddress("Via Roma").assertMarkerExists();
  });

  it("should move the user marker when clicking on the map", () => {
    MapViewPage.clickMap(200, 200).assertMarkerExists();
  });

  it("should open report button when clicking the map", () => {
    MapViewPage.clickMap(250, 250).assertReportButtonVisible();
  });
});

describe("Map interactions as guest", () => {
  beforeEach(() => {
    cy.clearCookies();
    MapViewPage.visit();
  });

  it("should display search results list when typing an address", () => {
    MapViewPage.elements
      .searchInput()
      .click({ force: true })
      .type("Via Roma", { force: true });

    MapViewPage.elements
      .searchResults()
      .should("exist")
      .and("be.visible")
      .and("have.length.greaterThan", 0);
  });

  it("should redirect to login when guest clicks New Report", () => {
    MapViewPage.clickMap(300, 300).assertReportButtonVisible();

    MapViewPage.elements.createReportButton().click({ force: true });
    cy.url().should("include", "/login");
  });

  it("should update marker position after a second click", () => {
    // First click
    MapViewPage.clickMap(200, 200);

    cy.get(".custom-user-marker")
      .invoke("attr", "style")
      .then((firstPos) => {
        // Second click
        MapViewPage.clickMap(400, 150);

        cy.get(".custom-user-marker")
          .invoke("attr", "style")
          .should((secondPos) => {
            expect(secondPos).to.not.equal(firstPos);
          });
      });
  });

  it("should hide search results after selecting an address", () => {
    MapViewPage.elements
      .searchInput()
      .click({ force: true })
      .type("Via Roma", { force: true });

    MapViewPage.elements.searchResults().should("exist").and("be.visible");

    MapViewPage.elements.searchResults().first().click({ force: true });

    MapViewPage.elements.searchResults().should("not.exist");
  });

  it("should not keep the marker after page reload", () => {
    MapViewPage.clickMap(200, 200).assertMarkerExists();

    cy.reload();

    cy.get(".custom-user-marker").should("not.exist");
  });
});
