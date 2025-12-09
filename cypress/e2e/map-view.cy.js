describe("MapView E2E Tests", () => {
  /**
   * @description Logs in as a test user and navigates to the main map page before each test
   */
  beforeEach(() => {
    cy.loginAsUser("test", "test");
    cy.visit("/");
  });

  /**
   * @description Verifies that individual markers are visible when zooming in
   */
  it("should show individual markers when zoomed in", () => {
    // Zoom in multiple times to separate the markers
    cy.get(".leaflet-control-zoom-in").click({ multiple: true, force: true });
    cy.wait(500); // Wait for marker rendering

    // Check that individual markers are present and visible
    cy.get(".leaflet-marker-icon")
      .should("exist")
      .and("have.length.greaterThan", 0);
  });

  /**
   * @description Verifies that cluster markers appear when zooming out
   */
  it("should show cluster markers when zoomed out", () => {
    // Zoom out to create clusters
    cy.get(".leaflet-control-zoom-out").click({ multiple: true, force: true });
    cy.wait(500);

    // Check that at least one cluster exists
    cy.get(".custom-cluster-icon").should("exist");

    cy.get(".custom-cluster-icon")
      .first()
      .invoke("text")
      .then((text) => {
        const count = Number.parseInt(text);
        expect(count).to.be.greaterThan(1);
      });
  });
});
