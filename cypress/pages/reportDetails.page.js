/**
 * Page Object Model for the Report Detail page.
 * Contains selectors and actions to interact with the report details UI.
 */
class ReportDetailPage {
  elements = {
    // --- Page wrapper (used to assert page loading) ---
    page: () => cy.get('[data-cy="report-details-page"]'),

    // --- Main report info ---
    title: () => cy.get('[data-cy="report-title"]'),
    description: () => cy.get('[data-cy="report-description"]'),
    statusBadge: () => cy.get('[data-cy="status-badge"]'),
    reporterName: () => cy.get('[data-cy="reporter-name"]'),
    rejectionReason: () => cy.get('[data-cy="rejection-reason-text"]'),

    // --- Page sections (optional for UI checks) ---
    photosSection: () => cy.get('[data-cy="photos-section"]'),
    mapSection: () => cy.get('[data-cy="map-section"]'),

    // --- Actions ---
    categorySelectTrigger: () => cy.get('[data-cy="category-select"]'),
    approveBtn: () => cy.get('[data-cy="btn-approve"]'),
    rejectBtn: () => cy.get('[data-cy="btn-reject"]'),

    // --- Reject modal elements ---
    rejectionModal: () => cy.get('[role="dialog"]').first(),
    rejectionTextarea: () => cy.get('[data-cy="rejection-textarea"]'),
    confirmRejectBtn: () => cy.get('[data-cy="btn-confirm-reject"]'),
  };

  /**
   * Ensures that the page is fully loaded and visible.
   * @returns {void}
   */
  verifyLoaded() {
    this.elements.page().should("exist");
    this.elements.title().should("be.visible");
  }

  /**
   * Verifies main report info such as title and status.
   * @param {string} expectedTitle - The expected report title text
   * @param {string} expectedStatus - The expected status badge text
   * @returns {void}
   */
  verifyReportData(expectedTitle, expectedStatus) {
    this.elements.title().should("contain.text", expectedTitle);
    this.elements.statusBadge().should("contain.text", expectedStatus);
    this.elements.description().should("be.visible");
  }

  /**
   * Asserts the rejection reason visibility and optionally verifies its text.
   * @param {string} [expectedReason] - Expected rejection reason text (optional)
   * @returns {void}
   */
  verifyRejectionReasonVisible(expectedReason) {
    this.elements.rejectionReason().should("be.visible");
    if (expectedReason) {
      this.elements.rejectionReason().should("contain.text", expectedReason);
    }
  }

  /**
   * Changes the category using ShadCN UI Select component.
   * @param {string} newCategoryName - The category name to select from the dropdown menu
   * @returns {void}
   */
  changeCategory(newCategoryName) {
    this.elements.categorySelectTrigger().click();
    cy.contains('[role="option"]', newCategoryName).click();
    this.elements
      .categorySelectTrigger()
      .should("contain.text", newCategoryName);
  }

  /**
   * Clicks the button to approve the report.
   * @returns {void}
   */
  approve() {
    this.elements.approveBtn().should("be.visible").click();
  }

  /**
   * Rejects a report by opening the modal and optionally typing a reason.
   * @param {string} [reason] - Optional rejection reason message
   * @returns {void}
   */
  reject(reason) {
    this.elements.rejectBtn().should("be.visible").click();
    this.elements.rejectionTextarea().should("be.visible");

    if (reason) {
      this.elements.rejectionTextarea().type(reason);
    }

    this.elements.confirmRejectBtn().should("not.be.disabled").click();
  }
}

export default new ReportDetailPage();
