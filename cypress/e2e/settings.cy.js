/**
 * @fileoverview E2E tests for the Settings page.
 * These tests interact with the real UI without mocking,
 * using only the data-cy attributes present in the components.
 */

describe("Settings Page E2E", () => {
  /**
   * Runs before each test:
   * - Logs in as a test user
   * - Visits the home page and then the settings page
   */
  beforeEach(() => {
    cy.loginAsUser("test", "test");
    cy.visit("/");
    cy.visit("/settings");
  });

  /**
   * @test Updates the Telegram username
   * - Clears the input and types a new username
   * - Submits the profile form
   * - Checks that the success toast is visible
   */
  it("Updates Telegram username", () => {
    const newTelegram = "@testuser";

    cy.get("[data-cy=telegram-username]")
      .clear()
      .type(newTelegram)
      .should("have.value", newTelegram);

    cy.get("[data-cy=profile-submit]").click();

    cy.contains("Profile updated successfully.").should("be.visible");
  });

  /**
   * @test Changes notification preferences
   * - Navigates to the Notifications tab
   * - Toggles the communication emails switch
   * - Submits the notifications form
   * - Checks that the success toast is visible
   */
  it("Changes notification preferences", () => {
    cy.contains("Notifications").click();

    cy.get("[data-cy=switch-communication-emails]").then(($switch) => {
      const checked = $switch[0].checked;
      cy.wrap($switch).click();
      cy.wrap($switch).should("not.be.checked", checked);
    });

    cy.get("[data-cy=notifications-submit]").click();

    cy.contains("Notification preferences updated successfully.").should(
      "be.visible"
    );
  });

  /**
   * @test Uploads a profile picture
   * - Clicks the upload button
   * - Attaches a file from cypress/fixtures
   * - Checks that the success toast appears
   */
  it("Uploads profile picture", () => {
    const fileName = "test-image.png";

    cy.get("[data-cy=photo-upload-button]").click({ force: true });
    cy.get("#photo-upload", { force: true }).attachFile(fileName);

    cy.contains("Profile picture updated successfully.").should("be.visible");
  });

  /**
   * @test Updates profile without Telegram username (reset to null)
   * - Clears the Telegram input
   * - Submits the profile form
   * - Checks that the success toast is visible
   */
  it("Updates profile with empty Telegram username", () => {
    cy.get("[data-cy=telegram-username]").clear().should("have.value", "");

    cy.get("[data-cy=profile-submit]").click();

    cy.contains("Profile updated successfully.").should("be.visible");
  });

  /**
   * @test Navigates between tabs
   * - Clicks Profile, Account, and Notifications tabs
   * - Verifies the relevant submit buttons are visible
   */
  it("Navigates between tabs", () => {
    cy.contains("Profile").click();
    cy.get("[data-cy=profile-submit]").should("be.visible");

    cy.contains("Account").click();
    cy.get("[data-cy=account-submit]").should("be.visible");

    cy.contains("Notifications").click();
    cy.get("[data-cy=notifications-submit]").should("be.visible");
  });

  /**
   * @test Submitting Account form shows informational toast
   * - Clicks the Account tab
   * - Submits the account form
   * - Verifies the informational toast appears
   */
  it("Account update shows informational toast", () => {
    cy.contains("Account").click();
    cy.get("[data-cy=account-submit]").click();
    cy.contains(
      "Personal details are managed by your organization and cannot be changed here."
    ).should("be.visible");
  });

  /**
   * @test Telegram input accepts text
   * - Clears the input
   * - Types new text
   * - Verifies the input value
   */
  it("Telegram input accepts text", () => {
    cy.get("[data-cy=telegram-username]")
      .clear()
      .type("@newUser")
      .should("have.value", "@newUser");
  });

  /**
   * @test Upload button is visible and clickable
   * - Checks visibility of the upload button
   * - Clicks the button
   * - Verifies the file input exists
   */
  it("Upload button is visible and clickable", () => {
    cy.get("[data-cy=photo-upload-button]").should("be.visible").click();
    cy.get("input[type=file]").should("exist");
  });
});
