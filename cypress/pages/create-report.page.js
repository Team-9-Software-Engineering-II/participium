class CreateReportPage {
  elements = {
    title: () => cy.get('[data-cy="create-report-title"]'),
    warningText: () => cy.get('[data-cy="create-report-warning"]'),
    locationInput: () => cy.get('[data-cy="location-input"]'),
    locationSearchInput: () =>
      cy.get('[data-cy="location-search-input"]:visible').first(),
    category: () => cy.get('[data-cy="category"]'),
    locationSearchResults: () => cy.get('[data-cy="location-search-result"]'),
    categorySelect: () => cy.get('[data-cy="select-category"]'),
    categoryOption: () => cy.get(`[data-cy="category-option"]`),
    reportTitleInput: () => cy.get('[data-cy="report-title-input"]'),
    reportDescriptionTextarea: () =>
      cy.get('[data-cy="report-description-textarea"]'),
    photoPreview: (index = 0) => cy.get(`[data-cy="photo-preview-${index}"]`),
    photoRemoveButton: (index = 0) =>
      cy.get(`[data-cy="photo-remove-${index}"]`),
    photoPrevButton: () => cy.get('[data-cy="photo-prev-button"]'),
    photoNextButton: () => cy.get('[data-cy="photo-next-button"]'),
    userFirstName: () => cy.get('[data-cy="user-first-name"]'),
    userLastName: () => cy.get('[data-cy="user-last-name"]'),
    userEmail: () => cy.get('[data-cy="user-email"]'),
    submitButton: () => cy.get('[data-cy="submit-report-button"]'),
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
      .locationSearchInput()
      .should("be.visible")
      .realClick({ force: true })
      .clear({ force: true })
      .realType(address, { force: true });

    this.elements.locationSearchResults().first().click({ force: true });
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
    if (data.email) this.elements.userEmail().clear().type(data.email);
  }

  /**
   * Navigates through photo previews
   * @param {string} direction - "next" or "prev"
   */
  navigatePhoto(direction) {
    if (direction === "next") this.elements.photoNextButton().click();
    else if (direction === "prev") this.elements.photoPrevButton().click();
  }

  /**
   * Removes a photo by index
   * @param {number} index
   */
  removePhoto(index = 0) {
    this.elements.photoRemoveButton(index).click();
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
}

export default new CreateReportPage();
