import axios from "axios"
import fs from "fs"
import path from "path"

interface PlayableCredentials {
    email: string
    password: string
}

interface VideoSource {
    filePath: string
    title: string
    width: number
    height: number
    duration: number
    filesize: number
    contentType?: string
}

interface AddVideoResult {
    videoId: string
    snippetHtml: string
}

class PlayableClient {
    private email: string
    private password: string

    private propertyId?: string
    private cognitoAccessToken?: string

    private BASE_URL = "https://api-qa.playable.video/1"

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
        // ✅ works - logs users in
        await this.userLogin()

        // Step 1: Create edit: get edit_id and signed S3 upload URL
        // ✅ works - creates an edit
        // Returns edit_id: id for the edit
        // url_upload: special temporary S3 upload link where user will upload the video file
        // doesnt upload the video
        // doesnt create a placeholder for the video in the user's account
        const edit = await this.createEdit(videoSource)

        // Step 2: Create video record: get video_id
        // ✅ works - creates a placeholder video in user's Playable account
        // Returns the video_id which is needed to get the snippet later
        // creates a placeholder for the video in the user's account but the video is not playable yet since the file has not been uploaded
        const video = await this.createVideo(edit.edit_id, videoSource)

        await this.updateEdit(edit.edit_id, video.video_id)



        // Step 3: Upload the actual file to S3 using the signed URL from step 1
        // returns 200 response suggesting that the upload is complete
        await this.uploadVideo(edit.url_upload, videoSource.filePath, videoSource.contentType)

        await new Promise(r => setTimeout(r, 5000))

        // Step 4: Poll until processing is complete (uploading → compiling → transcoding → ready)
        await this.pollUntilReady(edit.edit_id)

        // Step 5: Fetch the final snippet HTML using the video_id from step 2
        const snippetHtml = await this.getSnippet(video.video_id)

        return {
            videoId: video.video_id,
            // snippetHtml: ""
            snippetHtml
        }

    }

    /* -----------------------------
       All the internal methods that the client doesn't see
    ------------------------------ */

    private async userLogin() {
        if (this.cognitoAccessToken) return

        const res = await axios.post(`${this.BASE_URL}/session`, {
            email: this.email,
            password: this.password
        })

        this.cognitoAccessToken = res.data.cognito_access_token
        this.propertyId = res.data.properties[0]

        if (!this.cognitoAccessToken) {
            throw new Error(`Login failed: no access token in response. Full response: ${JSON.stringify(res.data)}`)
        }

        console.log("------------------------------------------------")
        console.log("POST /session")
        console.log("Login response:", JSON.stringify(res.data, null, 2)) 
        console.log("✅ Logged in, propertyId:", this.propertyId)
        console.log("------------------------------------------------")
    }

    private get authHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `${this.cognitoAccessToken}`
        }
    }

    private async createEdit(videoSource: VideoSource) {
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

        console.log("------------------------------------------------")
        console.log("POST /edit")
        console.log("Response:", JSON.stringify(res.data, null, 2))
        console.log("✅ Edit created")
        console.log("------------------------------------------------")

        return res.data
    }

    private async createVideo(editId: number, videoSource: VideoSource) {
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

        console.log("------------------------------------------------")
        console.log("POST /video")
        console.log("Response:", JSON.stringify(res.data, null, 2))
        console.log("✅ Video created")
        console.log("------------------------------------------------")

        return res.data
    }

    private async uploadVideo(uploadUrl: string, filePath: string, contentType?: string) {
        const fileBuffer = fs.readFileSync(filePath)

        console.log("------------------------------------------------")
        console.log("PUT (S3 upload)")
        console.log("Upload URL:", uploadUrl)

        const res = await fetch(uploadUrl, {
            method: 'PUT',
            body: fileBuffer,
            headers: {
                'Content-Type': contentType ?? "video/quicktime"
            }
        })

        console.log("S3 status:", res.status, res.statusText)
        console.log("S3 response headers:", Object.fromEntries(res.headers.entries()))
        const body = await res.text()
        console.log("S3 response body:", JSON.stringify(body, null, 2))

        if (!res.ok) {
            throw new Error(`S3 upload failed: ${res.status} - ${body}`)
        }

        console.log("✅ Upload finished")
        console.log("------------------------------------------------")
    }

    private async pollUntilReady(editId: number) {
        const timeout = 2 * 60 * 1000  // 2 minutes
        const interval = 3000
        const MAX_SAME_STATUS_COUNT = 10
        let sameStatusCount = 0
        let lastStatus = ""
        const start = Date.now()

        console.log("------------------------------------------------")
        console.log(`Polling edit ${editId} until ready...`)

        while (true) {
            if (Date.now() - start > timeout) {
                throw new Error("❌ Timeout waiting for video processing")
            }

            const res = await axios.get(
                `${this.BASE_URL}/edit/${editId}?lang=en&src=firebase`,
                { headers: this.authHeaders }
            )

            const status: string = res.data.edit.states.autoplay.status

            console.log("Response:", JSON.stringify(res.data, null, 2))

            // console.log(`Status: ${status}`)
            // console.log(`Full state:`, JSON.stringify(res.data.edit.states, null, 2))


            if (status === "ready") {
                console.log("✅ Video is ready!")
                console.log("------------------------------------------------")
                return
            }

            if (status === lastStatus) {
                sameStatusCount++
            } else {
                sameStatusCount = 0
                lastStatus = status
            }

            if (sameStatusCount > MAX_SAME_STATUS_COUNT) {
                throw new Error(`❌ Stuck in status "${status}" for too long`)
            }

            await new Promise(resolve => setTimeout(resolve, interval))
        }
    }

    private async getSnippet(videoId: string): Promise<string> {

        const res = await axios.get(
            `${this.BASE_URL}/video/${encodeURIComponent(videoId)}?lang=en&src=firebase`,
            { headers: this.authHeaders }
        )

        console.log("------------------------------------------------")
        console.log(`GET /video/${videoId}`)
        console.log("Snippet:", res.data.video.snippet_html)
        console.log("✅ Snippet fetched")
        console.log("------------------------------------------------")

        return res.data.video.snippet_html
    }

    private async updateEdit(editId: number, videoId: number) {
        const res = await axios.post(
            `${this.BASE_URL}/edit/${editId}?_method=PUT&lang=en`,
            {video_id: videoId},  
            { headers: this.authHeaders }
        )

        console.log("------------------------------------------------")
        console.log(`PUT /edit/${editId}`)
        console.log("✅ Edit updated")
        console.log("------------------------------------------------")

        const response = await axios.get(`${this.BASE_URL}/edit/${editId}`, {
            headers: this.authHeaders
        })

        console.log("------------------------------------------------")
        console.log(`GET /edit/${editId}`)
        console.log("Response:", JSON.stringify(response.data, null, 2))
        console.log("✅ Edit fetched")
        console.log("------------------------------------------------")
    }
}

export default PlayableClient