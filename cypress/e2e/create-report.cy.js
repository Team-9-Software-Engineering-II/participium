import CreateReportPage from "../pages/create-report.page";

describe("Create Report Flow", () => {
  beforeEach(() => {
    cy.startNewReport();
  });

  Cypress.on("uncaught:exception", (err, runnable) => {
    if (err.message.includes("_leaflet_pos")) {
      return false;
    }
  });

  it("should succesfully create a new report", () => {
    CreateReportPage.clickMap(200, 200).assertMarkerExists();
    CreateReportPage.fillReportForm({
      title: "Buche pericolose sulla strada",
      description:
        "Ci sono grosse buche in mezzo alla carreggiata, rischio incidenti.",
    });
    CreateReportPage.selectCategory("Roads and Urban Furnishings");
    CreateReportPage.uploadPhoto("test-image.png");
    CreateReportPage.submitReport();
  });

  it("should update marker when clicking the map multiple times", () => {
    CreateReportPage.clickMap(200, 200).assertMarkerExists();

    cy.get(".custom-user-marker")
      .invoke("attr", "style")
      .then((firstPos) => {
        CreateReportPage.clickMap(350, 250);

        cy.get(".custom-user-marker")
          .invoke("attr", "style")
          .should((secondPos) => {
            expect(secondPos).to.not.equal(firstPos);
          });
      });
  });
});
