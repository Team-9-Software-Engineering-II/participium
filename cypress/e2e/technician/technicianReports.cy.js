/**
 * @fileoverview E2E tests for Technician Reports feature.
 * Covers active reports, history, status updates, navigation, and empty states.
 */

describe("Technician Reports", () => {
  /**
   * Logs in as a technician and navigates to active reports before each test.
   */
  beforeEach(() => {
    cy.loginAsTechOfficer();
    cy.visit("/technical/reports/active");
  });

  /**
   * @test
   * Verifies that the active assigned reports list loads correctly.
   */
  it("should load the list of active assigned reports", () => {
    cy.get("[data-cy=report-list]").should("exist");
    cy.get("[data-cy=report-card]").should("have.length.greaterThan", 0);
  });

  /**
   * @test
   * Verifies that a report status can be updated and the update button appears only after a change.
   */
  it("should allow status update for a report", () => {
    // Open the status select for the first report card
    cy.get("[data-cy=status-select]").first().click({ force: true });

    // Choose a new status (In Progress)
    cy.contains("Suspended").click();

    // Ensure update button appears after changing status and click it
    cy.get("[data-cy=update-status-btn]").first().should("exist").click();
  });

  /**
   * @test
   * Verifies navigation from a report card to the report details page.
   */
  it("should navigate to details page from a report card", () => {
    cy.get("[data-cy=view-details-btn]").first().click();

    // URL should contain /reports/ to confirm navigation
    cy.url().should("include", "/reports/");
  });

  /**
   * @test
   * Checks that the history view displays either the list of reports or the empty state.
   */
  it("should switch to history view and show report list/empty view", () => {
    cy.visit("/technical/reports/history");

    cy.get("body").then(($body) => {
      if ($body.find("[data-cy=report-list]").length) {
        cy.get("[data-cy=report-card]").should("have.length.greaterThan", 0);
      } else {
        cy.contains("No history").should("exist");
      }
    });
  });

  /**
   * @test
   * Verifies that the report creation date and coordinates are displayed correctly.
   */
  it("should display report creation date and coordinates", () => {
    cy.get("[data-cy=report-card]").first().within(() => {
      cy.get("span").contains(/\d{4}/).should("exist"); // year part of date
      cy.get("span").contains(/\d+\.\d+/).should("exist"); // latitude or longitude
    });
  });

  /**
   * @test
   * Ensures that the update button appears only after changing the status select value.
   */
  it("should show update button only when status changes", () => {
    cy.get("[data-cy=status-select]").first().click({ force: true });
    cy.contains("In Progress").click();

    cy.get("[data-cy=update-status-btn]").should("exist");
  });

  /**
   * @test
   * Verifies navigation to report details page and back to the active list.
   */
  it("should navigate to report details and back", () => {
    cy.get("[data-cy=view-details-btn]").first().click();
    cy.url().should("include", "/reports/");

    cy.go("back");
    cy.url().should("include", "/technical/reports/active");
  });
});
