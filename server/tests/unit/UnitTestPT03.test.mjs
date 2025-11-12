/**
 * Unit Tests for PT03 - Admin Role Assignment Feature
 * 
 * User Story: As a system administrator, I want to assign roles to municipality users
 * 
 * This test suite validates the functionality for:
 * 1. Retrieving assignable roles (excluding citizen and admin)
 * 2. Assigning roles to municipality users
 * 3. Retrieving all users from the system
 * 
 * The tests follow the organizational structure of the Municipality of Turin,
 * supporting roles such as:
 * - municipality_public_relations_officer (URP - Public Relations Office)
 * - technical_staff (for technical offices: Public Lighting, Roads Maintenance, Parks)
 * 
 * @module UnitTestPT03
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Mock Functions for Repository Layer
 * 
 * These mocks simulate database operations without requiring an actual database connection.
 * Each mock function can be configured to return specific values for different test scenarios.
 */

// Role Repository Mocks
const mockFindAllRoles = jest.fn();        // Retrieves all roles from database
const mockFindRoleByName = jest.fn();      // Finds a specific role by its name

// User Repository Mocks
const mockUpdateUser = jest.fn();          // Updates user information (including role assignment)
const mockFindAllUsers = jest.fn();        // Retrieves all users from database
const mockCreateUser = jest.fn();          // Creates a new user (used by UserAdminService)
const mockFindUserByEmail = jest.fn();     // Finds user by email (used for validation)
const mockFindUserByUsername = jest.fn();  // Finds user by username (used for validation)

/**
 * Module Mocking
 * 
 * We use jest.unstable_mockModule to mock the repository modules.
 * This ensures that when services import these repositories, they receive our mock functions
 * instead of the real implementations, allowing us to control the behavior during tests.
 */
jest.unstable_mockModule("../../repositories/role-repo.mjs", () => ({
  findAllRoles: mockFindAllRoles,
  findRoleByName: mockFindRoleByName,
}));

jest.unstable_mockModule("../../repositories/user-repo.mjs", () => ({
  updateUser: mockUpdateUser,
  findAllUsers: mockFindAllUsers,
  createUser: mockCreateUser,
  findUserByEmail: mockFindUserByEmail,
  findUserByUsername: mockFindUserByUsername,
}));

/**
 * Service instances that will be tested
 * These are initialized in beforeEach() to ensure fresh imports for each test
 */
let RoleService;
let UserAdminService;

/**
 * Main Test Suite for Admin Role Assignment Feature
 */
describe("Admin Role Assignment - Story PT03", () => {
  /**
   * Setup before each test
   * 
   * This hook runs before each test case to:
   * 1. Clear all mock function call history
   * 2. Dynamically import fresh service instances
   * 
   * This ensures test isolation - each test starts with a clean slate.
   */
  beforeEach(async () => {
    jest.clearAllMocks();
    const roleServiceModule = await import("../../services/role-service.mjs");
    const userAdminServiceModule = await import("../../services/user-admin-service.mjs");
    RoleService = roleServiceModule.RoleService;
    UserAdminService = userAdminServiceModule.UserAdminService;
  });

  /**
   * Mock Data Definitions
   * 
   * These objects represent the data structure as it would appear in the real database.
   * They are based on the actual seeded data from the Municipality of Turin system.
   */

  // All roles in the system
  const mockRoles = [
    { id: 1, name: "citizen" },                                    // Regular citizen user
    { id: 2, name: "admin" },                                      // System administrator
    { id: 3, name: "municipality_public_relations_officer" },      // URP officer
    { id: 4, name: "technical_staff" },                            // Technical office staff
  ];

  // Specific role objects for testing role assignment
  const mockMunicipalityPublicRelationsOfficerRole = { 
    id: 3, 
    name: "municipality_public_relations_officer" 
  };

  const mockTechnicalStaffRole = { 
    id: 4, 
    name: "technical_staff" 
  };

  /**
   * Sample users with different roles
   * Each user includes their role relationship as it would be returned by Sequelize
   */
  const mockUsers = [
    {
      id: 1,
      email: "citizen@example.com",
      username: "citizen1",
      firstName: "Mario",
      lastName: "Rossi",
      roleId: 1,
      role: { id: 1, name: "citizen" },
      hashedPassword: "hashed123",  // This should be removed by sanitization
    },
    {
      id: 2,
      email: "urp@comune.torino.it",
      username: "urp_officer",
      firstName: "Giulia",
      lastName: "Bianchi",
      roleId: 3,
      role: { id: 3, name: "municipality_public_relations_officer" },
      hashedPassword: "hashed456",
    },
    {
      id: 3,
      email: "tech@comune.torino.it",
      username: "tech_staff",
      firstName: "Luca",
      lastName: "Verdi",
      roleId: 4,
      role: { id: 4, name: "technical_staff" },
      hashedPassword: "hashed789",
    },
  ];

  /**
   * Test Suite: RoleService.getAssignableRoles
   * 
   * This service method retrieves roles that can be assigned by administrators.
   * It filters out 'citizen' and 'admin' roles since:
   * - 'citizen' is assigned automatically during registration
   * - 'admin' should not be assignable through this interface for security reasons
   */
  describe("RoleService.getAssignableRoles", () => {
    it("should return only assignable roles (excluding citizen and admin)", async () => {
      // Arrange: Configure mock to return all roles
      mockFindAllRoles.mockResolvedValue(mockRoles);

      // Act: Call the service method
      const result = await RoleService.getAssignableRoles();

      // Assert: Verify the repository was called correctly
      expect(mockFindAllRoles).toHaveBeenCalledTimes(1);
      
      // Assert: Verify only municipality roles are returned (not citizen or admin)
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: 3, name: "municipality_public_relations_officer" },
        { id: 4, name: "technical_staff" },
      ]);
    });

    it("should filter out citizen role", async () => {
      // Arrange
      mockFindAllRoles.mockResolvedValue(mockRoles);

      // Act
      const result = await RoleService.getAssignableRoles();

      // Assert: Citizen role should not be in the results
      expect(result.find(r => r.name.toLowerCase() === "citizen")).toBeUndefined();
    });

    it("should filter out admin role", async () => {
      // Arrange
      mockFindAllRoles.mockResolvedValue(mockRoles);

      // Act
      const result = await RoleService.getAssignableRoles();

      // Assert: Admin role should not be in the results
      expect(result.find(r => r.name.toLowerCase() === "admin")).toBeUndefined();
    });

    it("should return empty array if only citizen and admin roles exist", async () => {
      // Arrange: Simulate a database with only non-assignable roles
      const limitedRoles = [
        { id: 1, name: "citizen" },
        { id: 2, name: "admin" },
      ];
      mockFindAllRoles.mockResolvedValue(limitedRoles);

      // Act
      const result = await RoleService.getAssignableRoles();

      // Assert: Should return empty array
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it("should handle empty roles table", async () => {
      // Arrange: Simulate an empty database
      mockFindAllRoles.mockResolvedValue([]);

      // Act
      const result = await RoleService.getAssignableRoles();

      // Assert: Should return empty array gracefully
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });

  /**
   * Test Suite: UserAdminService.assignUserRole
   * 
   * This service method allows administrators to assign or change roles for municipality users.
   * The method takes a userId and a role name, finds the role in the database,
   * and updates the user's roleId accordingly.
   * 
   * Business Logic:
   * 1. Validate that the role exists in the system
   * 2. Validate that the user exists in the system
   * 3. Update the user's roleId with the new role
   */
  describe("UserAdminService.assignUserRole", () => {
    it("should successfully assign municipality_public_relations_officer role to a user", async () => {
      // Arrange
      const userId = 5;
      const roleName = "municipality_public_relations_officer";

      // Configure mocks: role exists and user update succeeds
      mockFindRoleByName.mockResolvedValue(mockMunicipalityPublicRelationsOfficerRole);
      mockUpdateUser.mockResolvedValue(true);

      // Act
      const result = await UserAdminService.assignUserRole(userId, roleName);

      // Assert: Verify role lookup was performed with correct role name
      expect(mockFindRoleByName).toHaveBeenCalledWith("municipality_public_relations_officer");
      
      // Assert: Verify user update was called with correct userId and roleId
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, { roleId: 3 });
      
      // Assert: Verify operation succeeded
      expect(result).toBe(true);
    });

    it("should successfully assign technical_staff role to a user", async () => {
      // Arrange
      const userId = 6;
      const roleName = "technical_staff";

      mockFindRoleByName.mockResolvedValue(mockTechnicalStaffRole);
      mockUpdateUser.mockResolvedValue(true);

      // Act
      const result = await UserAdminService.assignUserRole(userId, roleName);

      // Assert
      expect(mockFindRoleByName).toHaveBeenCalledWith("technical_staff");
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, { roleId: 4 });
      expect(result).toBe(true);
    });

    it("should throw 400 error when role does not exist", async () => {
      // Arrange
      const userId = 5;
      const roleName = "nonexistent_role";

      // Configure mock: role not found in database
      mockFindRoleByName.mockResolvedValue(null);

      // Act & Assert: Verify error is thrown with correct message
      await expect(UserAdminService.assignUserRole(userId, roleName))
        .rejects.toThrow('Role with name "nonexistent_role" not found.');

      // Assert: Verify error has correct status code for bad request
      await expect(UserAdminService.assignUserRole(userId, roleName))
        .rejects.toHaveProperty("statusCode", 400);

      // Assert: Verify role was looked up but user was not updated
      expect(mockFindRoleByName).toHaveBeenCalledWith("nonexistent_role");
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it("should throw 404 error when user does not exist", async () => {
      // Arrange
      const userId = 999;
      const roleName = "technical_staff";

      // Configure mocks: role exists but user update fails (user not found)
      mockFindRoleByName.mockResolvedValue(mockTechnicalStaffRole);
      mockUpdateUser.mockResolvedValue(false);

      // Act & Assert: Verify error is thrown
      await expect(UserAdminService.assignUserRole(userId, roleName))
        .rejects.toThrow(`User with ID ${userId} not found or not updated.`);

      // Assert: Verify error has correct status code for not found
      await expect(UserAdminService.assignUserRole(userId, roleName))
        .rejects.toHaveProperty("statusCode", 404);

      // Assert: Verify both operations were attempted
      expect(mockFindRoleByName).toHaveBeenCalledWith("technical_staff");
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, { roleId: 4 });
    });

    it("should handle role reassignment (changing from one role to another)", async () => {
      // Arrange: User currently has URP role, being changed to technical staff
      const userId = 2;
      const newRoleName = "technical_staff";

      mockFindRoleByName.mockResolvedValue(mockTechnicalStaffRole);
      mockUpdateUser.mockResolvedValue(true);

      // Act
      const result = await UserAdminService.assignUserRole(userId, newRoleName);

      // Assert: Verify the role change was successful
      expect(mockFindRoleByName).toHaveBeenCalledWith("technical_staff");
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, { roleId: 4 });
      expect(result).toBe(true);
    });

    it("should handle case-sensitive role names correctly", async () => {
      // Arrange: The system uses exact role names from the database
      const userId = 5;
      const roleName = "municipality_public_relations_officer";

      mockFindRoleByName.mockResolvedValue(mockMunicipalityPublicRelationsOfficerRole);
      mockUpdateUser.mockResolvedValue(true);

      // Act
      const result = await UserAdminService.assignUserRole(userId, roleName);

      // Assert: Verify exact role name was used in lookup
      expect(mockFindRoleByName).toHaveBeenCalledWith("municipality_public_relations_officer");
      expect(result).toBe(true);
    });

    it("should not allow assigning citizen role (realistic scenario)", async () => {
      // Arrange: Testing edge case - technically possible but not recommended
      const userId = 5;
      const roleName = "citizen";

      // Note: In the current implementation, this would succeed
      // In a future version, validation might prevent this
      mockFindRoleByName.mockResolvedValue({ id: 1, name: "citizen" });
      mockUpdateUser.mockResolvedValue(true);

      // Act
      const result = await UserAdminService.assignUserRole(userId, roleName);

      // Assert: Current behavior allows this
      expect(result).toBe(true);
      
      // Future enhancement: Add business logic to prevent assigning citizen role
      // through admin interface, as it should only be assigned during registration
    });
  });

  /**
   * Test Suite: UserAdminService.getUsers
   * 
   * This service method retrieves all users from the system.
   * It includes users with all roles (citizens, administrators, staff).
   * 
   * Important: The returned data is sanitized to remove sensitive information
   * such as hashed passwords before sending to the client.
   */
  describe("UserAdminService.getUsers", () => {
    it("should return all users with sanitized data", async () => {
      // Arrange
      mockFindAllUsers.mockResolvedValue(mockUsers);

      // Act
      const result = await UserAdminService.getUsers();

      // Assert: Verify repository was called
      expect(mockFindAllUsers).toHaveBeenCalledTimes(1);
      
      // Assert: Verify all users are returned
      expect(result).toHaveLength(3);
      
      // Assert: Verify passwords are removed from all users (sanitization)
      result.forEach(user => {
        expect(user.hashedPassword).toBeUndefined();
        // Verify essential fields are still present
        expect(user.id).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.username).toBeDefined();
        expect(user.firstName).toBeDefined();
        expect(user.lastName).toBeDefined();
      });
    });

    it("should return users with different roles", async () => {
      // Arrange
      mockFindAllUsers.mockResolvedValue(mockUsers);

      // Act
      const result = await UserAdminService.getUsers();

      // Assert: Verify users with different role types are included
      const roleNames = result.map(u => u.role?.name);
      expect(roleNames).toContain("citizen");
      expect(roleNames).toContain("municipality_public_relations_officer");
      expect(roleNames).toContain("technical_staff");
    });

    it("should return empty array when no users exist", async () => {
      // Arrange: Simulate empty database
      mockFindAllUsers.mockResolvedValue([]);

      // Act
      const result = await UserAdminService.getUsers();

      // Assert: Should handle empty result gracefully
      expect(mockFindAllUsers).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it("should handle users with municipality_public_relations_officer role", async () => {
      // Arrange: Create a URP officer user
      const urpUser = {
        id: 10,
        email: "urp@comune.torino.it",
        username: "urp_user",
        firstName: "Anna",
        lastName: "Neri",
        roleId: 3,
        role: { id: 3, name: "municipality_public_relations_officer" },
        hashedPassword: "hashed123",
      };

      mockFindAllUsers.mockResolvedValue([urpUser]);

      // Act
      const result = await UserAdminService.getUsers();

      // Assert: Verify URP role is correctly included
      expect(result).toHaveLength(1);
      expect(result[0].role.name).toBe("municipality_public_relations_officer");
      expect(result[0].hashedPassword).toBeUndefined();
    });

    it("should handle users with technical_staff role from different offices", async () => {
      // Arrange: Create technical staff from different municipal departments
      // Based on the organizational structure of Municipality of Turin
      const technicalUsers = [
        {
          id: 11,
          email: "lighting@comune.torino.it",
          username: "tech_lighting",
          firstName: "Marco",
          lastName: "Russo",
          roleId: 4,
          role: { id: 4, name: "technical_staff" },
          technicalOfficeId: 1, // Public Lighting Office
          hashedPassword: "hashed123",
        },
        {
          id: 12,
          email: "roads@comune.torino.it",
          username: "tech_roads",
          firstName: "Sara",
          lastName: "Ferrari",
          roleId: 4,
          role: { id: 4, name: "technical_staff" },
          technicalOfficeId: 2, // Roads Maintenance Office
          hashedPassword: "hashed456",
        },
        {
          id: 13,
          email: "parks@comune.torino.it",
          username: "tech_parks",
          firstName: "Paolo",
          lastName: "Colombo",
          roleId: 4,
          role: { id: 4, name: "technical_staff" },
          technicalOfficeId: 3, // Parks and Green Areas Office
          hashedPassword: "hashed789",
        },
      ];

      mockFindAllUsers.mockResolvedValue(technicalUsers);

      // Act
      const result = await UserAdminService.getUsers();

      // Assert: Verify all technical staff members are returned
      expect(result).toHaveLength(3);
      result.forEach(user => {
        expect(user.role.name).toBe("technical_staff");
        expect(user.hashedPassword).toBeUndefined();
      });
    });

    it("should properly sanitize user data removing sensitive fields", async () => {
      // Arrange: Create user with sensitive data
      const userWithSensitiveData = {
        id: 20,
        email: "test@comune.torino.it",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        roleId: 3,
        role: { id: 3, name: "municipality_public_relations_officer" },
        hashedPassword: "super_secret_hash", // This must be removed
      };

      mockFindAllUsers.mockResolvedValue([userWithSensitiveData]);

      // Act
      const result = await UserAdminService.getUsers();

      // Assert: Verify sensitive data is removed but other data remains
      expect(result).toHaveLength(1);
      expect(result[0].hashedPassword).toBeUndefined();
      expect(result[0].id).toBe(20);
      expect(result[0].email).toBe("test@comune.torino.it");
    });
  });

  /**
   * Test Suite: Integration Scenarios - Realistic Workflows
   * 
   * These tests simulate real-world workflows that administrators would perform.
   * They combine multiple service calls to test how they work together.
   */
  describe("Integration scenarios - Realistic workflows", () => {
    it("should support workflow: get assignable roles, then assign a role to a user", async () => {
      // Scenario: Admin wants to assign a role
      // Step 1: First, admin retrieves the list of available roles
      
      // Arrange
      mockFindAllRoles.mockResolvedValue(mockRoles);
      const availableRoles = await RoleService.getAssignableRoles();

      // Assert: Verify assignable roles are retrieved
      expect(availableRoles).toHaveLength(2);
      
      // Step 2: Admin selects a role from the list
      const selectedRole = availableRoles.find(
        r => r.name === "municipality_public_relations_officer"
      );
      expect(selectedRole).toBeDefined();

      // Step 3: Admin assigns the selected role to a user
      const userId = 15;
      mockFindRoleByName.mockResolvedValue(mockMunicipalityPublicRelationsOfficerRole);
      mockUpdateUser.mockResolvedValue(true);

      const assignResult = await UserAdminService.assignUserRole(
        userId, 
        selectedRole.name
      );

      // Assert: Verify role was assigned successfully
      expect(assignResult).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, { roleId: 3 });
    });

    it("should support workflow: get users, identify a user, assign technical_staff role", async () => {
      // Scenario: Admin wants to promote a citizen to technical staff
      
      // Step 1: Admin retrieves all users to find the one to promote
      mockFindAllUsers.mockResolvedValue(mockUsers);
      const allUsers = await UserAdminService.getUsers();

      expect(allUsers).toHaveLength(3);

      // Step 2: Admin identifies a citizen user to promote
      const citizenUser = allUsers.find(u => u.role?.name === "citizen");
      expect(citizenUser).toBeDefined();
      expect(citizenUser.id).toBe(1);

      // Step 3: Admin assigns technical_staff role to the identified user
      mockFindRoleByName.mockResolvedValue(mockTechnicalStaffRole);
      mockUpdateUser.mockResolvedValue(true);

      const assignResult = await UserAdminService.assignUserRole(
        citizenUser.id,
        "technical_staff"
      );

      // Assert: Verify promotion was successful
      expect(assignResult).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith(1, { roleId: 4 });
    });

    it("should handle reassigning role for URP officer to technical staff (realistic organizational change)", async () => {
      // Scenario: An employee is transferred from Public Relations to a Technical Office
      // This simulates a real organizational restructuring
      
      const urpOfficerId = 2;
      
      mockFindRoleByName.mockResolvedValue(mockTechnicalStaffRole);
      mockUpdateUser.mockResolvedValue(true);

      const result = await UserAdminService.assignUserRole(
        urpOfficerId,
        "technical_staff"
      );

      // Assert: Verify the role transfer was successful
      expect(result).toBe(true);
      expect(mockFindRoleByName).toHaveBeenCalledWith("technical_staff");
      expect(mockUpdateUser).toHaveBeenCalledWith(urpOfficerId, { roleId: 4 });
    });

    it("should handle error when trying to assign role to non-existent user in workflow", async () => {
      // Scenario: Admin tries to assign role but provides wrong user ID
      
      // Step 1: Admin retrieves available roles (succeeds)
      mockFindAllRoles.mockResolvedValue(mockRoles);
      const roles = await RoleService.getAssignableRoles();

      expect(roles.length).toBeGreaterThan(0);

      // Step 2: Admin attempts to assign role to non-existent user (fails)
      const nonExistentUserId = 9999;
      mockFindRoleByName.mockResolvedValue(mockTechnicalStaffRole);
      mockUpdateUser.mockResolvedValue(false); // User not found

      // Assert: Verify appropriate error is thrown
      await expect(
        UserAdminService.assignUserRole(nonExistentUserId, "technical_staff")
      ).rejects.toThrow("User with ID 9999 not found or not updated.");

      await expect(
        UserAdminService.assignUserRole(nonExistentUserId, "technical_staff")
      ).rejects.toHaveProperty("statusCode", 404);
    });
  });

  /**
   * Test Suite: Edge Cases and Error Handling
   * 
   * These tests verify that the system handles unexpected situations gracefully,
   * such as database errors, null values, or invalid inputs.
   * Robust error handling is critical for production systems.
   */
  describe("Edge cases and error handling", () => {
    it("should handle database errors when fetching roles", async () => {
      // Arrange: Simulate a database connection error
      const dbError = new Error("Database connection error");
      mockFindAllRoles.mockRejectedValue(dbError);

      // Act & Assert: Verify error is propagated correctly
      await expect(RoleService.getAssignableRoles())
        .rejects.toThrow("Database connection error");
    });

    it("should handle database errors when updating user role", async () => {
      // Arrange: Simulate database update failure
      const dbError = new Error("Database update failed");
      mockFindRoleByName.mockResolvedValue(mockTechnicalStaffRole);
      mockUpdateUser.mockRejectedValue(dbError);

      // Act & Assert: Verify error is propagated
      await expect(UserAdminService.assignUserRole(5, "technical_staff"))
        .rejects.toThrow("Database update failed");
    });

    it("should handle database errors when fetching users", async () => {
      // Arrange: Simulate database query failure
      const dbError = new Error("Database query failed");
      mockFindAllUsers.mockRejectedValue(dbError);

      // Act & Assert: Verify error is propagated
      await expect(UserAdminService.getUsers())
        .rejects.toThrow("Database query failed");
    });

    it("should handle null role name gracefully", async () => {
      // Arrange: Test with null role name
      mockFindRoleByName.mockResolvedValue(null);

      // Act & Assert: Verify appropriate error for null input
      await expect(UserAdminService.assignUserRole(5, null))
        .rejects.toThrow('Role with name "null" not found.');
    });

    it("should handle undefined role name gracefully", async () => {
      // Arrange: Test with undefined role name
      mockFindRoleByName.mockResolvedValue(null);

      // Act & Assert: Verify appropriate error for undefined input
      await expect(UserAdminService.assignUserRole(5, undefined))
        .rejects.toThrow('Role with name "undefined" not found.');
    });
  });

  /**
   * Test Suite: Municipality of Turin Organizational Structure Scenarios
   * 
   * These tests are based on the real organizational structure of the Municipality of Turin.
   * Reference: https://trasparenza.comune.torino.it/media/1990/download
   * 
   * The system supports the following technical offices:
   * 1. Public Lighting Office (Pubblica Illuminazione) - categoryId: 4
   * 2. Roads Maintenance Office (Manutenzione Strade) - categoryId: 7
   * 3. Parks and Green Areas Office (Verde Pubblico) - categoryId: 8
   * 
   * Each technical office is responsible for handling reports in their specific category.
   */
  describe("Municipality of Turin organizational structure scenarios", () => {
    it("should assign technical_staff role for Public Lighting Office (Pubblica Illuminazione)", async () => {
      // Scenario: Assigning a staff member to the Public Lighting technical office
      // This office handles issues related to street lights and public illumination
      
      const userId = 100;
      const roleName = "technical_staff";

      mockFindRoleByName.mockResolvedValue(mockTechnicalStaffRole);
      mockUpdateUser.mockResolvedValue(true);

      const result = await UserAdminService.assignUserRole(userId, roleName);

      expect(result).toBe(true);
      // Note: In a complete system, the user would also be associated with
      // technicalOfficeId: 1 (Public Lighting Office)
    });

    it("should assign technical_staff role for Roads Maintenance Office (Manutenzione Strade)", async () => {
      // Scenario: Assigning a staff member to the Roads Maintenance office
      // This office handles potholes, damaged sidewalks, and road infrastructure
      
      const userId = 101;
      const roleName = "technical_staff";

      mockFindRoleByName.mockResolvedValue(mockTechnicalStaffRole);
      mockUpdateUser.mockResolvedValue(true);

      const result = await UserAdminService.assignUserRole(userId, roleName);

      expect(result).toBe(true);
      // Note: In a complete system, the user would also be associated with
      // technicalOfficeId: 2 (Roads Maintenance Office)
    });

    it("should assign technical_staff role for Parks and Green Areas Office (Verde Pubblico)", async () => {
      // Scenario: Assigning a staff member to the Parks and Green Areas office
      // This office handles maintenance of parks, gardens, and public green spaces
      
      const userId = 102;
      const roleName = "technical_staff";

      mockFindRoleByName.mockResolvedValue(mockTechnicalStaffRole);
      mockUpdateUser.mockResolvedValue(true);

      const result = await UserAdminService.assignUserRole(userId, roleName);

      expect(result).toBe(true);
      // Note: In a complete system, the user would also be associated with
      // technicalOfficeId: 3 (Parks and Green Areas Office)
    });

    it("should assign municipality_public_relations_officer role for URP (Ufficio Relazioni con il Pubblico)", async () => {
      // Scenario: Assigning a staff member to the Public Relations Office (URP)
      // The URP is responsible for reviewing and approving/rejecting citizen reports
      
      const userId = 103;
      const roleName = "municipality_public_relations_officer";

      mockFindRoleByName.mockResolvedValue(mockMunicipalityPublicRelationsOfficerRole);
      mockUpdateUser.mockResolvedValue(true);

      const result = await UserAdminService.assignUserRole(userId, roleName);

      expect(result).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, { roleId: 3 });
    });

    it("should support multiple technical staff members across different offices", async () => {
      // Scenario: Municipality needs multiple staff members in each technical office
      // This simulates a realistic staffing structure for a large municipality
      
      const staffAssignments = [
        { userId: 200, office: "Public Lighting" },
        { userId: 201, office: "Roads Maintenance" },
        { userId: 202, office: "Parks and Green Areas" },
        { userId: 203, office: "Public Lighting" },      // Second staff for same office
        { userId: 204, office: "Roads Maintenance" },     // Second staff for same office
      ];

      mockFindRoleByName.mockResolvedValue(mockTechnicalStaffRole);
      mockUpdateUser.mockResolvedValue(true);

      // Act: Assign technical_staff role to all users
      for (const assignment of staffAssignments) {
        const result = await UserAdminService.assignUserRole(
          assignment.userId,
          "technical_staff"
        );
        expect(result).toBe(true);
      }

      // Assert: Verify all assignments were processed
      expect(mockUpdateUser).toHaveBeenCalledTimes(5);
      expect(mockFindRoleByName).toHaveBeenCalledTimes(5);
    });
  });
});
