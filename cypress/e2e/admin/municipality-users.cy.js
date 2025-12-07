import AdminCreateMunicipalityUserPage from "../../pages/admin/municipalityUsers.page";
import { requiredFieldsMunicipalityUser } from "../../support/constants";

describe("Admin Create Municipality User - simple test", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.visit("/admin/municipality-users");
  });
  const roles = ["municipal_public_relations_officer", "technical_staff"];

  for (const role of roles) {
    it(`should allow admin to create a municipality user with role ${role}`, () => {
      const uniqueSuffix = Cypress._.random(0, 1000000);
      AdminCreateMunicipalityUserPage.openCreateUser();

      AdminCreateMunicipalityUserPage.fillForm({
        firstName: "Giovanni",
        lastName: "Bianchi",
        email: `giovanni.bianchi.${uniqueSuffix}@example.com`,
        username: `giovanni.bianchi.${uniqueSuffix}`,
        password: "password123",
        role: "municipal_public_relations_officer",
      });
      AdminCreateMunicipalityUserPage.submit();

      cy.url().should("include", "/admin/municipality-users");
      cy.contains(`${"Giovanni"} ${"Bianchi"}`).should("exist");
      cy.contains(`giovanni.bianchi.${uniqueSuffix}`).should("exist");
      cy.contains("municipal_public_relations_officer").should("exist");

      cy.get('[data-cy="search-users"]').type(
        `giovanni.bianchi.${uniqueSuffix}`
      );
      cy.contains(`${"Giovanni"} ${"Bianchi"}`).should("exist");
    });
  }

  for (const field of requiredFieldsMunicipalityUser) {
    it(`should fail if ${field} is missing`, () => {
      const formData = {
        firstName: "Luigi",
        lastName: "Verdi",
        email: "test2@example.com",
        username: "user2",
        password: "Password123",
        role: "municipal_public_relations_officer",
      };
      formData[field] = "";

      AdminCreateMunicipalityUserPage.openCreateUser();
      AdminCreateMunicipalityUserPage.fillForm({ formData });
      AdminCreateMunicipalityUserPage.submit();

      // Checks that the page is still "/register"
      cy.url().should(
        "eq",
        Cypress.config().baseUrl + "/admin/municipality-users"
      );
    });
  }

  it("submit should be disabled if the form is incomplete", () => {
    AdminCreateMunicipalityUserPage.openCreateUser();
    AdminCreateMunicipalityUserPage.submit();
    AdminCreateMunicipalityUserPage.elements
      .errorMessage()
      .should(
        "contain.text",
        "Please complete all required fields before submitting."
      );
  });

  it("should close the modal when clicking cancel", () => {
    AdminCreateMunicipalityUserPage.openCreateUser();
    cy.get('[data-cy="cancel"]').click();
    cy.get('[data-cy="create-user-modal"]').should("not.exist");
  });

  it("should allow admin to update only the role of an existing municipality user", () => {
    cy.visit("/admin/municipality-users");

    cy.get('[data-cy="search-users"]').type("pr_officer");
    cy.contains("Giulia Bianchi").should("exist");

    cy.contains("Giulia Bianchi").click();
    cy.get('[data-cy="edit-user"]').click();

    AdminCreateMunicipalityUserPage.editUser("technical_staff");
    cy.get('[data-cy="submit-edit-role"]').click();

    cy.contains("technical_staff").should("exist");
  });

  it("should allow saving without changes", () => {
    cy.visit("/admin/municipality-users");

    cy.get('[data-cy="search-users"]').type("pr_officer");
    cy.contains("Giulia Bianchi").should("exist");

    cy.contains("Giulia Bianchi").click();
    cy.get('[data-cy="edit-user"]').click();
    cy.get('[data-cy="submit-edit-role"]').click();

    cy.url().should("include", "/admin/municipality-users");
    cy.contains("Giulia Bianchi").should("exist");
  });
});
