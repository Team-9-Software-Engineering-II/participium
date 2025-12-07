class CreateReportPage {
  elements = {
    searchInput: () => cy.get('[data-cy="search-input"]'),
    searchResults: () => cy.get('[data-cy="search-result"]'),
    categorySelect: () => cy.get('[data-cy="select-category"]'),
    category: () => cy.get('[data-cy="category"]'),
    reportTitleInput: () => cy.get('[data-cy="report-title-input"]'),
    reportDescriptionTextarea: () => cy.get('[data-cy="report-description-textarea"]'),
    addPhoto: () => cy.get('[data-cy="add-photo"]'),
    submitButton: () => cy.get('[data-cy="submit-report-button"]'),
    cancelButton: () => cy.get('[data-cy="cancel-button"]'),
    userMarker: () => cy.get(".custom-user-marker"),
  };

  /**
   * Visits the create report page
   */
  visit() {
    cy.visit("/reports/new");
  }

  /**
   * Fills the location search input and selects a result
   * @param {string} address
   */
  selectLocation(address) {
    this.elements
      .searchInput()
      .realClick({ force: true })
      .clear({ force: true })
      .realType(address, { force: true });

    this.elements.searchResults().first().should("be.visible").click({ force: true });
  }

  /**
   * Selects a category
   * @param {string} category - Category name or key
   */
  selectCategory(category) {
    this.elements.categorySelect().click();
    this.elements.category().contains(category).should("be.visible").click();
  }

  /**
   * Fills the report form
   * @param {Object} data
   * @param {string} data.title - Report title
   * @param {string} data.description - Report description
   * @param {string} data.email - User email
   */
  fillReportForm(data) {
    if (data.title) this.elements.reportTitleInput().clear().type(data.title);
    if (data.description)
      this.elements.reportDescriptionTextarea().clear().type(data.description);
  }

  /**
   * Submits the report
   */
  submitReport() {
    this.elements.submitButton().click();
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
   * Uploads a dummy photo file
   */
  uploadPhoto(fileName = 'avatar-test.png') {
    const fileInputId = '#photo-upload';

    cy.fixture(fileName, 'binary')
      .then(Cypress.Blob.binaryStringToBlob)
      .then((fileContent) => {
        cy.get(fileInputId, { force: true })
          .attachFile({
            fileContent,
            fileName,
            mimeType: 'image/png',
            encoding: 'base64',
          });
      });
  }
}

export default new CreateReportPage();
