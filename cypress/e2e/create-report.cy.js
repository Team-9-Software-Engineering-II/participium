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

  /*it("should add a new report", () => {
    CreateReportPage.selectLocation("Via Roma, 10, Torino");
    CreateReportPage.fillReportForm({
      title: "Segnalazione buca",
      description: "Buca pericolosa davanti al comune",
      category: "Strade",
    });

    CreateReportPage.submitReport();

    cy.contains("Report creato con successo").should("be.visible");
  });*/

  it("should succesfully create a new report", () => {
    CreateReportPage.clickMap(200, 200).assertMarkerExists();
    CreateReportPage.fillReportForm({
      title: "Buche pericolose sulla strada",
      description:
        "Ci sono grosse buche in mezzo alla carreggiata, rischio incidenti.",
      email: "utente@test.com",
    });
    CreateReportPage.selectCategory("Roads and Urban Furnishings");
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
