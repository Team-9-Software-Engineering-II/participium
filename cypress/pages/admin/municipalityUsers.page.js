/**
 * @class AdminCreateMunicipalityUserPage
 * @description Page Object Model for managing Municipality Users (creation and role management).
 * Maps interactions with the React frontend using data-cy attributes.
 */
class AdminCreateMunicipalityUserPage {
  elements = {
    // --- Create User Modal Selectors ---
    openCreateUserBtn: () => cy.get('[data-cy="open-create-user"]'),
    firstNameInput: () => cy.get('[data-cy="first-name"]'),
    lastNameInput: () => cy.get('[data-cy="last-name"]'),
    emailInput: () => cy.get('[data-cy="email"]'),
    usernameInput: () => cy.get('[data-cy="username"]'),
    passwordInput: () => cy.get('[data-cy="password"]'),

    // Select Triggers (Shadcn UI)
    roleSelectTrigger: () => cy.get('[data-cy="select-role"]'),
    officeSelectTrigger: () => cy.get('[data-cy="select-office"]'),

    submitCreateBtn: () => cy.get('[data-cy="submit"]'),
    cancelCreateBtn: () => cy.get('[data-cy="cancel"]'),
    createUserModal: () => cy.get('[data-cy="create-user-modal"]'),

    // --- Table Actions ---
    searchInput: () => cy.get('[data-cy="search-users"]'),
    editUserBtn: () => cy.get('[data-cy="edit-user-button"]'),

    // --- Edit User Modal Selectors ---
    newRoleTrigger: () => cy.get('[data-cy="select-new-role"]'),
    newOfficeTrigger: () => cy.get('[data-cy="select-new-role-office"]'),
    addRoleBtn: () => cy.get('[data-cy="add-role-button"]'),
    saveRolesBtn: () => cy.get('[data-cy="save-roles"]'),
    cancelEditBtn: () => cy.get('[data-cy="cancel-edit"]'),

    // Feedback
    errorMessage: () => cy.get(".text-amber-800"),
  };

  /**
   * Opens the Create User modal.
   */
  openCreateUser() {
    this.elements.openCreateUserBtn().click();
  }

  /**
   * Fills the creation form. Handles conditional Technical Office selection.
   * @param {Object} data - User data.
   * @param {string} data.role - Exact text of the role to select.
   * @param {string} [data.office] - Exact text of the office (required if role is technical).
   */
  fillForm({ firstName, lastName, email, username, password, role, office }) {
    if (firstName) this.elements.firstNameInput().clear().type(firstName);
    if (lastName) this.elements.lastNameInput().clear().type(lastName);
    if (email) this.elements.emailInput().clear().type(email);
    if (username) this.elements.usernameInput().clear().type(username);
    if (password) this.elements.passwordInput().clear().type(password);

    if (role) {
      this.elements.roleSelectTrigger().click();
      // Select by text content within the dropdown portal
      cy.contains('[role="option"]', role).should("be.visible").click();

      // If office is provided (e.g., for technical staff), select it
      if (office) {
        this.elements.officeSelectTrigger().should("be.visible").click();
        cy.contains('[role="option"]', office).should("be.visible").click();
      }
    }
  }

  /**
   * Submits the creation form.
   */
  submit() {
    this.elements.submitCreateBtn().click();
  }

  /**
   * Searches for a user and opens their edit modal.
   * @param {string} searchTerm - Username or name to search.
   */
  searchAndOpenEdit(searchTerm) {
    this.elements.searchInput().clear().type(searchTerm);
    // Wait for table to filter, then find row and click edit
    cy.contains("tr", searchTerm).within(() => {
      this.elements.editUserBtn().click();
    });
  }

  /**
   * Adds a new role to an existing user in the Edit modal.
   * @param {string} roleName - Role to add.
   * @param {string} [officeName] - Technical office (if applicable).
   */
  addRoleInEdit(roleName, officeName = null) {
    this.elements.newRoleTrigger().click();
    cy.contains('[role="option"]', roleName).click();

    if (officeName) {
      this.elements.newOfficeTrigger().should("be.visible").click();
      cy.contains('[role="option"]', officeName).click();
    }

    this.elements.addRoleBtn().click();
  }

  /**
   * Saves changes in the Edit modal.
   */
  saveEdit() {
    this.elements.saveRolesBtn().click();
  }
}

export default new AdminCreateMunicipalityUserPage();
