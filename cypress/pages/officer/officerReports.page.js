/**
 * Page Object for OfficerReports component.
 * Used to interact with the list of reports in Cypress tests.
 */
class OfficerReportsPage {
  elements = {
    // --- Containers ---
    reportsList: () => cy.get('[data-cy="reports-list"]'),
    emptyMessage: () => cy.get('[data-cy="reports-empty"]'),

    /**
     * Get a report card by its ID.
     * @param {number|string} id
     */
    reportCard: (id) => cy.get(`[data-cy="report-card-${id}"]`),

    /**
     * Get the title inside a report card.
     * @param {number|string} id
     */
    reportCardTitle: (id) =>
      cy.get(`[data-cy="report-card-${id}"]`).find("h3, h1, .CardTitle"),

    /**
     * Get the category badge inside a report card.
     * @param {number|string} id
     */
    reportCardCategory: (id) =>
      cy
        .get(`[data-cy="report-card-${id}"]`)
        .find('[data-cy="category-badge"], .Badge'),

    /**
     * Get the creation date inside a report card.
     * @param {number|string} id
     */
    reportCardDate: (id) =>
      cy.get(`[data-cy="report-card-${id}"]`).find("span.text-xs"),

    /**
     * Get the attachment info inside a report card.
     * @param {number|string} id
     */
    reportCardAttachments: (id) =>
      cy
        .get(`[data-cy="report-card-${id}"]`)
        .find('[data-cy="report-card-attachments"], .flex.items-center'),
  };

  /**
   * Verify the reports list is visible.
   */
  verifyReportsListVisible() {
    this.elements.reportsList().should("be.visible");
  }

  /**
   * Verify the empty message is visible.
   */
  verifyEmptyMessageVisible() {
    this.elements.emptyMessage().should("be.visible");
  }

  /**
   * Verify a report card is visible by ID.
   * @param {number|string} id
   */
  verifyReportVisible(id) {
    this.elements.reportCard(id).should("be.visible");
  }

  /**
   * Verify a report card is not visible by ID.
   * @param {number|string} id
   */
  verifyReportNotVisible(id) {
    this.elements.reportCard(id).should("not.exist");
  }

  /**
   * Click on a report card to open it.
   * @param {number|string} id
   */
  openReport(id) {
    this.elements.reportCard(id).click();
  }

  /**
   * Verify the report card's title.
   * @param {number|string} id
   * @param {string} expectedTitle
   */
  verifyReportTitle(id, expectedTitle) {
    this.elements.reportCardTitle(id).should("contain.text", expectedTitle);
  }

  /**
   * Verify the report card's category.
   * @param {number|string} id
   * @param {string} expectedCategory
   */
  verifyReportCategory(id, expectedCategory) {
    this.elements
      .reportCardCategory(id)
      .should("contain.text", expectedCategory);
  }

  /**
   * Verify the number of attachments in a report card.
   * @param {number|string} id
   * @param {number} expectedCount
   */
  verifyReportAttachments(id, expectedCount) {
    this.elements
      .reportCardAttachments(id)
      .should(
        "contain.text",
        `${expectedCount} attachment${expectedCount !== 1 ? "s" : ""}`
      );
  }
}

export default new OfficerReportsPage();
