class RegisterPage {
  elements = {
    email: () => cy.get("#email"),
    username: () => cy.get("#username"),
    firstName: () => cy.get("#firstName"),
    lastName: () => cy.get("#lastName"),
    password: () => cy.get("#password"),
    confirmPassword: () => cy.get("#confirmPassword"),
    submitButton: () => cy.get('[data-cy="submit-button"]'),
    errorMessage: () => cy.get('[data-cy="error-message"]'),
    verificationCodeInput: () => cy.get('[data-cy="verification-code-input"]'),
    verifyButton: () => cy.get('[data-cy="verify-button"]'),
    verificationErrorMessage: () =>
      cy.get('[data-cy="verification-error-message"]'),
    resendButton: () => cy.get('[data-cy="resend-code-button"]'),
  };

  /**
   * Visits the registration page
   */
  visit() {
    cy.visit("/register");
  }

  enterVerificationCode(code) {
    this.elements.verificationCodeInput().type(code, { force: true });
  }

  verify() {
    this.elements.verifyButton().click();
  }

  /**
   * Fills the registration form with provided data
   * Only fills fields that are present in the data object
   * @param {Object} data - Object containing form data
   * @param {string} [data.email] - Email address
   * @param {string} [data.username] - Username
   * @param {string} [data.firstName] - First name
   * @param {string} [data.lastName] - Last name
   * @param {string} [data.password] - Password
   * @param {string} [data.confirmPassword] - Password confirmation
   */
  fillForm(data) {
    if (data.email) this.elements.email().type(data.email);
    if (data.username) this.elements.username().type(data.username);
    if (data.firstName) this.elements.firstName().type(data.firstName);
    if (data.lastName) this.elements.lastName().type(data.lastName);
    if (data.password) this.elements.password().type(data.password);
    if (data.confirmPassword)
      this.elements.confirmPassword().type(data.confirmPassword);
  }

  /**
   * Clicks the submit button to register the user
   */
  submit() {
    this.elements.submitButton().click();
  }
}

export default new RegisterPage();
