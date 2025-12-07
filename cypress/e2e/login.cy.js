import LoginPage from "../pages/login.page";

/**
 * @description Test suite for verifying the Login functionality, covering successful
 * logins with different credentials (username/email), failed login attempts,
 * form validation, and navigation links.
 * @type {Cypress.Spec}
 */
describe("Login Flow", () => {
  /**
   * @description Array of test users with different roles for redirection checks.
   * @type {Array<Object>}
   * @property {string} username - The user's username.
   * @property {string} email - The user's email.
   * @property {string} password - The user's password.
   * @property {string} expectedUrl - The expected URL after successful login.
   */
  const users = [
    {
      username: "test",
      email: "test@email.com",
      password: "test",
      expectedUrl: "/",
    }, // regular user
    {
      username: "admin",
      email: "admin@participium.com",
      password: "password123",
      expectedUrl: "/admin",
    }, // admin
  ];

  /**
   * @description Reference to the first user in the array (regular user) for basic tests.
   * @type {Object}
   */
  const defaultUser = users[0];

  /**
   * @description Test case for a successful login using the **username**.
   */
  it("should allow successful login with valid username and password", () => {
    LoginPage.visit();
    LoginPage.fillForm({
      username: defaultUser.username,
      password: defaultUser.password,
    });
    LoginPage.submit();

    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  /**
   * @description Test case for a successful login using the **email address**.
   */
  it("should allow successful login with valid email and password", () => {
    LoginPage.visit();
    LoginPage.fillForm({
      username: defaultUser.email,
      password: defaultUser.password,
    });
    LoginPage.submit();

    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  /**
   * @description Test case to verify that an error message is displayed for invalid credentials.
   */
  it("should show error for invalid credentials", () => {
    LoginPage.visit();
    LoginPage.fillForm({ username: "test", password: "wrongpassword" });
    LoginPage.submit();

    LoginPage.checkError(
      "Invalid credentials. Please check your username and password."
    );
  });

  /**
   * @description Test case to check form validation when all fields are left empty.
   */
  it("should show error if all fields are empty", () => {
    LoginPage.visit();
    LoginPage.submit();
    cy.url().should("eq", Cypress.config().baseUrl + "/login");
  });

  /**
   * @description Test case to check form validation when the username field is empty.
   */
  it("should show error if username field is empty", () => {
    LoginPage.visit();
    LoginPage.fillForm({ password: defaultUser.password });
    LoginPage.submit();
    // Checks that the page is still "/login"
    cy.url().should("eq", Cypress.config().baseUrl + "/login");
  });

  /**
   * @description Test case to check form validation when the password field is empty.
   */
  it("should show error if password field is empty", () => {
    LoginPage.visit();
    LoginPage.fillForm({ username: defaultUser.username });
    LoginPage.submit();
    // Checks that the page is still "/login"
    cy.url().should("eq", Cypress.config().baseUrl + "/login");
  });

  /**
   * @description Test case to verify the navigation link to the registration page.
   */
  it("should navigate to the registration page when clicking 'Sign up'", () => {
    cy.visit("/login");

    // Clicks on "Sign up" button
    cy.contains("Sign up").click();

    // Checks that URL is correct
    cy.url().should("eq", Cypress.config().baseUrl + "/register");
  });

  /**
   * @description Test case to verify the navigation link back to the application's home page.
   */
  it("should navigate to the home page when clicking 'Back to Participium'", () => {
    cy.visit("/login");

    // Clicks on "Back to Participium" button
    cy.contains("Back to Participium").click();

    // Checks that URL belongs to the home page
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  /**
   * @description Test case to verify the functionality of the password visibility toggle (show/hide).
   */
  it("should toggle password visibility", () => {
    LoginPage.visit();
    LoginPage.fillForm({
      username: defaultUser.username,
      password: defaultUser.password,
    });

    LoginPage.elements.password().should("have.attr", "type", "password");

    // Clicks on toggle
    LoginPage.togglePasswordVisibility();
    LoginPage.elements.password().should("have.attr", "type", "text");

    // Clicks again on toggle
    LoginPage.togglePasswordVisibility();
    LoginPage.elements.password().should("have.attr", "type", "password");
  });

  /**
   * @description Test case to ensure that upon a failed login attempt, the password field
   * is cleared while the entered username/email remains in the field.
   */
  it("should clear password and keep username on failed login", () => {
    LoginPage.visit();
    LoginPage.fillForm({ username: defaultUser.username, password: "wrong" });
    LoginPage.submit();

    LoginPage.elements.password().should("have.value", "");
    LoginPage.elements.username().should("have.value", defaultUser.username);
  });

  for (const { username, password, expectedUrl } of users) {
    it(`should redirect ${username} to ${expectedUrl}`, () => {
      LoginPage.visit();
      LoginPage.fillForm({ username, password });
      LoginPage.submit();

      cy.url().should("eq", Cypress.config().baseUrl + expectedUrl);
    });
  }
});
