class MapViewPage {
  elements = {
    mapContainer: () => cy.get('[data-cy="map-container"]'),
    searchInput: () => cy.get('[data-cy="search-input"]'),
    locationMarker: () => cy.get('[data-cy="location-marker"]'),
    reportPopup: () => cy.get('[data-cy="report-popup"]'),
    searchResults: () => cy.get('[data-cy="search-result"]'),
  };

  visit() {
    cy.visit("/");
  }

  clickMap(position = "center") {
    this.elements.mapContainer().click(position);
  }

  searchAddress(address) {
    if (!address || typeof address !== "string") {
      throw new Error("searchAddress requires a valid string");
    }

    this.elements
      .searchInput()
      .scrollIntoView({ block: "center" })
      .click({ force: true })
      .clear({ force: true })
      .type(address, { force: true });

    cy.wait(500);

    this.elements.searchResults().first().click({ force: true });
  }

  verifyLocationMarker() {
    this.elements.locationMarker().should("exist");
  }

  verifyReportPopup() {
    this.elements.reportPopup().should("exist");
  }
}

export default new MapViewPage();
