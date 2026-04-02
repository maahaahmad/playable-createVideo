"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PlayableAddVideo_1 = __importDefault(require("./PlayableAddVideo"));
const fs_1 = __importDefault(require("fs"));
const getVideoMetadata_1 = __importDefault(require("./getVideoMetadata"));
const getContentType_1 = require("./getContentType");
async function testAddVideo() {
    try {
        const client = new PlayableAddVideo_1.default({
            email: "technoworkers22@gmail.com",
            password: "PlayablE@0226**!!"
        });
        const filePath = "../../../Downloads/test.mp4";
        const videoStats = fs_1.default.statSync(filePath);
        const metadata = await (0, getVideoMetadata_1.default)(filePath);
        const contentType = await (0, getContentType_1.getContentType)(filePath);
        console.log('Video metadata:', metadata);
        const result = await client.addVideo({
            filePath: filePath,
            title: "Test - Test Video Coffee",
            width: metadata.width,
            height: metadata.height,
            duration: metadata.duration,
            filesize: videoStats.size,
            contentType: contentType
        });
        console.log("RESULT:");
        console.log(result);
    }
    catch (error) {
        console.error("Error adding video: ", error);
    }
}
testAddVideo();
