import AdminCreateMunicipalityUserPage from "../../pages/admin/municipalityUsers.page";

const uniqueSuffix = Cypress._.random(0, 1000000);

describe("Admin Create Municipality User - simple test", () => {
  before(() => {
    cy.loginAsAdmin();
  });

  it("should allow admin to fill and submit the form", () => {
    cy.visit("/admin/municipality-users");

    AdminCreateMunicipalityUserPage.openCreateUser();

    AdminCreateMunicipalityUserPage.fillForm({
      firstName: "Giovanni",
      lastName: "Bianchi",
      email: `giovanni.bianchi.${uniqueSuffix}@example.com`,
      username: `giovanni.bianchi.${uniqueSuffix}`,
      password: "password123",
      role: "municipality_public_relations_officer",
    });

    AdminCreateMunicipalityUserPage.submit();

    //cy.contains("User created successfully").should("exist");

    cy.url().should("include", "/admin/municipality-users");
    cy.contains(`${"Giovanni"} ${"Bianchi"}`).should("exist");
    cy.contains(`giovanni.bianchi.${uniqueSuffix}`).should("exist");
    cy.contains("municipality_public_relations_officer").should("exist");

    cy.get('[data-cy="search-users"]').type(`giovanni.bianchi.${uniqueSuffix}`);
    cy.contains(`${"Giovanni"} ${"Bianchi"}`).should("exist");
  });
});
