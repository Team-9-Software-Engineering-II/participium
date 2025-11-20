import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// --- 1. MOCKING SYSTEM DEPENDENCIES ---

// Mocks for fs methods (renamed to avoid conflict with imports)
const mockFsApi = {
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    unlinkSync: jest.fn(),
};

// Mocks for path methods
const mockPathApi = {
    join: jest.fn((...args) => args.join('/')),
    dirname: jest.fn(() => '/mock/dir'),
    extname: jest.fn((filename) => '.' + filename.split('.').pop()),
    basename: jest.fn((filename, ext) => filename.replace(ext, '').split('-')[0]),
};

// Corrected MOCK STRUCTURE for ES Module imports
jest.unstable_mockModule('fs', () => ({
    default: mockFsApi,
    ...mockFsApi,
}));

jest.unstable_mockModule('path', () => ({
    default: mockPathApi,
    ...mockPathApi,
}));

// Mock Multer (to prevent real storage initialization and capture constructor arguments)
const mockMulter = jest.fn((options) => {
    // Return a mock middleware function structure
    return {
        single: jest.fn(() => jest.fn((req, res, next) => next())),
        array: jest.fn(() => jest.fn((req, res, next) => next())),
        // EXPOSE the configuration arguments for testing:
        storage: options.storage,
        fileFilter: options.fileFilter,
        limits: options.limits,
    };
});
mockMulter.diskStorage = jest.fn((options) => options); // Mock diskStorage to return the options directly

jest.unstable_mockModule('multer', () => ({
    default: mockMulter,
    ...mockMulter,
}));

// Mock fixed values
const mockDateNow = Date.now();
jest.spyOn(global.Date, 'now').mockReturnValue(mockDateNow);
jest.spyOn(global.Math, 'round').mockReturnValue(123456789);

// --- 2. IMPORT CODE UNDER TEST ---

let UploadControllers;
let uploadMiddleware;

const createMockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    return res;
};

describe("Upload Controller and Middleware (Unit)", () => {
    beforeEach(async () => {
        jest.clearAllMocks();

        // Dynamically import the controller module
        UploadControllers = await import("../../../controllers/upload-controller.js");
        uploadMiddleware = UploadControllers.upload; // uploadMiddleware is now the mockMulter return object
    });

// --------------------------------------------------------------------------
// GROUP A: TEST CONTROLLER FUNCTIONS (uploadPhoto/uploadPhotos)
// --------------------------------------------------------------------------

    describe("Controller Functions (uploadPhoto/uploadPhotos)", () => {
        let mockReq;
        let mockRes;
        let mockNext;

        beforeEach(() => {
            mockRes = createMockResponse();
            mockNext = jest.fn();
        });

        describe("uploadPhoto", () => {
            it("should return 200 and file info for successful single upload", async () => {
                const mockFile = {filename: 'test-file-12345.jpg'};
                mockReq = {file: mockFile, files: undefined};

                await UploadControllers.uploadPhoto(mockReq, mockRes, mockNext);

                expect(mockRes.status).toHaveBeenCalledWith(200);
                expect(mockRes.json).toHaveBeenCalledWith({
                    message: "File uploaded successfully.",
                    url: `/uploads/reports/${mockFile.filename}`,
                    filename: mockFile.filename,
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should return 400 if no file is present", async () => {
                mockReq = {file: undefined, files: undefined};

                await UploadControllers.uploadPhoto(mockReq, mockRes, mockNext);

                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({message: "No file uploaded."});
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should call next(error) if an unexpected error occurs", async () => {
                // Setup: Simuliamo un file valido ma una risposta che esplode
                const mockFile = {filename: 'test.jpg'};
                mockReq = {file: mockFile};
                
                // Sabotiamo res.status per lanciare un errore
                const error = new Error("Unexpected failure");
                mockRes.status.mockImplementation(() => { throw error; });

                await UploadControllers.uploadPhoto(mockReq, mockRes, mockNext);

                expect(mockNext).toHaveBeenCalledWith(error);
            });
        });

        describe("uploadPhotos", () => {
            const mockFiles = [
                {filename: 'file1.jpg'},
                {filename: 'file2.png'}
            ];

            it("should return 200 and file info for successful multiple upload (2 files)", async () => {
                mockReq = {files: mockFiles, file: undefined};

                await UploadControllers.uploadPhotos(mockReq, mockRes, mockNext);

                expect(mockRes.status).toHaveBeenCalledWith(200);
                expect(mockRes.json).toHaveBeenCalledWith({
                    message: "Files uploaded successfully.",
                    files: [
                        {url: "/uploads/reports/file1.jpg", filename: "file1.jpg"},
                        {url: "/uploads/reports/file2.png", filename: "file2.png"},
                    ],
                });
                expect(mockFsApi.unlinkSync).not.toHaveBeenCalled();
            });

            it("should return 400 if no files are present", async () => {
                mockReq = {files: [], file: undefined};

                await UploadControllers.uploadPhotos(mockReq, mockRes, mockNext);

                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({message: "No files uploaded."});
            });

            it("should return 400 and delete files if too many files are uploaded (4 files)", async () => {
                const tooManyFiles = [
                    {filename: 'a.jpg'}, {filename: 'b.jpg'},
                    {filename: 'c.jpg'}, {filename: 'd.jpg'}
                ];
                mockReq = {files: tooManyFiles, file: undefined};

                mockPathApi.join
                    .mockReturnValueOnce('/mock/path/a.jpg')
                    .mockReturnValueOnce('/mock/path/b.jpg')
                    .mockReturnValueOnce('/mock/path/c.jpg')
                    .mockReturnValueOnce('/mock/path/d.jpg');

                mockFsApi.existsSync.mockReturnValue(true);

                await UploadControllers.uploadPhotos(mockReq, mockRes, mockNext);

                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({message: "Maximum 3 files allowed."});
                expect(mockFsApi.unlinkSync).toHaveBeenCalledTimes(4);
            });

            it("should call next(error) if an unexpected error occurs", async () => {
                // Setup: Simuliamo files validi ma una risposta che esplode
                const mockFiles = [{filename: 'test.jpg'}];
                mockReq = {files: mockFiles};
                
                // Sabotiamo res.status per lanciare un errore
                const error = new Error("Unexpected failure");
                mockRes.status.mockImplementation(() => { throw error; });

                await UploadControllers.uploadPhotos(mockReq, mockRes, mockNext);

                expect(mockNext).toHaveBeenCalledWith(error);
            });

            it("should handle cleanup gracefully if files do not exist on disk", async () => {
                // Setup: Troppi file (triggera il blocco di pulizia)
                const tooManyFiles = [
                    {filename: 'a.jpg'}, {filename: 'b.jpg'},
                    {filename: 'c.jpg'}, {filename: 'd.jpg'}
                ];
                mockReq = {files: tooManyFiles};

                // Setup: Simuliamo che i file NON esistano su disco
                mockFsApi.existsSync.mockReturnValue(false); 

                await UploadControllers.uploadPhotos(mockReq, mockRes, mockNext);

                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({message: "Maximum 3 files allowed."});
                
                // Verifica cruciale: unlinkSync NON deve essere stato chiamato
                // perché existsSync ha restituito false.
                expect(mockFsApi.unlinkSync).not.toHaveBeenCalled();
            });

            it("should return 400 if req.files is undefined", async () => {
                // Setup: req.files non esiste proprio (diverso da array vuoto)
                mockReq = { files: undefined };

                await UploadControllers.uploadPhotos(mockReq, mockRes, mockNext);

                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({message: "No files uploaded."});
            });
        });
    });

// --------------------------------------------------------------------------
// GROUP B: TEST MULTER CONFIGURATION (Storage and Filter)
// --------------------------------------------------------------------------

    describe("Multer Configuration", () => {

        describe("Storage Destination Logic", () => {
            const mockCb = jest.fn();
            const mockReq = {};
            const mockFile = {};

            it("should create directory if it doesn't exist and call cb with upload path", () => {
                mockFsApi.existsSync.mockReturnValue(false);

                uploadMiddleware.storage.destination(mockReq, mockFile, mockCb);

                expect(mockFsApi.existsSync).toHaveBeenCalled();
                expect(mockFsApi.mkdirSync).toHaveBeenCalledWith(
                    expect.any(String),
                    {recursive: true}
                );
                expect(mockCb).toHaveBeenCalledWith(null, expect.any(String));
            });

            it("should not create directory if it already exists", () => {
                mockFsApi.existsSync.mockReturnValue(true);

                uploadMiddleware.storage.destination(mockReq, mockFile, mockCb);

                expect(mockFsApi.existsSync).toHaveBeenCalled();
                expect(mockFsApi.mkdirSync).not.toHaveBeenCalled();
                expect(mockCb).toHaveBeenCalledWith(null, expect.any(String));
            });
        });

        describe("Storage Filename Logic", () => {
            it("should generate a unique filename using timestamp and original name", () => {
                const mockCb = jest.fn();
                const mockReq = {};
                const mockFile = {originalname: "profile_pic.png"};

                uploadMiddleware.storage.filename(mockReq, mockFile, mockCb);

                const expectedFilenameRegex = new RegExp(`^profile_pic-${mockDateNow}-123456789.png$`);

                expect(mockPathApi.extname).toHaveBeenCalledWith("profile_pic.png");
                expect(mockPathApi.basename).toHaveBeenCalledWith("profile_pic.png", ".png");
                expect(mockCb).toHaveBeenCalledWith(null, expect.stringMatching(expectedFilenameRegex));
            });
        });

        describe("File Filter Logic", () => {
            const mockReq = {};

            it.each([
                "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
            ])("should accept file with allowed mimetype: %s", (mime) => {
                const mockCb = jest.fn();
                const mockFile = {mimetype: mime};

                uploadMiddleware.fileFilter(mockReq, mockFile, mockCb);

                expect(mockCb).toHaveBeenCalledWith(null, true);
            });

            it("should reject file with invalid mimetype", () => {
                const mockCb = jest.fn();
                const mockFile = {mimetype: "application/pdf"};

                uploadMiddleware.fileFilter(mockReq, mockFile, mockCb);

                expect(mockCb).toHaveBeenCalledWith(
                    expect.any(Error),
                    false
                );
                expect(mockCb.mock.calls[0][0].message).toBe(
                    "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
                );
            });
        });

        it("should configure multer with 5MB file size limit", () => {
            expect(uploadMiddleware.limits.fileSize).toBe(5 * 1024 * 1024);
        });
    });
});