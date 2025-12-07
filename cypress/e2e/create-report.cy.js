import CreateReportPage from "../pages/create-report.page";

/**
 * @description Test suite for the user flow of creating a new report,
 * covering successful submission and map interaction logic.
 * @type {Cypress.Spec}
 */
describe("Create Report Flow", () => {
  /**
   * @description Setup executed before each test case.
   * Starts a new report session, typically navigating to the report creation page.
   */
  beforeEach(() => {
    cy.startNewReport();
  });

  /**
   * @description Global exception handler to ignore known, non-critical errors
   * often associated with the Leaflet map library in Cypress tests.
   * This prevents tests from failing due to external library issues.
   * @param {Error} err - The error object.
   * @returns {boolean} Returns false if the error should be ignored.
   */
  Cypress.on("uncaught:exception", (err, runnable) => {
    if (err.message.includes("_leaflet_pos")) {
      return false;
    }
  });

  /**
   * @description Test case for successfully creating and submitting a new report
   * with all required information: location, title, description, category, and photo.
   */
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

  /**
   * @description Test case to verify that the map marker's position updates correctly
   * when the user clicks on different locations on the map.
   */
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
