import axios from "axios"
import fs from "fs"
import path from "path"
import { PlayableCredentials, VideoSource, AddVideoResult } from "./types"
import { AuthenticationError, EditCreationError, VideoCreationError, VideoProcessingError, SnippetFetchError, TimeoutError, UploadVideoError, UpdateEditError, getErrorDetails } from "./errors"
import { config } from "./config"

class PlayableClient {
    private email: string
    private password: string

    private propertyId?: string
    private cognitoAccessToken?: string

    private BASE_URL = config.playable.baseUrl

    constructor(userOptions: PlayableCredentials) {
        this.email = userOptions.email
        this.password = userOptions.password
    }

    /* -----------------------------
      Method that the client sees and interacts with
    ------------------------------ */

    async addVideo(videoSource: VideoSource): Promise<AddVideoResult> {

        // Step 0: Login: get cognito token + property id
        // Returns the cognito access token and property id which are needed for all subsequent steps
        await this.userLogin()

        // Step 1: Create edit: get edit_id and signed S3 upload URL
        // Returns edit_id: id for the edit
        // url_upload: special temporary S3 upload link where user will upload the video file
        const edit = await this.createEdit(videoSource)

        // Step 2: Create video record: get video_id
        // Returns the video_id which is needed to get the snippet later
        // creates a placeholder for the video in the user's account but the video is not playable yet since the file has not been uploaded
        const video = await this.createVideo(edit.edit_id, videoSource)

        // Step 3: Associates video with the edit 
        // This step is required before uploading the video to S3, otherwise the system will not know which video the uploaded file belongs to and the processing will not start
        await this.updateEdit(edit.edit_id, video.video_id)

        // Step 4: Upload the actual file to S3 using the signed URL from step 1
        await this.uploadVideo(edit.url_upload, videoSource.filePath, videoSource.contentType)

        // Step 5: Poll until processing is complete (uploading → compiling → transcoding → ready)
        await this.pollUntilReady(edit.edit_id)

        // Step 6: Fetch the final snippet HTML using the video_id from step 2
        const snippetHtml = await this.getSnippet(video.video_id)

        return {
            videoId: video.video_id,
            snippetHtml
        }
    }

    /* -----------------------------
       All the internal methods that the client doesn't see
    ------------------------------ */

    private async userLogin() {
        if (this.cognitoAccessToken) return

        try {
            const res = await axios.post(`${this.BASE_URL}/session`, {
                email: this.email,
                password: this.password
            })
            

            this.cognitoAccessToken = res.data.cognito_access_token
            this.propertyId = res.data.properties[0]

            if (!this.cognitoAccessToken) {
                throw new AuthenticationError(res.status, "Login Failed: No access token in response")
            }

            console.log("✅ Logged in")
        } catch (error: any) {
            const {statusCode, message} = getErrorDetails(error)
            throw new AuthenticationError(statusCode, message || "Login failed")
        }
    }

    private get authHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `${this.cognitoAccessToken}`
        }
    }

    private async createEdit(videoSource: VideoSource) {
        try {
            const fileName = path.basename(videoSource.filePath)

            const editData = {
                stem: "autoplay",
                params: {},
                property_id: this.propertyId,
                file: fileName,
                content_type: videoSource.contentType,
                source: {
                    duration: videoSource.duration,
                    best: {
                        width: videoSource.width,
                        height: videoSource.height,
                        crop: `${videoSource.width}:${videoSource.height}:0:0`,
                        filesize: videoSource.filesize
                    }
                },
                access_token: this.cognitoAccessToken
            }

            const res = await axios.post(`${this.BASE_URL}/edit?lang=en`, editData, {
                headers: this.authHeaders
            })

            if (!res.data.edit_id || !res.data.url_upload) {
                throw new EditCreationError(res.status, "Edit creation failed: missing Edit ID or S3 presigned URL in response")
            }

            console.log("✅ Edit created")
            return res.data
        } catch (error: any) {
            const {statusCode, message} = getErrorDetails(error)
            throw new EditCreationError(statusCode, message || "Failed to create edit")
        }
    }

    private async createVideo(editId: number, videoSource: VideoSource) {
        try {
            const videoData = {
                width: videoSource.width,
                height: videoSource.height,
                loop: 0,
                auto_height: true,
                title: videoSource.title,
                edit_id: editId,
                access_token: this.cognitoAccessToken
            }

            const res = await axios.post(`${this.BASE_URL}/video?lang=en`, videoData, {
                headers: this.authHeaders
            })

            if (!res.data.video_id) {
                throw new VideoCreationError(res.status, "Video creation failed: missing video ID in response")
            }
            
            console.log("✅ Video created")
            return res.data
        } catch (error: any) {
            const {statusCode, message} = getErrorDetails(error)
            throw new VideoCreationError(statusCode, message || "Failed to create video")
        }
    }

    private async uploadVideo(uploadUrl: string, filePath: string, contentType?: string) {
        const fileBuffer = fs.readFileSync(filePath)


        try {
            const res = await fetch(uploadUrl, {
                method: 'PUT',
                body: fileBuffer,
                headers: { 'Content-Type': contentType ?? "video/quicktime" }
            })

            const body = await res.text()
            console.log("S3 response body:", JSON.stringify(body, null, 2))

            if (!res.ok) {
                throw new UploadVideoError(res.status, `Upload failed to pre-signed S3 URL: ${body}`)
            }

            console.log("✅ Upload finished")
        } catch (err: any) {
            throw new UploadVideoError(500, err.message || "Network error uploading video")
        }
    }

    private async pollUntilReady(editId: number) {
        const timeout = 2 * 60 * 1000  // 2 minutes
        const interval = 3000
        const MAX_SAME_STATUS_COUNT = 10
        let sameStatusCount = 0
        let lastStatus = ""
        const start = Date.now()

        console.log(`Polling edit ${editId} until ready...`)

        while (true) {
            if (Date.now() - start > timeout) {
                throw new TimeoutError(timeout)
            }

            const res = await axios.get(
                `${this.BASE_URL}/edit/${editId}?lang=en&src=firebase`,
                { headers: this.authHeaders }
            )

            const status: string = res.data.edit.states.autoplay.status

            console.log("Response of polling:", JSON.stringify(res.data, null, 2))

            if (status === "ready") {
                console.log("✅ Video is ready!")
                return
            }

            if (status === lastStatus) {
                sameStatusCount++
            } else {
                sameStatusCount = 0
                lastStatus = status
            }

            if (sameStatusCount > MAX_SAME_STATUS_COUNT) {
                throw new VideoProcessingError(res.status, `Stuck in status "${status}" for too long`)

            }

            await new Promise(resolve => setTimeout(resolve, interval))
        }
    }

    private async getSnippet(videoId: string): Promise<string> {
        try {
            const res = await axios.get(
                `${this.BASE_URL}/video/${encodeURIComponent(videoId)}?lang=en&src=firebase`,
                { headers: this.authHeaders }
            )

            if (!res.data.video?.snippet_html) {
                throw new SnippetFetchError(res.status, 'No snippet_html returned for video')
            }

            console.log("✅ Snippet fetched")
            return res.data.video.snippet_html

        } catch (error: any) {
            const {statusCode, message} = getErrorDetails(error)
            throw new SnippetFetchError(statusCode, message || "Failed to fetch snippet")
        }
    }

    private async updateEdit(editId: number, videoId: number) {
        try {
            const res = await axios.post(
                `${this.BASE_URL}/edit/${editId}?_method=PUT&lang=en`,
                { video_id: videoId },
                { headers: this.authHeaders }
            )

            console.log("✅ Edit updated")

            const response = await axios.get(`${this.BASE_URL}/edit/${editId}`, {
                headers: this.authHeaders
            })

            if (!response.data.edit.video_id) {
                throw new UpdateEditError(response.status, "Edit update failed: video ID not associated with edit after update")
            }

        } catch (error: any) {
            const {statusCode, message} = getErrorDetails(error)
            throw new UpdateEditError(statusCode, message || "Failed to update edit with video ID")
        }
    }
}

export default PlayableClient