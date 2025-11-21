class AdminCreateMunicipalityUserPage {
  elements = {
    openCreateUser: () => cy.get('[data-cy="open-create-user"]'),
    firstName: () => cy.get('[data-cy="first-name"]'),
    lastName: () => cy.get('[data-cy="last-name"]'),
    email: () => cy.get('[data-cy="email"]'),
    username: () => cy.get('[data-cy="username"]'),
    password: () => cy.get('[data-cy="password"]'),
    role: () => cy.get('[data-cy="role"]'),
    submit: () => cy.get('[data-cy="submit"]'),
    createRoleTrigger: () => cy.get('[data-cy="select-role"]'),
    editRoleTrigger: () => cy.get('[data-cy="select-edit-role"]'),
    errorMessage: () => cy.get('[data-cy="create-user-modal"]'),
    submitEdit: () => cy.get('[data-cy="submit-edit-role"]'),
    modalEdit: () => cy.get('[data-cy="edit-user-modal"]'),
    editRole: () => cy.get('[data-cy="edit-role"]'),
  };

  openCreateUser() {
    this.elements.openCreateUser().click();
  }

  fillForm({ firstName, lastName, email, username, password, role }) {
    if (firstName) this.elements.firstName().type(firstName);
    if (lastName) this.elements.lastName().type(lastName);
    if (email) this.elements.email().type(email);
    if (username) this.elements.username().type(username);
    if (password) this.elements.password().type(password);

    if (role) {
      this.elements.createRoleTrigger().click();

      cy.get('[data-cy="role"]').contains(role).should("be.visible").click();
    }
  }

  editUser (role) {
    this.elements.editRoleTrigger().should("be.visible").click();

    cy.get('[data-cy="edit-role"]').should("be.visible").contains(role).click();

  }

  submit() {
    this.elements.submit().click();
  }
}

export default new AdminCreateMunicipalityUserPage();
