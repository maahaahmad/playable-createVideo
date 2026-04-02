"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
const ffprobe_1 = __importDefault(require("@ffprobe-installer/ffprobe"));
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.default.path);
fluent_ffmpeg_1.default.setFfprobePath(ffprobe_1.default.path);
function getVideoMetadata(filePath) {
    return new Promise((resolve, reject) => {
        fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
            if (err)
                return reject(err);
            const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
            if (!videoStream || !videoStream.width || !videoStream.height) {
                return reject(new Error('No video stream found or missing dimensions'));
            }
            resolve({
                width: videoStream.width,
                height: videoStream.height,
                duration: metadata.format.duration || 0
            });
        });
    });
}
exports.default = getVideoMetadata;
