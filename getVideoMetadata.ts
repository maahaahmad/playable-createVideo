import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffprobePath from '@ffprobe-installer/ffprobe'
import type { FfprobeData, FfprobeStream } from 'fluent-ffmpeg'


ffmpeg.setFfmpegPath(ffmpegPath.path)
ffmpeg.setFfprobePath(ffprobePath.path)

interface VideoMetadata {
    width: number,
    height: number,
    duration: number
}

function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err: Error | null, metadata: FfprobeData) => {
            if (err) return reject(err)

            const videoStream = metadata.streams.find(
                (s: FfprobeStream) => s.codec_type === 'video'
            )

            if (!videoStream || !videoStream.width || !videoStream.height) {
                return reject(new Error('No video stream found or missing dimensions'))
            }

            resolve({
                width: videoStream.width,
                height: videoStream.height,
                duration: metadata.format.duration || 0
            })
        })
    })
}

export default getVideoMetadata