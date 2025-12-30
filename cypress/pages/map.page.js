class MapViewPage {
  elements = {
    map: () => cy.get('[data-cy="map-container"]'),
    searchInput: () => cy.get('[data-cy="search-input"]:visible').first(),
    searchResults: () => cy.get('[data-cy="search-result"]'),
    userMarker: () => cy.get(".custom-user-marker"),
    createReportButton: () => cy.get('[data-cy="create-report-button"]'),
    /** @returns {Cypress.Chainable} Selector for approved report markers */
    reportMarkers: () => cy.get('[data-cy="report-marker"]'),
    /** @returns {Cypress.Chainable} Selector for the report info window/popup */
    reportPopup: () => cy.get('[data-cy="report-popup"]'),
    /** @returns {Cypress.Chainable} Selector for clusters (optional, but useful) */
    reportClusters: () => cy.get('[data-cy="report-cluster-icon"]'),
  };

  /**
   * Visits the main map page
   * @returns {MapViewPage} chainable
   */
  visit() {
    return cy.visit("/");
  }

  /**
   * Searches for an address and selects the first result
   * @param {string} address - The address to search for
   * @returns {MapViewPage} chainable
   */
  searchAddress(address) {
    this.elements
      .searchInput()
      .should("be.visible")
      .click({ force: true })
      .clear({ force: true })
      .type(address, { force: true });

    this.elements.searchResults().first().click({ force: true });

    return this;
  }

  /**
   * Clicks on the map at specified coordinates
   * @param {number} x - X coordinate on the map
   * @param {number} y - Y coordinate on the map
   * @returns {MapViewPage} chainable
   */
  clickMap(x, y) {
    cy.get(".leaflet-container").first().click(x, y, { force: true });
    return this;
  }

  /**
   * Asserts that the user marker exists on the map
   * @returns {MapViewPage} chainable
   */
  assertMarkerExists() {
    this.elements.userMarker().should("exist");
    return this;
  }

  /**
   * Asserts that the 'Create Report' button is visible
   * @returns {MapViewPage} chainable
   */
  assertReportButtonVisible() {
    this.elements.createReportButton().should("exist").and("be.visible");
    return this;
  }

  /**
   * Simulates a click on the map to place the user marker
   * @param {number} x - X coordinate on the map
   * @param {number} y - Y coordinate on the map
   * @returns {MapViewPage} chainable
   */
  placeMarkerAt(x, y) {
    this.clickMap(x, y);
    this.elements.userMarker().should("exist").and("be.visible");
    return this; // allows method chaining
  }
}

export default new MapViewPage();
