import OfficerDashboardPage from "../../pages/officer/officerDashboard.page";
import OfficerReportsPage from "../../pages/reportDetails.page";

describe("Officer Dashboard E2E - Sidebar counts & navigation", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.loginAsMunicipalOfficer();
    OfficerDashboardPage.visit();
  });

  it("should display correct reports counts in sidebar badges", () => {
    OfficerDashboardPage.elements.pendingBadge().should("contain", "2");
    OfficerDashboardPage.elements.assignedBadge().should("contain", "1");
    OfficerDashboardPage.elements.rejectedBadge().should("contain", "1");
  });

  it("should navigate to Pending Reports and list results", () => {
    OfficerDashboardPage.goToPending();
    cy.url().should("include", "/municipal/dashboard");
    OfficerReportsPage.elements
      .list()
      .children()
      .should("have.length.at.least", 1);
  });

  it("should navigate to Assigned Reports and open a report detail", () => {
    OfficerDashboardPage.goToAssigned();
    cy.url().should("include", "/municipal/assigned");
    OfficerReportsPage.elements.reportCard(3).click();
    cy.url().should("include", "/reports/3");
  });

  it("should navigate to Rejected Reports", () => {
    OfficerDashboardPage.goToRejected();
    cy.url().should("include", "/municipal/rejected");
  });
});
