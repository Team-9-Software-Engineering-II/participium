import OfficerLayoutPage from "../pages/officer/officerLayout.page";
import OfficerReportsPage from "../pages/officer/officerReports.page";
import ReportDetailPage from "../pages/reportDetails.page";

describe("Municipal Officer - Review Reports Flow", () => {
  beforeEach(() => {
    // Step 0: Visit dashboard and ensure logged in
    cy.loginAsMunicipalOfficer(); // custom command, assumes real login
    OfficerLayoutPage.visit();
  });

  it("should reject a pending report with explanation", () => {
    // Step 1: Navigate to Pending Reports
    OfficerLayoutPage.goToPending();

    // Step 2: Wait for reports list to be visible
    OfficerReportsPage.verifyReportsListVisible();

    // Step 3: Pick the first pending report using stable selectors
    cy.get('[data-cy="reports-list"]', { timeout: 10000 })
      .should("be.visible")
      .find(".cursor-pointer.group")
      .first()
      .then(($card) => {
        // Optionally grab report title for assertions
        const reportTitle = $card.find("h3, h1, .CardTitle").text();

        // Open report details
        cy.wrap($card).click();

        // Verify report details are visible
        ReportDetailPage.verifyReportData(reportTitle, "To Assign");

        // Step 4: Reject report with reason
        const rejectReason = "Invalid location details";
        ReportDetailPage.reject(rejectReason);

        // Step 5: Verify redirection back to dashboard
        cy.url().should("include", "/municipal/dashboard");

        // Step 6: Navigate to Rejected Reports section
        OfficerLayoutPage.goToRejected();

        // Verify the rejected report is visible
        cy.get('[data-cy="reports-list"]')
          .should("be.visible")
          .contains(".cursor-pointer.group", reportTitle)
          .click();

        // Verify rejection reason is visible
        ReportDetailPage.verifyRejectionReasonVisible(rejectReason);
      });
  });

  it("should approve a pending report", () => {
    // Navigate to Pending Reports
    OfficerLayoutPage.goToPending();

    OfficerReportsPage.verifyReportsListVisible();

    // Pick the first pending report using stable selectors
    cy.get('[data-cy="reports-list"]', { timeout: 10000 })
      .should("be.visible")
      .find(".cursor-pointer.group")
      .first()
      .then(($card) => {
        const reportTitle = $card.find("h3, h1, .CardTitle").text();

        // Open report details
        cy.wrap($card).click();

        // Approve the report
        ReportDetailPage.approve();

        // Verify redirection back to dashboard
        cy.url().should("include", "/municipal/dashboard");

        // Navigate to Assigned Reports section
        OfficerLayoutPage.goToAssigned();

        // Verify the approved report is visible
        cy.get('[data-cy="reports-list"]')
          .should("be.visible")
          .contains(".cursor-pointer.group", reportTitle);
      });
  });
});
