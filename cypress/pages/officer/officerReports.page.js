/**
 * Page Object for OfficerReports component.
 * Used to interact with the list of reports in Cypress tests.
 */
class OfficerReportsPage {
  elements = {
    // --- Containers ---
    reportsList: () => cy.get('[data-cy="reports-list"]'),
    emptyMessage: () => cy.get('[data-cy="reports-empty"]'),
    reportCard: () => cy.get(`[data-cy="report-card"]`),
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
}

export default new OfficerReportsPage();
