/**
 * @file End-to-End Test Suite for the External Maintainer Status Update flow.
 * @description Verifies that an external maintainer can successfully update the status
 * of an assigned report and that the report moves correctly between 'Active' and 'History' sections.
 */

import ExternalMaintainerReportsPage from "../../pages/ExternalMaintainer/external-maintainer-reports.page.js";

const REPORT_ROW_INDEX = 0;
const INTERMEDIATE_STATUS = "In Progress";
const FINAL_STATUS = "Resolved";
const SUSPENDED_STATUS = "Suspended";
const INITIAL_STATUS_TO_CHECK = "Assigned";

describe("External Maintainer E2E - Report Status Update Flow", () => {
  /**
   * Setup executed before the test. Logs in the external maintainer.
   */
  beforeEach(() => {
    // Force desktop viewport
    cy.viewport(1280, 720);
    cy.loginAsExternalMaintainer();
    ExternalMaintainerReportsPage.visitActive();
  });

  // --- Test Cases ---

  /**
   * Test 1: Update status from initial state to 'In Progress' and verify visibility.
   */
  it("should update status to 'In Progress' and verify status badge update", () => {
    // 1. Check initial state
    ExternalMaintainerReportsPage.elements
      .reportRow()
      .eq(REPORT_ROW_INDEX)
      .should("exist");

    // 2. Update status to 'In Progress'
    ExternalMaintainerReportsPage.updateReportStatus(
      REPORT_ROW_INDEX,
      INTERMEDIATE_STATUS
    );

    // 3. Verify status badge updates on the row
    ExternalMaintainerReportsPage.elements
      .currentStatusBadge(REPORT_ROW_INDEX)
      .should("contain", INTERMEDIATE_STATUS);
  });

  /**
   * Test 2: Verify the Save button functionality (enabled/disabled).
   */
  it("should disable the save button if the status is not changed", () => {
    // 1. Open the dialog for the first report
    ExternalMaintainerReportsPage.openStatusDialog(REPORT_ROW_INDEX);

    // 2. Get the current status (the one initially selected in the dialog)
    // We use the badge on the report row as the proxy for the current status.
    ExternalMaintainerReportsPage.elements
      .currentStatusBadge(REPORT_ROW_INDEX)
      .invoke("text")
      .then((currentStatus) => {
        // 3. Button should be disabled initially (selected status = current status)
        ExternalMaintainerReportsPage.elements
          .saveButton()
          .should("be.disabled");

        // 4. Change the status to a different one
        const statusToChange =
          currentStatus === INTERMEDIATE_STATUS
            ? SUSPENDED_STATUS
            : INTERMEDIATE_STATUS;
        ExternalMaintainerReportsPage.selectNewStatus(statusToChange);

        // 5. Button should become enabled
        ExternalMaintainerReportsPage.elements
          .saveButton()
          .should("be.enabled");

        // 6. Change the status back to the original status
        ExternalMaintainerReportsPage.selectNewStatus(currentStatus);

        // 7. Button should be disabled again
        ExternalMaintainerReportsPage.elements
          .saveButton()
          .should("be.disabled");
      });

    // Close dialog to clean up state
    cy.get("body").type("{esc}");
  });

  /**
   * Test 3: Update status to 'Resolved' and verify the report moves to History.
   */
  it("should update status to 'Resolved' and move the report from Active to History", () => {
    // 1. Update status to 'Resolved' (This uses the API and refreshes the view)
    ExternalMaintainerReportsPage.updateReportStatus(
      REPORT_ROW_INDEX,
      FINAL_STATUS
    );

    // 2. Verify report disappears from the 'Active' view (list size drops to zero or report doesn't exist)
    ExternalMaintainerReportsPage.elements.reportRow().should("not.exist");

    // 3. Navigate to History section
    ExternalMaintainerReportsPage.visitHistory();

    // 4. Verify the report is now in the 'Resolved Reports' history list (at index 0)
    ExternalMaintainerReportsPage.elements.reportRow().first().should("exist");
    ExternalMaintainerReportsPage.elements
      .currentStatusBadge(REPORT_ROW_INDEX)
      .should("contain", FINAL_STATUS);
  });
});
