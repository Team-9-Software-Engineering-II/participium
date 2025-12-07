import OfficerLayoutPage from "../../pages/officer/officerLayout.page";
import OfficerReportsPage from "../../pages/officer/officerReports.page";

describe("Officer Dashboard E2E - Sidebar counts & navigation", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.loginAsMunicipalOfficer();
    OfficerLayoutPage.visit();
  });

  it("should navigate to Assigned Reports and open a report detail", () => {
    OfficerLayoutPage.goToAssigned();
    cy.url().should("include", "/municipal/assigned");
    OfficerReportsPage.elements.reportCard().first().click();
  });

  it("should navigate to Rejected Reports", () => {
    OfficerLayoutPage.goToRejected();
    cy.url().should("include", "/municipal/rejected");
  });
});
