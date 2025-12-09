import MapViewPage from "../pages/map.page";

/**
 * @description Test suite focusing on map interactions when the user is logged in.
 * It verifies marker placement through search and click, and the visibility of the report creation button.
 * @type {Cypress.Spec}
 */
describe("Map interactions as logged user", () => {
  /**
   * @description Setup executed before each test case.
   * Logs in a standard user and navigates to the map view page.
   */
  beforeEach(() => {
    cy.loginAsUser();
    MapViewPage.visit();
  });

  /**
   * @description Test case to verify that the user's temporary marker moves to the
   * searched location after an address search.
   */
  it("should move the user marker when searching for an address", () => {
    MapViewPage.searchAddress("Via Roma").assertMarkerExists();
  });

  /**
   * @description Test case to verify that the user's temporary marker is placed
   * when clicking anywhere on the map.
   */
  it("should move the user marker when clicking on the map", () => {
    MapViewPage.clickMap(200, 200).assertMarkerExists();
  });

  /**
   * @description Test case to verify that the "Create New Report" button becomes
   * visible after the user selects a location by clicking the map.
   */
  it("should open report button when clicking the map", () => {
    MapViewPage.clickMap(250, 250).assertReportButtonVisible();
  });
});

/**
 * @description Test suite focusing on map interactions when the user is a guest (not logged in).
 * It covers address search functionality, redirection upon trying to create a report,
 * marker updates, and session persistence.
 * @type {Cypress.Spec}
 */
describe("Map interactions as guest", () => {
  /**
   * @description Setup executed before each test case.
   * Clears cookies to ensure a guest state and navigates to the map view page.
   */
  beforeEach(() => {
    cy.clearCookies();
    MapViewPage.visit();
  });

  /**
   * @description Test case to verify that a list of search results appears
   * dynamically when a guest types an address into the search box.
   */
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

  /**
   * @description Test case to verify that a guest attempting to click the "Create New Report"
   * button is redirected to the login page.
   */
  it("should redirect to login when guest clicks New Report", () => {
    MapViewPage.clickMap(300, 300).assertReportButtonVisible();

    MapViewPage.elements.createReportButton().click({ force: true });
    cy.url().should("include", "/login");
  });

  /**
   * @description Test case to verify that a map marker's position updates correctly
   * when the guest clicks a second time, confirming map interaction logic.
   */
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

  /**
   * @description Test case to verify that the temporary marker placed by a click
   * does not persist across a page reload, indicating non-session-based state.
   */
  it("should not keep the marker after page reload", () => {
    MapViewPage.clickMap(200, 200).assertMarkerExists();

    cy.reload();

    cy.get(".custom-user-marker").should("not.exist");
  });
});
