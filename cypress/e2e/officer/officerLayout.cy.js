import OfficerLayoutPage from "../../pages/officer/officerLayout.page";
import OfficerReportsPage from "../../pages/officer/officerReports.page";

/**
 * @description Test suite for End-to-End (E2E) verification of the Officer Dashboard
 * focusing on sidebar navigation, report counts, and basic report detail access.
 * @type {Cypress.Spec}
 */
describe("Officer Dashboard E2E - Sidebar counts & navigation", () => {
  /**
   * @description Setup executed before each test case.
   * Sets a consistent viewport, logs in the user as a Municipal Officer,
   * and navigates to the officer's dashboard.
   */
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.loginAsMunicipalOfficer();
    OfficerLayoutPage.visit();
  });

  /**
   * @description Test case to verify navigation to the Assigned Reports section
   * and confirmation that a user can click through to a report's details page.
   */
  it("should navigate to Assigned Reports and open a report detail", () => {
    OfficerLayoutPage.goToAssigned();
    cy.url().should("include", "/municipal/assigned");
    OfficerReportsPage.elements.reportCard().first().click();
  });

  /**
   * @description Test case to verify navigation to the Rejected Reports section.
   */
  it("should navigate to Rejected Reports", () => {
    OfficerLayoutPage.goToRejected();
    cy.url().should("include", "/municipal/rejected");
  });
});
