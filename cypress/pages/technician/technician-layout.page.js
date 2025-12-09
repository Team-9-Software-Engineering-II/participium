/**
 * @fileoverview Page Object Model for the Technician Report Management views.
 * This class provides selectors and interaction methods for the Technician Dashboard,
 * covering active, external maintainer, and history report lists, as well as
 * the external assignment flow.
 */

class TechnicianLayoutPage {
  // =========================================================================
  // Element Selectors
  // =========================================================================

  /**
   * Provides encapsulated access to all required Cypress selectors (using data-cy attributes).
   * @type {Object<string, function(): Cypress.Chainable<JQuery<HTMLElement>>>}
   */
  elements = {
    // Navigation/Sidebar Selectors
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The main technician sidebar container. */
    sidebar: () => cy.get('[data-cy="technician-sidebar"]'),
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The navigation link for Active Reports. */
    navActiveReports: () => cy.get('[data-cy="nav-active-reports"]'),
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The navigation link for Maintainer Reports. */
    navMaintainerReports: () => cy.get('[data-cy="nav-maintainer"]'),
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The navigation link for History Reports. */
    navHistoryReports: () => cy.get('[data-cy="nav-history"]'),

    // Report List Selectors
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The container element holding the list of reports. */
    reportList: () => cy.get('[data-cy="report-list"]'),

    /**
     * Finds a specific report card by its title.
     * @param {string} title The expected title text of the report.
     * @returns {Cypress.Chainable<JQuery<HTMLElement>>} The report card element corresponding to the title.
     */
    reportCard: (title) =>
      cy
        .get('[data-cy="report-list"]')
        .contains(".text-xl", title)
        .parents('[data-cy="report-card"]'),
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The first report card element in the list. */
    reportCardFirst: () => cy.get('[data-cy="report-card"]').first(),

    // Report Card Interaction Elements
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The 'View Details' button on the first report card. */
    viewDetailsButton: () =>
      cy
        .get('[data-cy="report-card"]')
        .first()
        .find('[data-cy="view-details-button"]'),

    // External Assignment Dialog Elements
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The button to open the external assignment dialog. */
    assignMaintainerButton: () =>
      cy
        .get('[data-cy="report-card"]')
        .first()
        .find('[data-cy="assign-maintainer-btn"]'),
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The trigger element for the company selection dropdown. */
    companySelectTrigger: () => cy.get('[data-cy="company-select-trigger"]'),

    /**
     * Finds a specific company item within the selection dropdown.
     * @param {string} name The name of the company to select.
     * @returns {Cypress.Chainable<JQuery<HTMLElement>>} The select item element.
     */
    selectItem: (name) => {
      const formattedName = name.replace(/\s/g, "-");
      return cy.get(`[data-cy="select-item-${formattedName}"]`);
    },
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The button to confirm the external assignment. */
    confirmAssignmentButton: () =>
      cy.get('[data-cy="confirm-assignment-button"]'),
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The button to cancel and close the assignment dialog. */
    cancelAssignmentButton: () =>
      cy.get('[data-cy="cancel-assignment-button"]'),

    // Empty State Selectors
    /** @returns {Cypress.Chainable<JQuery<HTMLElement>>} The 'No history' message element. */
    noHistoryMessage: () => cy.get('[data-cy="no-history-message"]'),
  };

  // =========================================================================
  // Interaction Methods
  // =========================================================================

  /**
   * Navigates to the Active Reports page and asserts the list is visible.
   */
  visitActiveReports() {
    cy.visit("/technical/reports/active");
    this.elements.reportList().should("be.visible");
  }

  /**
   * Clicks the Maintainer Reports navigation link and asserts the list is visible.
   */
  goToMaintainerReports() {
    this.elements.navMaintainerReports().click();
    this.elements.reportList().should("be.visible");
  }

  /**
   * Opens the External Assignment Dialog for the first report card.
   * Asserts that the confirmation button becomes visible, indicating the dialog is open.
   */
  openAssignMaintainerDialog() {
    this.elements.assignMaintainerButton().click();
    this.elements.confirmAssignmentButton().should("be.visible");
  }

  /**
   * Asserts that a report with the specified title is visible in the current list.
   * @param {string} title The title of the report to verify.
   */
  verifyReportVisible(title) {
    this.elements.reportCard(title).should("be.visible");
  }

  /**
   * Executes the full external assignment flow: selects the company and confirms.
   * Note: This method relies on the assignment dialog being currently open.
   * @param {string} companyName The exact name of the company to assign the report to.
   */
  selectAndConfirmAssignment(companyName) {
    this.elements.companySelectTrigger().click();
    this.elements.selectItem(companyName).click();
    this.elements.confirmAssignmentButton().click();
  }
}

export default new TechnicianLayoutPage();
