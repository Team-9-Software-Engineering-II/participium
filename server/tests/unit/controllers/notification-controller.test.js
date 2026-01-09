import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// --- 1. MOCK DEPENDENCIES ---

const mockGetUserNotifications = jest.fn();

jest.unstable_mockModule("../../../services/notification-service.mjs", () => ({
  NotificationService: {
    getUserNotifications: mockGetUserNotifications,
  },
}));

// --- 2. SETUP CONTROLLER ---
let NotificationController;

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Notification Controller (Unit)", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(async () => {
    jest.clearAllMocks();
    NotificationController = await import(
      "../../../controllers/notification-controller.js"
    );

    mockReq = {
      user: { id: 1, username: "testuser" },
    };
    mockRes = createMockResponse();
    mockNext = jest.fn();
  });

  // --------------------------------------------------------------------------
  // TEST: getMyNotifications
  // --------------------------------------------------------------------------
  describe("getMyNotifications", () => {
    it("should return notifications with status 200 when notifications exist", async () => {
      // Setup: Mock notifications with report data
      const mockNotifications = [
        {
          id: 1,
          title: "Report risolto",
          message: 'La tua segnalazione "Broken wall" è stata risolta.',
          type: "REPORT_STATUS_CHANGE",
          isRead: false,
          userId: 1,
          reportId: 3,
          createdAt: "2026-01-06T12:15:11.000Z",
          updatedAt: "2026-01-06T12:15:11.000Z",
          report: {
            id: 3,
            title: "Broken wall",
            status: "Resolved",
          },
        },
        {
          id: 2,
          title: "Report in lavorazione",
          message: 'La tua segnalazione "Broken wall" è stata messa in lavorazione.',
          type: "REPORT_STATUS_CHANGE",
          isRead: false,
          userId: 1,
          reportId: 3,
          createdAt: "2026-01-06T12:15:23.000Z",
          updatedAt: "2026-01-06T12:15:23.000Z",
          report: {
            id: 3,
            title: "Broken wall",
            status: "In Progress",
          },
        },
      ];

      mockGetUserNotifications.mockResolvedValue(mockNotifications);

      // Execution
      await NotificationController.getMyNotifications(
        mockReq,
        mockRes,
        mockNext
      );

      // Verification
      expect(mockGetUserNotifications).toHaveBeenCalledWith(mockReq.user.id);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockNotifications);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return empty array with status 200 when user has no notifications", async () => {
      // Setup: Empty notifications list
      const mockNotifications = [];
      mockGetUserNotifications.mockResolvedValue(mockNotifications);

      // Execution
      await NotificationController.getMyNotifications(
        mockReq,
        mockRes,
        mockNext
      );

      // Verification
      expect(mockGetUserNotifications).toHaveBeenCalledWith(mockReq.user.id);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return notifications without report data when reportId is null", async () => {
      // Setup: Notification without associated report
      const mockNotifications = [
        {
          id: 1,
          title: "System notification",
          message: "Welcome to the platform!",
          type: "SYSTEM",
          isRead: false,
          userId: 1,
          reportId: null,
          createdAt: "2026-01-06T10:00:00.000Z",
          updatedAt: "2026-01-06T10:00:00.000Z",
          report: null,
        },
      ];

      mockGetUserNotifications.mockResolvedValue(mockNotifications);

      // Execution
      await NotificationController.getMyNotifications(
        mockReq,
        mockRes,
        mockNext
      );

      // Verification
      expect(mockGetUserNotifications).toHaveBeenCalledWith(mockReq.user.id);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockNotifications);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return notifications with different types", async () => {
      // Setup: Notifications with all possible types
      const mockNotifications = [
        {
          id: 1,
          title: "Report risolto",
          message: "Your report has been resolved.",
          type: "REPORT_STATUS_CHANGE",
          isRead: false,
          userId: 1,
          reportId: 3,
          createdAt: "2026-01-06T12:15:11.000Z",
          updatedAt: "2026-01-06T12:15:11.000Z",
          report: {
            id: 3,
            title: "Broken wall",
            status: "Resolved",
          },
        },
        {
          id: 2,
          title: "New message",
          message: "You have a new message on your report.",
          type: "NEW_MESSAGE",
          isRead: false,
          userId: 1,
          reportId: 3,
          createdAt: "2026-01-06T12:16:00.000Z",
          updatedAt: "2026-01-06T12:16:00.000Z",
          report: {
            id: 3,
            title: "Broken wall",
            status: "In Progress",
          },
        },
        {
          id: 3,
          title: "Report assigned",
          message: "A new report has been assigned to you.",
          type: "ASSIGNMENT",
          isRead: false,
          userId: 1,
          reportId: 5,
          createdAt: "2026-01-06T12:17:00.000Z",
          updatedAt: "2026-01-06T12:17:00.000Z",
          report: {
            id: 5,
            title: "New report",
            status: "Assigned",
          },
        },
        {
          id: 4,
          title: "System update",
          message: "System maintenance scheduled.",
          type: "SYSTEM",
          isRead: true,
          userId: 1,
          reportId: null,
          createdAt: "2026-01-06T12:18:00.000Z",
          updatedAt: "2026-01-06T12:18:00.000Z",
          report: null,
        },
      ];

      mockGetUserNotifications.mockResolvedValue(mockNotifications);

      // Execution
      await NotificationController.getMyNotifications(
        mockReq,
        mockRes,
        mockNext
      );

      // Verification
      expect(mockGetUserNotifications).toHaveBeenCalledWith(mockReq.user.id);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockNotifications);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return notifications with read and unread status", async () => {
      // Setup: Mix of read and unread notifications
      const mockNotifications = [
        {
          id: 1,
          title: "Report risolto",
          message: "Your report has been resolved.",
          type: "REPORT_STATUS_CHANGE",
          isRead: true,
          userId: 1,
          reportId: 3,
          createdAt: "2026-01-06T12:15:11.000Z",
          updatedAt: "2026-01-06T12:15:11.000Z",
          report: {
            id: 3,
            title: "Broken wall",
            status: "Resolved",
          },
        },
        {
          id: 2,
          title: "New message",
          message: "You have a new message.",
          type: "NEW_MESSAGE",
          isRead: false,
          userId: 1,
          reportId: 3,
          createdAt: "2026-01-06T12:16:00.000Z",
          updatedAt: "2026-01-06T12:16:00.000Z",
          report: {
            id: 3,
            title: "Broken wall",
            status: "In Progress",
          },
        },
      ];

      mockGetUserNotifications.mockResolvedValue(mockNotifications);

      // Execution
      await NotificationController.getMyNotifications(
        mockReq,
        mockRes,
        mockNext
      );

      // Verification
      expect(mockGetUserNotifications).toHaveBeenCalledWith(mockReq.user.id);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockNotifications);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle service errors and call next(error)", async () => {
      // Setup: Service throws an error
      const error = new Error("Database connection failed");
      error.statusCode = 500;
      mockGetUserNotifications.mockRejectedValue(error);

      // Execution
      await NotificationController.getMyNotifications(
        mockReq,
        mockRes,
        mockNext
      );

      // Verification
      expect(mockGetUserNotifications).toHaveBeenCalledWith(mockReq.user.id);
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should handle repository errors gracefully", async () => {
      // Setup: Repository throws a specific error
      const error = new Error("Failed to fetch notifications");
      error.statusCode = 500;
      mockGetUserNotifications.mockRejectedValue(error);

      // Execution
      await NotificationController.getMyNotifications(
        mockReq,
        mockRes,
        mockNext
      );

      // Verification
      expect(mockGetUserNotifications).toHaveBeenCalledWith(mockReq.user.id);
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should correctly extract userId from req.user", async () => {
      // Setup: Different user ID
      mockReq.user.id = 42;
      const mockNotifications = [
        {
          id: 1,
          title: "Test notification",
          message: "Test message",
          type: "SYSTEM",
          isRead: false,
          userId: 42,
          reportId: null,
          createdAt: "2026-01-06T12:00:00.000Z",
          updatedAt: "2026-01-06T12:00:00.000Z",
          report: null,
        },
      ];

      mockGetUserNotifications.mockResolvedValue(mockNotifications);

      // Execution
      await NotificationController.getMyNotifications(
        mockReq,
        mockRes,
        mockNext
      );

      // Verification
      expect(mockGetUserNotifications).toHaveBeenCalledWith(42);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockNotifications);
    });

    it("should return notifications ordered by date (newest first)", async () => {
      // Setup: Notifications in chronological order (newest first)
      const mockNotifications = [
        {
          id: 3,
          title: "Latest notification",
          message: "This is the latest.",
          type: "REPORT_STATUS_CHANGE",
          isRead: false,
          userId: 1,
          reportId: 3,
          createdAt: "2026-01-06T12:20:00.000Z",
          updatedAt: "2026-01-06T12:20:00.000Z",
          report: {
            id: 3,
            title: "Broken wall",
            status: "Resolved",
          },
        },
        {
          id: 2,
          title: "Middle notification",
          message: "This is in the middle.",
          type: "REPORT_STATUS_CHANGE",
          isRead: false,
          userId: 1,
          reportId: 3,
          createdAt: "2026-01-06T12:15:00.000Z",
          updatedAt: "2026-01-06T12:15:00.000Z",
          report: {
            id: 3,
            title: "Broken wall",
            status: "In Progress",
          },
        },
        {
          id: 1,
          title: "Oldest notification",
          message: "This is the oldest.",
          type: "REPORT_STATUS_CHANGE",
          isRead: false,
          userId: 1,
          reportId: 3,
          createdAt: "2026-01-06T12:10:00.000Z",
          updatedAt: "2026-01-06T12:10:00.000Z",
          report: {
            id: 3,
            title: "Broken wall",
            status: "Assigned",
          },
        },
      ];

      mockGetUserNotifications.mockResolvedValue(mockNotifications);

      // Execution
      await NotificationController.getMyNotifications(
        mockReq,
        mockRes,
        mockNext
      );

      // Verification
      expect(mockGetUserNotifications).toHaveBeenCalledWith(mockReq.user.id);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody).toHaveLength(3);
      expect(responseBody[0].id).toBe(3); // Newest first
      expect(responseBody[2].id).toBe(1); // Oldest last
    });

    it("should handle notifications with missing optional fields gracefully", async () => {
      // Setup: Notification with minimal required fields
      const mockNotifications = [
        {
          id: 1,
          title: "Minimal notification",
          message: "Test message",
          type: "SYSTEM",
          isRead: false,
          userId: 1,
          createdAt: "2026-01-06T12:00:00.000Z",
          updatedAt: "2026-01-06T12:00:00.000Z",
        },
      ];

      mockGetUserNotifications.mockResolvedValue(mockNotifications);

      // Execution
      await NotificationController.getMyNotifications(
        mockReq,
        mockRes,
        mockNext
      );

      // Verification
      expect(mockGetUserNotifications).toHaveBeenCalledWith(mockReq.user.id);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockNotifications);
    });
  });
});

