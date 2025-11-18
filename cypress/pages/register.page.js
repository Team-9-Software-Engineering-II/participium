class RegisterPage {
  elements = {
    email: () => cy.get('#email'),
    username: () => cy.get('#username'),
    firstName: () => cy.get('#firstName'),
    lastName: () => cy.get('#lastName'),
    password: () => cy.get('#password'),
    confirmPassword: () => cy.get('#confirmPassword'),
    submitButton: () => cy.get('[data-cy="submit-button"]'),
    errorMessage: () => cy.get('[data-cy="error-message"]'),
  }

  visit() {
    cy.visit('/register');
  }

  fillForm(data) {
    if(data.email) this.elements.email().type(data.email);
    if(data.username) this.elements.username().type(data.username);
    if(data.firstName) this.elements.firstName().type(data.firstName);
    if(data.lastName) this.elements.lastName().type(data.lastName);
    if(data.password) this.elements.password().type(data.password);
    if(data.confirmPassword) this.elements.confirmPassword().type(data.confirmPassword);
  }

  submit() {
    this.elements.submitButton().click();
  }
}

export default new RegisterPage();
