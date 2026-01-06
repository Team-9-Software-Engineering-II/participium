describe("Citizen Anonymous Report Flow", () => {
  const reportTitle = "Dangerous hole in Via Roma";
  const reportDescription =
    "There is a deep hole in front of number 10, risk of falling.";

  beforeEach(() => {
    cy.intercept("POST", "**/auth/login").as("loginRequest");
    cy.intercept("GET", "**/reports").as("getAllReports"); // Public reports
    cy.intercept("GET", "**/reports/assigned").as("getAssignedReports"); // Logged in logic
    cy.intercept("POST", "**/upload/photos").as("uploadPhotos");
    cy.intercept("POST", "**/reports").as("createReport");

    cy.intercept("GET", "https://nominatim.openstreetmap.org/**", {
      statusCode: 200,
      body: {
        address: { road: "Via Roma", house_number: "10" },
        display_name: "Via Roma 10, Torino",
      },
    }).as("reverseGeocode");

    cy.visit("/login");

    cy.get('input[name="username"]').type("mario.rossi");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();

    cy.wait("@loginRequest");
    cy.url().should("include", "/");
  });

  it("should verify that a logged-in citizen can submit an anonymous report", () => {
    cy.get(".leaflet-container").filter(":visible").click(400, 300);

    cy.get('[data-cy="create-report-button"]').filter(":visible").click();

    cy.url().should("include", "/reports/new");

    cy.get('[data-cy="select-category"]').click();

    cy.get('[data-cy="category"]').first().click();

    cy.get('[data-cy="report-title-input"]').type(reportTitle);
    cy.get('[data-cy="report-description-textarea"]').type(reportDescription);

    cy.get("#photo-upload").selectFile("cypress/fixtures/test-image.jpg", {
      force: true,
    });

    cy.get('img[alt="Report attachment"]').should("be.visible");

    cy.get("button#anonymous").click();

    cy.get("button#anonymous").should("have.attr", "data-state", "checked");

    cy.get('[data-cy="submit-report-button"]').click();

    cy.contains("Anonymous Report").should("be.visible");
    cy.contains("button", "Yes").click();

    cy.wait("@uploadPhotos");
    cy.wait("@createReport").its("response.statusCode").should("eq", 201);

    cy.url().should("include", "/");

    cy.contains("span", "My reports")
      .parent()
      .find('button[role="switch"]')
      .click();

    cy.contains(reportTitle).should("be.visible");

    cy.contains(reportTitle)
      .parents(".rounded-xl")
      .within(() => {
        cy.contains("Anonymous").should("be.visible");
        cy.contains("mario.rossi").should("not.exist");
      });

    cy.contains(reportTitle).click();

    cy.url().should("include", "/reports/");

    cy.scrollTo("bottom");

    cy.contains("Anonymous").should("be.visible");
    cy.contains("mario.rossi").should("not.exist");
  });
});
