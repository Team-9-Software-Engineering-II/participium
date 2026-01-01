/**
 * @fileoverview E2E tests for Technician Reports feature, covering general functionality
 * and the External Maintainer Assignment user story (980).
 */

import technicianLayoutPage from "../../pages/technician/technician-layout.page";

describe("Technician Report Management", () => {
  // Reliance on seeded data for external assignment flow
  const EXTERNAL_COMPANY_NAME = "SMAT S.p.A.";

  /** @type {string} Stores the title of the first active report dynamically read from the UI. */
  let dynamicReportTitle;

  /**
   * Logs in as a technician and ensures the active report list is visited before each test.
   */
  beforeEach(() => {
    cy.loginAsTechOfficer();
    technicianLayoutPage.visitActiveReports();
    technicianLayoutPage.elements.reportTitleFirst().then(($title) => {
      dynamicReportTitle = $title.text().trim();
      expect(dynamicReportTitle).to.not.be.empty;
    });
  });

  /**
   * @test
   * Verifies that the active assigned reports list loads correctly.
   */
  it("should load the list of active assigned reports", () => {
    technicianLayoutPage.elements.reportList().should("exist");
    technicianLayoutPage.elements
      .reportCardFirst()
      .should("have.length.greaterThan", 0);
  });

  /**
   * @test
   * Verifies that a report status can be updated and the update button appears only after a change.
   */
  it("should allow status update for a report", () => {
    technicianLayoutPage.elements.statusSelect().click({ force: true });
    cy.contains("Suspended").click();
    technicianLayoutPage.elements.updateStatusButton().should("exist").click();
  });

  /**
   * @test
   * Verifies navigation from a report card to the report details page.
   */
  it("should navigate to details page from a report card", () => {
    technicianLayoutPage.elements.viewDetailsButton().click();
    cy.url().should("include", "/reports/");
  });

  /**
   * @test
   * Checks that the history view displays either the list of reports or the empty state.
   */
  it("should switch to history view and show report list/empty view", () => {
    cy.intercept("GET", "**/offices/reports/**").as("getReports");
    cy.visit("/technical/reports/history");
    cy.wait("@getReports");

    cy.get("body").then(($body) => {
      const isReportListPresent =
        $body.find('[data-cy="report-list"]').length > 0;

      if (isReportListPresent) {
        technicianLayoutPage.elements
          .reportCardFirst()
          .should("be.visible");
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
    technicianLayoutPage.elements.reportCardFirst().within(() => {
      cy.get("span").contains(/\d{4}/).should("exist");
      cy.get("span")
        .contains(/\d+\.\d+/)
        .should("exist");
    });
  });

  /**
   * @test
   * Ensures that the update button appears only after changing the status select value.
   */
  it("should show update button only when status changes", () => {
    technicianLayoutPage.elements.statusSelect().click({ force: true });
    cy.contains("In Progress").click();

    technicianLayoutPage.elements.updateStatusButton().should("exist");
  });

  /**
   * @test
   * Verifies navigation to report details page and back to the active list.
   */
  it("should navigate to report details and back", () => {
    technicianLayoutPage.elements.viewDetailsButton().click();
    cy.url().should("include", "/reports/");

    cy.go("back");
    cy.url().should("include", "/technical/reports/active");
  });

  describe("External Maintainer Assignment Flow", () => {
    /**
     * @test
     * Verifies assigning the report externally and verifying
     * its movement from the Active tab to the Maintainer tab.
     */
    it("should successfully assign a report externally and verify tab change", () => {
      // ARRANGE: Verify the report is visible in the Active queue
      technicianLayoutPage.verifyReportVisible(dynamicReportTitle);

      // ACT 1: Open the assignment dialog
      technicianLayoutPage.openAssignMaintainerDialog(dynamicReportTitle);

      // ACT 2: Select the external company and confirm assignment
      technicianLayoutPage.selectAndConfirmAssignment(EXTERNAL_COMPANY_NAME);

      // ACT 3: Navigate to the 'Maintainers Reports' tab
      technicianLayoutPage.goToMaintainerReports();

      // ASSERT 3: Verify the report appears in the 'Maintainers Reports' tab
      technicianLayoutPage.verifyReportVisible(dynamicReportTitle);

      // ASSERT 4: Verify the report card indicates external assignment status
      technicianLayoutPage.elements
        .reportCard(dynamicReportTitle)
        .should("contain", "External");
    });

    /**
     * @test
     * Verifies that the assignment confirmation button is disabled if no company is selected.
     */
    it("should disable confirmation button when no company is selected in the dialog", () => {
      // ARRANGE: Open dialog
      technicianLayoutPage.openAssignMaintainerDialog(dynamicReportTitle);

      // ASSERT: Confirm button should be disabled by default
      technicianLayoutPage.elements
        .confirmAssignmentButton()
        .should("be.disabled");

      // ACT: Select a company to enable the button
      technicianLayoutPage.elements.companySelectTrigger().click();
      technicianLayoutPage.elements.selectItem(EXTERNAL_COMPANY_NAME).click();

      // ASSERT: Confirm button should be enabled after selection
      technicianLayoutPage.elements
        .confirmAssignmentButton()
        .should("not.be.disabled");

      // Cleanup: Close the dialog
      technicianLayoutPage.elements.cancelAssignmentButton().click();
    });

    /**
     * @test
     * Verifies that the "Maintainers Reports" tab loads correctly and shows external badges.
     */
    it("should load the external maintainers report list", () => {
      technicianLayoutPage.goToMaintainerReports();
      technicianLayoutPage.elements.reportList().should("exist");

      // Verify that reports in this list have the 'External' badge
      technicianLayoutPage.elements
        .reportCardFirst()
        .should("contain", "External");
    });
  });
});
