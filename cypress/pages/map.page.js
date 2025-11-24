class MapViewPage {
  elements = {
    map: () => cy.get('[data-cy="map-container"]'),
    searchInput: () => cy.get('[data-cy="search-input"]:visible').first(),
    searchResults: () => cy.get('[data-cy="search-result"]'),
    userMarker: () => cy.get(".custom-user-marker"),
    createReportButton: () => cy.get('[data-cy="create-report-button"]'),
  };

  visit() {
    return cy.visit("/");
  }

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

  clickMap(x, y) {
    cy.get(".leaflet-container").first().click(x, y, { force: true });
    return this;
  }

  assertMarkerExists() {
    this.elements.userMarker().should("exist");
    return this;
  }

  assertReportButtonVisible() {
    this.elements.createReportButton().should("exist").and("be.visible");
    return this;
  }
}

export default new MapViewPage();
