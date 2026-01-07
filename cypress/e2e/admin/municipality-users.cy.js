import AdminCreateMunicipalityUserPage from "../../pages/admin/municipalityUsers.page";
import { requiredFieldsMunicipalityUser } from "../../support/constants";

/**
 * @description E2E suite for Admin management of Municipality Users.
 * Covers creation, validation, and multi-role assignment flexiblity.
 */
describe("Admin Municipality Users Management", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.visit("/admin/municipality-users");
  });

  const roles = ["municipal_public_relations_officer"];

  roles.forEach((role) => {
    it(`should allow admin to create a standard municipality user with role ${role}`, () => {
      const uniqueSuffix = Cypress._.random(0, 1000000);
      const user = {
        firstName: "Giovanni",
        lastName: "Bianchi",
        email: `giovanni.${uniqueSuffix}@example.com`,
        username: `giovanni.${uniqueSuffix}`,
        password: "password123",
        role: role,
      };

      AdminCreateMunicipalityUserPage.openCreateUser();
      AdminCreateMunicipalityUserPage.fillForm(user);
      AdminCreateMunicipalityUserPage.submit();

      // Verification
      cy.get('[data-cy="search-users"]').type(user.username);
      cy.contains(`${user.firstName} ${user.lastName}`).should("exist");
      cy.contains(role).should("exist");
    });
  });

  requiredFieldsMunicipalityUser.forEach((field) => {
    it(`should fail if ${field} is missing`, () => {
      const formData = {
        firstName: "Luigi",
        lastName: "Verdi",
        email: `test.${Cypress._.random(0, 1000)}@example.com`,
        username: `user.${Cypress._.random(0, 1000)}`,
        password: "Password123",
        role: "municipal_public_relations_officer",
      };
      // Clear the specific field to test validation
      formData[field] = "";

      AdminCreateMunicipalityUserPage.openCreateUser();
      AdminCreateMunicipalityUserPage.fillForm(formData);
      AdminCreateMunicipalityUserPage.submit();

      AdminCreateMunicipalityUserPage.elements
        .createUserModal()
        .should("be.visible");
    });
  });

  it("submit should be disabled or show error if the form is incomplete", () => {
    AdminCreateMunicipalityUserPage.openCreateUser();
    AdminCreateMunicipalityUserPage.submit();
    cy.contains("Please complete all required fields").should("be.visible");
  });

  it("should close the modal when clicking cancel", () => {
    AdminCreateMunicipalityUserPage.openCreateUser();
    AdminCreateMunicipalityUserPage.elements.cancelCreateBtn().click();
    AdminCreateMunicipalityUserPage.elements
      .createUserModal()
      .should("not.exist");
  });

  /**
   * @description Tests the creation of a Technical Staff user, which now strictly requires
   * the selection of a Technical Office.
   */
  it("should create a technical staff user with a mandatory office assignment", () => {
    const uniqueId = Cypress._.random(0, 9999);
    const techUser = {
      firstName: "Tech",
      lastName: "Master",
      email: `tech.${uniqueId}@city.gov`,
      username: `tech.${uniqueId}`,
      password: "Password123!",
      role: "technical_staff",
      office: "Water Infrastructure Office", // Ensure this office exists in seeds
    };

    AdminCreateMunicipalityUserPage.openCreateUser();
    AdminCreateMunicipalityUserPage.fillForm(techUser);
    AdminCreateMunicipalityUserPage.submit();

    // Verify user and office assignment in table
    cy.get('[data-cy="search-users"]').type(techUser.username);
    cy.contains(techUser.username).should("exist");
    cy.contains(techUser.office).should("exist");
  });

  /**
   * @description Validates the flexibility requirement: A user can hold multiple technical roles
   * (work for multiple offices) simultaneously.
   */
  it("should allow adding a second technical office to an existing staff member (Multi-role)", () => {
    // 1. Create a base user
    const uniqueId = Cypress._.random(10000, 99999);
    const multiRoleUser = {
      firstName: "Multi",
      lastName: "Role",
      email: `multi.${uniqueId}@city.gov`,
      username: `multi.${uniqueId}`,
      password: "Password123!",
      role: "technical_staff",
      office: "Water Infrastructure Office",
    };

    AdminCreateMunicipalityUserPage.openCreateUser();
    AdminCreateMunicipalityUserPage.fillForm(multiRoleUser);
    AdminCreateMunicipalityUserPage.submit();

    // 2. Open Edit Modal
    AdminCreateMunicipalityUserPage.searchAndOpenEdit(multiRoleUser.username);

    // 3. Add a second role/office (e.g., Roads)
    const secondOffice = "Roads Maintenance Office"; // Ensure this office exists
    AdminCreateMunicipalityUserPage.addRoleInEdit(
      "technical_staff",
      secondOffice
    );

    // 4. Save
    AdminCreateMunicipalityUserPage.saveEdit();

    // 5. Verify both offices appear in the table row
    cy.get('[data-cy="search-users"]').clear().type(multiRoleUser.username);
    cy.contains("tr", multiRoleUser.username).within(() => {
      cy.contains(multiRoleUser.office).should("exist");
      cy.contains(secondOffice).should("exist");
    });
  });

  /**
   * @description Verifies validation logic in the Edit modal preventing
   * assignment of technical roles without an office.
   */
  it("should prevent adding a technical role without selecting an office in edit mode", () => {
    cy.get("tbody tr").first().find('[data-cy="edit-user-button"]').click();

    // Try to add technical role but skip office selection
    AdminCreateMunicipalityUserPage.elements.newRoleTrigger().click();
    cy.contains('[role="option"]', "technical_staff").click();

    // Click add without selecting office
    AdminCreateMunicipalityUserPage.elements.addRoleBtn().click();

    // Verify error message
    cy.contains("Please select a Technical Office").should("be.visible");
  });
});
