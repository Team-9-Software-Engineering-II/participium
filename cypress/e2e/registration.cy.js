import RegisterPage from "../pages/register.page";
import { requiredFieldsRegistration } from "../support/constants";

/**
 * @description Test suite for verifying the user registration process,
 * including success case and various failure/validation checks.
 * @type {Cypress.Spec}
 */
describe("Registration Flow", () => {
  const uniqueId = Date.now();
  const userEmail = `fullflow${uniqueId}@example.com`;
  const correctCode = "654321";

  const goToVerificationStep = () => {
    RegisterPage.visit();

    RegisterPage.fillForm({
      email: userEmail,
      username: `user${uniqueId}`,
      firstName: "Mario",
      lastName: "Rossi",
      password: "Password123",
      confirmPassword: "Password123",
    });

    RegisterPage.submit();

    cy.url().should("eq", Cypress.config().baseUrl + "/register");
    RegisterPage.elements.verificationCodeInput().should("be.visible");
  };
  /**
   * @description Test case for a successful user registration.
   * It uses unique credentials to avoid conflicts and verifies the final state (status code and URL).
   */
  it("should allow successful registration", () => {
    goToVerificationStep();

    RegisterPage.enterVerificationCode(correctCode);
    RegisterPage.verify();
  });

  /**
   * @description Test case for failed verification with an incorrect code.
   */
  it("should display error on invalid verification code", () => {
    goToVerificationStep();

    RegisterPage.enterVerificationCode("999999");
    RegisterPage.verify();

    RegisterPage.elements.verificationCodeInput().should("have.value", "");
  });

  /**
   * @description Test case for resending the verification code.
   */
  it("should allow resending the verification code", () => {
    goToVerificationStep();

    RegisterPage.elements.resendButton().click();

    cy.get(".bg-green-500\\/10").should(
      "contain.text",
      "Verification code resent successfully"
    );
  });

  /**
   * @description Test case to verify that registration fails when the 'password'
   * and 'confirm password' fields do not match.
   */
  it("should fail if passwords do not match", () => {
    RegisterPage.visit();
    RegisterPage.fillForm({
      email: "test2@example.com",
      username: "user2",
      firstName: "Luigi",
      lastName: "Verdi",
      password: "Password123",
      confirmPassword: "Wrong123",
    });
    RegisterPage.submit();
    RegisterPage.elements
      .errorMessage()
      .should("contain.text", "Passwords do not match");
  });

  /**
   * @description Test case to verify that registration fails if the entered password
   * does not meet the minimum length requirement.
   */
  it("should fail if passwords is too short", () => {
    RegisterPage.visit();
    RegisterPage.fillForm({
      email: "test2@example.com",
      username: "user2",
      firstName: "Luigi",
      lastName: "Verdi",
      password: "Pwd1",
      confirmPassword: "Pwd1",
    });
    RegisterPage.submit();
    RegisterPage.elements
      .errorMessage()
      .should("contain.text", "Password must be at least 6 characters");
  });

  /**
   * @description Iterates through the list of required registration fields to ensure
   * registration fails when any one of them is missing.
   * @param {string} field - The required field being tested for omission.
   */
  for (const field of requiredFieldsRegistration) {
    it(`should fail if ${field} is missing`, () => {
      const formData = {
        email: "test2@example.com",
        username: "user2",
        firstName: "Luigi",
        lastName: "Verdi",
        password: "Password123",
        confirmPassword: "Password123",
      };
      formData[field] = "";

      RegisterPage.visit();
      RegisterPage.fillForm(formData);
      RegisterPage.submit();

      // Checks that the page is still "/register"
      cy.url().should("eq", Cypress.config().baseUrl + "/register");
    });
  }

  /**
   * @description Test case to verify that registration fails with a conflict status
   * code (409) and an appropriate message if the email is already in use.
   */
  it("should fail if email is already in use", () => {
    RegisterPage.visit();

    RegisterPage.fillForm({
      email: "test@email.com",
      username: "newuser",
      firstName: "Luigi",
      lastName: "Verdi",
      password: "Password123",
      confirmPassword: "Password123",
    });

    cy.intercept("POST", "/auth/register").as("registerUser");
    RegisterPage.submit();

    // Cheks that response status is 409 Conflict
    cy.wait("@registerUser").its("response.statusCode").should("eq", 409);

    // Checks error messages from UI
    RegisterPage.elements
      .errorMessage()
      .should("contain.text", "Email is already registered.");
  });

  /**
   * @description Test case to ensure the login page is accessible from the application.
   */
  it("should allow access to the login page", () => {
    cy.visit("/login");
    cy.url().should("eq", Cypress.config().baseUrl + "/login");
  });

  /**
   * @description Test case to ensure the home page is accessible from the application.
   */
  it("should allow access to the home page", () => {
    cy.visit("/");
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });
});
