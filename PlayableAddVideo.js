"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = __importDefault(require("axios"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var PlayableClient = /** @class */ (function () {
    function PlayableClient(userOptions) {
        // move to env later
        // api doc has an old base url but the endpoints are actually at the one below
        this.BASE_URL = "https://api-dev.playable.video/1";
        this.email = userOptions.email;
        this.password = userOptions.password;
    }
    /* -----------------------------
      Method that the client sees and interacts with
    ------------------------------ */
    PlayableClient.prototype.addVideo = function (videoOptions) {
        return __awaiter(this, void 0, void 0, function () {
            var edit, video, snippet;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Step 0: User logs in using email and password
                    // Returns the cognito access token and property id which are needed for all subsequent steps
                    return [4 /*yield*/, this.userLogin()
                        // Step 1: Create playable version of the video
                        // Returns edit_id: id for the edit
                        // url_upload: special temporary S3 upload link where user will upload the video file
                        // This creates a placeholder job for the video before the actual file is uploaded
                    ];
                    case 1:
                        // Step 0: User logs in using email and password
                        // Returns the cognito access token and property id which are needed for all subsequent steps
                        _a.sent();
                        return [4 /*yield*/, this.createEdit(videoOptions)
                            // Step 2: Creates the final playable video using the edit just created
                            // Returns the video_id which is needed to get the snippet later
                        ];
                    case 2:
                        edit = _a.sent();
                        return [4 /*yield*/, this.createVideo(edit.edit_id, videoOptions)
                            // Step 3: Upload the actual video file to the special S3 upload link provided in step 2
                            // It sends the file to S3 storage
                        ];
                    case 3:
                        video = _a.sent();
                        // Step 3: Upload the actual video file to the special S3 upload link provided in step 2
                        // It sends the file to S3 storage
                        return [4 /*yield*/, this.uploadVideo(edit.url_upload, videoOptions.filePath)
                            // Step 4: Poll the edit endpoint until the video is done processing and ready
                            // Should move from the following states: uploading -> compiling -> transcoding -> ready
                        ];
                    case 4:
                        // Step 3: Upload the actual video file to the special S3 upload link provided in step 2
                        // It sends the file to S3 storage
                        _a.sent();
                        // Step 4: Poll the edit endpoint until the video is done processing and ready
                        // Should move from the following states: uploading -> compiling -> transcoding -> ready
                        return [4 /*yield*/, this.pollUntilReady(edit.edit_id)
                            // Step 5: Get the snippet for the video using the video id from step 2
                        ];
                    case 5:
                        // Step 4: Poll the edit endpoint until the video is done processing and ready
                        // Should move from the following states: uploading -> compiling -> transcoding -> ready
                        _a.sent();
                        return [4 /*yield*/, this.getSnippet(video.video_id)];
                    case 6:
                        snippet = _a.sent();
                        return [2 /*return*/, {
                                videoId: video.video_id,
                                snippet: snippet
                            }];
                }
            });
        });
    };
    /* -----------------------------
       All the internal methods that the client doesn't see
    ------------------------------ */
    PlayableClient.prototype.userLogin = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.cognitoAccessToken)
                            return [2 /*return*/];
                        return [4 /*yield*/, axios_1.default.post("".concat(this.BASE_URL, "/session"), {
                                email: this.email,
                                password: this.password
                            })];
                    case 1:
                        res = _a.sent();
                        this.cognitoAccessToken = res.data.cognito_access_token;
                        this.propertyId = res.data.properties[0];
                        console.log("Login response: ", res.data);
                        return [2 /*return*/, {
                                cognitoAccessToken: this.cognitoAccessToken,
                                propertyId: this.propertyId
                            }];
                }
            });
        });
    };
    PlayableClient.prototype.createEdit = function (videoOptions) {
        return __awaiter(this, void 0, void 0, function () {
            var fileName, config, editData, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fileName = path_1.default.basename(videoOptions.filePath);
                        config = {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "".concat(this.cognitoAccessToken)
                            }
                        };
                        editData = {
                            stem: "autoplay",
                            params: {},
                            property_id: this.propertyId,
                            file: fileName,
                            content_type: "video/quicktime",
                            source: {
                                duration: videoOptions.duration,
                                best: {
                                    width: videoOptions.width,
                                    height: videoOptions.height,
                                    crop: "".concat(videoOptions.width, ":").concat(videoOptions.height, ":0:0"),
                                    filesize: videoOptions.filesize
                                }
                            },
                            access_token: this.cognitoAccessToken
                        };
                        return [4 /*yield*/, axios_1.default.post("".concat(this.BASE_URL, "/edit?lang=en"), editData, config)];
                    case 1:
                        res = _a.sent();
                        console.log("Create edit response: ", res.data);
                        return [2 /*return*/, res.data];
                }
            });
        });
    };
    PlayableClient.prototype.createVideo = function (editId, videoOptions) {
        return __awaiter(this, void 0, void 0, function () {
            var config, videoData, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "".concat(this.cognitoAccessToken)
                            }
                        };
                        videoData = {
                            width: videoOptions.width,
                            height: videoOptions.height,
                            loop: 0,
                            auto_height: true,
                            title: videoOptions.title,
                            edit_id: editId,
                            access_token: this.cognitoAccessToken
                        };
                        return [4 /*yield*/, axios_1.default.post("".concat(this.BASE_URL, "/video?lang=en"), videoData, config)];
                    case 1:
                        res = _a.sent();
                        console.log("Create video response: ", res.data);
                        return [2 /*return*/, res.data];
                }
            });
        });
    };
    PlayableClient.prototype.uploadVideo = function (uploadUrl, filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var fileBuffer, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fileBuffer = fs_1.default.readFileSync(filePath);
                        return [4 /*yield*/, axios_1.default.put(uploadUrl, fileBuffer, {
                                headers: {
                                    "Content-Type": "video/quicktime",
                                    "Content-Length": fileBuffer.length
                                },
                                maxBodyLength: Infinity
                            })];
                    case 1:
                        res = _a.sent();
                        console.log("Upload response status: ", res.status);
                        return [2 /*return*/];
                }
            });
        });
    };
    PlayableClient.prototype.pollUntilReady = function (editId) {
        return __awaiter(this, void 0, void 0, function () {
            var config, res, status_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "".concat(this.cognitoAccessToken)
                            }
                        };
                        _a.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 4];
                        return [4 /*yield*/, axios_1.default.get("".concat(this.BASE_URL, "/edit/").concat(editId, "?&lang=en"), config)];
                    case 2:
                        res = _a.sent();
                        status_1 = res.data.edit.states.autoplay.status;
                        console.log("Current status: ".concat(status_1));
                        if (status_1 === "ready")
                            return [2 /*return*/];
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PlayableClient.prototype.getSnippet = function (videoId) {
        return __awaiter(this, void 0, void 0, function () {
            var config, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "".concat(this.cognitoAccessToken)
                            }
                        };
                        return [4 /*yield*/, axios_1.default.get("".concat(this.BASE_URL, "/video/").concat(videoId, "?&lang=en"), config)];
                    case 1:
                        res = _a.sent();
                        console.log("Snippet: ", res.data.video.snippet_html);
                        return [2 /*return*/, res.data.video.snippet_html];
                }
            });
        });
    };
    return PlayableClient;
}());
exports.default = PlayableClient;
