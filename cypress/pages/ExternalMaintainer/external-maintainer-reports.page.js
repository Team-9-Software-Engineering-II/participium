/**
 * @file Page Object Model for the External Maintainer Reports page.
 * @description Contains elements and actions necessary to interact with and update the status of assigned reports.
 */

class ExternalMaintainerReportsPage {
  elements = {
    // --- Layout and General Elements ---
    reportsTitle: (type) =>
      cy
        .get('[data-cy="reports-title"]')
        .contains(type === "active" ? "Your Reports" : "Resolved Reports"),

    // --- Report Elements (Desktop Table) ---
    reportRow: () =>
      cy.get('[data-cy="reports-table"]').find('[data-cy="report-row"]'), // Targets <tr> inside the table

    // --- Status Update Dialog Elements ---
    updateButton: (index = 0) =>
      this.elements
        .reportRow()
        .eq(index)
        .find('[data-cy="update-status-button"]'),

    statusDialog: () => cy.get('[data-cy="status-dialog"]'),
    statusSelectTrigger: () => cy.get('[data-cy="status-select-trigger"]'),

    // Selects the status option based on its displayed text
    statusOption: (statusLabel) =>
      cy.get('[data-cy="status-option"]').contains(statusLabel),

    saveButton: () => cy.get('[data-cy="save-changes-button"]'),

    // Status badges on the main row (needed for verification)
    currentStatusBadge: (index = 0) =>
      this.elements
        .reportRow()
        .eq(index)
        .find('[data-cy="current-status-badge"]'),

    // --- Utility ---
    loadingSpinner: () => cy.get(".animate-spin"),
    toastSuccess: () => cy.contains("Status updated"),
  };

  /**
   * Visits the active reports section.
   */
  visitActive() {
    cy.visit("/external-maintainer/reports/active");
    this.elements.loadingSpinner().should("not.exist");
    this.elements.reportsTitle("active").should("be.visible");
  }

  /**
   * Visits the history reports section.
   */
  visitHistory() {
    cy.visit("/external-maintainer/reports/history");
    this.elements.loadingSpinner().should("not.exist");
    this.elements.reportsTitle("history").should("be.visible");
  }

  /**
   * Opens the status update dialog for a specific report row.
   * @param {number} index - The zero-based index of the report row (0 for the first).
   */
  openStatusDialog(index = 0) {
    this.elements.updateButton(index).click();
    this.elements.statusDialog().should("be.visible");
  }

  /**
   * Selects a new status within the opened dialog.
   * @param {string} newStatusLabel - The new status label ('In Progress', 'Suspended', 'Resolved').
   */
  selectNewStatus(newStatusLabel) {
    this.elements.statusSelectTrigger().click();
    // Wait for the dropdown menu to be visible
    cy.get("body").should("have.class", "dialog-open");
    this.elements.statusOption(newStatusLabel).click();
  }

  /**
   * Clicks the Save Changes button to finalize the status update.
   */
  saveChanges() {
    this.elements.saveButton().click();
  }

  /**
   * Updates the status of a given report by index.
   * @param {number} index - The zero-based index of the report row.
   * @param {string} newStatusLabel - The status to set.
   */
  updateReportStatus(index, newStatusLabel) {
    this.openStatusDialog(index);
    this.selectNewStatus(newStatusLabel);
    this.elements.saveButton().should("be.enabled");
    this.saveChanges();
  }
}

export default new ExternalMaintainerReportsPage();
