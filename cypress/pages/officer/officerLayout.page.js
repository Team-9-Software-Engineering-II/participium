/**
 * Page Object for the Officer Dashboard / Layout page.
 * Contains elements and actions to navigate between different report sections.
 */
class OfficerLayoutPage {
  elements = {
    // --- Sidebar ---
    sidebar: () => cy.get('[data-cy="officer-sidebar"]'),
    pendingNav: () => cy.get('[data-cy="nav-pending"]'),
    assignedNav: () => cy.get('[data-cy="nav-assigned"]'),
    rejectedNav: () => cy.get('[data-cy="nav-rejected"]'),

    // --- Badges ---
    pendingBadge: () => cy.get('[data-cy="badge-pending"]'),
    assignedBadge: () => cy.get('[data-cy="badge-assigned"]'),
    rejectedBadge: () => cy.get('[data-cy="badge-rejected"]'),

    // --- Report Cards ---
    reportCard: (title) => cy.contains('[data-cy="report-card"]', title),
  };

  /**
   * Visit the officer dashboard page.
   */
  visit() {
    cy.visit("/municipal/dashboard");
  }

  /**
   * Navigate to Pending Reports section.
   */
  goToPending() {
    this.elements.pendingNav().click();
  }

  /**
   * Navigate to Assigned Reports section.
   */
  goToAssigned() {
    this.elements.assignedNav().click();
  }

  /**
   * Navigate to Rejected Reports section.
   */
  goToRejected() {
    this.elements.rejectedNav().click();
  }

  /**
   * Verify that a report card with the given title is visible.
   * @param {string} title
   */
  verifyReportVisible(title) {
    this.elements.reportCard(title).should("be.visible");
  }

  /**
   * Verify that a report card with the given title is not visible.
   * @param {string} title
   */
  verifyReportNotVisible(title) {
    this.elements.reportCard(title).should("not.exist");
  }

  /**
   * Open a report by clicking its card.
   * @param {string} title
   */
  openReport(title) {
    this.elements.reportCard(title).click();
  }
}

export default new OfficerLayoutPage();
