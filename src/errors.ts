export class AuthenticationError extends Error {
    constructor(statusCode: number, message: string) {
        super(`Authentication failed: ${statusCode} - ${message}`)
        this.name = "AuthenticationError"
    }
}

export class VideoProcessingError extends Error {
    constructor(statusCode: number, message: string) {
        super(`Failed to process video: ${statusCode} - ${message}`)
        this.name = "VideoProcessingError"
    }
}

export class TimeoutError extends Error {
    constructor(timeoutMs: number) {
        super(`Video processing did not complete within ${timeoutMs / 1000} seconds.`)
        this.name = "TimeoutError"
    }
}

export class SnippetFetchError extends Error {
    constructor(statusCode: number, message: string) {
        super(`Failed to fetch snippet: ${statusCode} - ${message}`)
        this.name = "SnippetFetchError"
    }
}

export class EditCreationError extends Error {
    constructor(statusCode: number, message: string){
        super(`Failed to create edit: ${statusCode} - ${message}`)
        this.name = "EditCreationError"
    }
}

export class VideoCreationError extends Error {
    constructor(statusCode: number, message: string){
        super(`Failed to create video: ${statusCode} - ${message}`)
        this.name = "VideoCreationError"
    }
}

export class UploadVideoError extends Error {
    constructor(statusCode: number, message: string){
        super(`Failed to upload video: ${statusCode} - ${message}`)
        this.name = "UploadVideoError"
    }
}

export class UpdateEditError extends Error {
    constructor(statusCode: number, message: string){
        super(`Failed to update edit with video ID: ${statusCode} - ${message}`)
        this.name = "UpdateEditError"
    }
}
