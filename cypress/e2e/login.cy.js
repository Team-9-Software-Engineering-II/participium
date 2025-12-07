import LoginPage from "../pages/login.page";

describe("Login Flow", () => {
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

  const defaultUser = users[0];

  it("should allow successful login with valid username and password", () => {
    LoginPage.visit();
    LoginPage.fillForm({
      username: defaultUser.username,
      password: defaultUser.password,
    });
    LoginPage.submit();

    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("should allow successful login with valid email and password", () => {
    LoginPage.visit();
    LoginPage.fillForm({
      username: defaultUser.email,
      password: defaultUser.password,
    });
    LoginPage.submit();

    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("should show error for invalid credentials", () => {
    LoginPage.visit();
    LoginPage.fillForm({ username: "test", password: "wrongpassword" });
    LoginPage.submit();

    LoginPage.checkError(
      "Invalid credentials. Please check your username and password."
    );
  });

  it("should show error if all fields are empty", () => {
    LoginPage.visit();
    LoginPage.submit();
    cy.url().should("eq", Cypress.config().baseUrl + "/login");
  });

  it("should show error if username field is empty", () => {
    LoginPage.visit();
    LoginPage.fillForm({ password: defaultUser.password });
    LoginPage.submit();
    // Checks that the page is still "/login"
    cy.url().should("eq", Cypress.config().baseUrl + "/login");
  });

  it("should show error if password field is empty", () => {
    LoginPage.visit();
    LoginPage.fillForm({ username: defaultUser.username });
    LoginPage.submit();
    // Checks that the page is still "/login"
    cy.url().should("eq", Cypress.config().baseUrl + "/login");
  });

  it("should navigate to the registration page when clicking 'Sign up'", () => {
    cy.visit("/login");

    // Clicks on "Sign up" button
    cy.contains("Sign up").click();

    // Checks that URL is correct
    cy.url().should("eq", Cypress.config().baseUrl + "/register");
  });

  it("should navigate to the home page when clicking 'Back to Participium'", () => {
    cy.visit("/login");

    // Clicks on "Back to Participium" button
    cy.contains("Back to Participium").click();

    // Checks that URL belongs to the home page
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

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
