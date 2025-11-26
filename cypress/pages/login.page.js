class LoginPage {
  elements = {
    username: () => cy.get("#username"),
    password: () => cy.get("#password"),
    submitButton: () => cy.get('[data-cy="submit-button"]'),
    errorMessage: () => cy.get('[data-cy="error-message"]'),
    togglePassword: () => cy.get('[data-cy="toggle-password"]'),
  };

  /**
   * Visits the login page
   */
  visit() {
    cy.visit("/login");
  }

  /**
   * Fills the login form with provided credentials
   * Can use username or email for login
   * @param {Object} data - Object containing login credentials
   * @param {string} [data.username] - Username
   * @param {string} [data.email] - Email (used if username not provided)
   * @param {string} [data.password] - Password
   */
  fillForm(data) {
    if (data.username) {
      this.elements.username().type(data.username);
    } else if (data.email) {
      this.elements.username().type(data.email);
    }
    if (data.password) this.elements.password().type(data.password);
  }

  /**
   * Clicks the submit button to log in
   */
  submit() {
    this.elements.submitButton().click();
  }

  /**
   * Toggles the visibility of the password field
   */
  togglePasswordVisibility() {
    this.elements.togglePassword().click();
  }

  /**
   * Checks that the error message contains the expected text
   * @param {string} expectedText - Expected error text
   */
  checkError(expectedText) {
    this.elements.errorMessage().should("contain.text", expectedText);
  }
}

export default new LoginPage();
