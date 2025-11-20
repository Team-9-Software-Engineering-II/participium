class LoginPage {
  elements = {
    username: () => cy.get("#username"),
    password: () => cy.get("#password"),
    submitButton: () => cy.get('[data-cy="submit-button"]'),
    errorMessage: () => cy.get('[data-cy="error-message"]'),
    togglePassword: () => cy.get('[data-cy="toggle-password"]'),
  };

  visit() {
    cy.visit("/login");
  }

  fillForm(data) {
    if (data.username) {
      this.elements.username().type(data.username);
    } else if (data.email) {
      this.elements.username().type(data.email);
    }
    if (data.password) this.elements.password().type(data.password);
  }

  submit() {
    this.elements.submitButton().click();
  }

  togglePasswordVisibility() {
    this.elements.togglePassword().click();
  }

  checkError(expectedText) {
    this.elements.errorMessage().should("contain.text", expectedText);
  }
}

export default new LoginPage();
