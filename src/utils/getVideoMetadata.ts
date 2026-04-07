// This function gets the video metadata (width, height, duration) using ffmpeg
// It's used in the PlayableAddVideo class to get the video dimensions and duration before uploading the video, which are required parameters for creating the video record in Playable's system

import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffprobePath from '@ffprobe-installer/ffprobe'
import type { FfprobeData, FfprobeStream } from 'fluent-ffmpeg'
import { VideoMetadata } from '../types'

ffmpeg.setFfmpegPath(ffmpegPath.path)
ffmpeg.setFfprobePath(ffprobePath.path)

export function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
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