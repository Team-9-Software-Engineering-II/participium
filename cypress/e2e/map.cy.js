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

  it("should move the marker when clicking the map", () => {
    MapViewPage.clickMap(300, 300).assertMarkerExists();
  });

  it("should redirect to login when guest clicks New Report", () => {
    MapViewPage.clickMap(300, 300).assertReportButtonVisible();

    MapViewPage.elements.createReportButton().click({ force: true });
    cy.url().should("include", "/login");
  });
});
