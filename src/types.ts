export interface PlayableCredentials {
    email: string
    password: string
}

export interface VideoSource {
    filePath: string
    title: string
    width: number
    height: number
    duration: number
    filesize: number
    contentType?: string
}

export interface AddVideoResult {
    videoId: string
    snippetHtml: string
}

export interface VideoMetadata {
    width: number,
    height: number,
    duration: number
}