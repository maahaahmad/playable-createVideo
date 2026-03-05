import axios from "axios"
import fs, { access } from "fs"
import path from "path"

interface PlayableUserOptions {
    email: string
    password: string
}

interface PlayableVideoOptions {
    filePath: string
    title: string
    width: number
    height: number
    duration: number
    filesize: number
}

class PlayableClient {
    private email: string
    private password: string

    // api doc uses access token but the endpoints actually want cognito token
    private propertyId?: string
    private cognitoAccessToken?: string

    // move to env later
    // api doc has an old base url but the endpoints are actually at the one below
    private BASE_URL = "https://api-dev.playable.video/1"

    constructor(userOptions: PlayableUserOptions) {
        this.email = userOptions.email
        this.password = userOptions.password
    }

    /* -----------------------------
      Method that the client sees and interacts with
    ------------------------------ */

    async addVideo(videoOptions: PlayableVideoOptions) {

        // Step 0: User logs in using email and password
        // Returns the cognito access token and property id which are needed for all subsequent steps
        await this.userLogin()

        // Step 1: Create playable version of the video
        // Returns edit_id: id for the edit
        // url_upload: special temporary S3 upload link where user will upload the video file
        // This creates a placeholder job for the video before the actual file is uploaded
        const edit = await this.createEdit(videoOptions)

        // Step 2: Creates the final playable video using the edit just created
        // Returns the video_id which is needed to get the snippet later
        const video = await this.createVideo(
            edit.edit_id,
            videoOptions
        )

        // Step 3: Upload the actual video file to the special S3 upload link provided in step 2
        // It sends the file to S3 storage
        await this.uploadVideo(edit.url_upload, videoOptions.filePath)

        // Step 4: Poll the edit endpoint until the video is done processing and ready
        // Should move from the following states: uploading -> compiling -> transcoding -> ready
        await this.pollUntilReady(edit.edit_id)

        // Step 5: Get the snippet for the video using the video id from step 2
        const snippet = await this.getSnippet(video.video_id)

        return {
            videoId: video.video_id,
            snippet
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

        console.log("Login response: ", res.data)

        return {
            cognitoAccessToken: this.cognitoAccessToken,
            propertyId: this.propertyId
        }
    }

    private async createEdit(videoOptions: PlayableVideoOptions) {
        const fileName = path.basename(videoOptions.filePath)

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.cognitoAccessToken}`
            }
        }

        const editData = {
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
                    crop: `${videoOptions.width}:${videoOptions.height}:0:0`,
                    filesize: videoOptions.filesize
                }
            },
            access_token: this.cognitoAccessToken
        }

        const res = await axios.post(`${this.BASE_URL}/edit?lang=en`, editData, config)

        console.log("Create edit response: ", res.data)

        return res.data
    }

    private async createVideo(editId: number, videoOptions: PlayableVideoOptions) {

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.cognitoAccessToken}`
            }
        }

        const videoData = {
            width: videoOptions.width,
            height: videoOptions.height,
            loop: 0,
            auto_height: true,
            title: videoOptions.title,
            edit_id: editId,
            access_token: this.cognitoAccessToken
        }

        const res = await axios.post(`${this.BASE_URL}/video?lang=en`, videoData, config)

        console.log("Create video response: ", res.data)

        return res.data
    }

    private async uploadVideo(uploadUrl: string, filePath: string) {
        const fileBuffer = fs.readFileSync(filePath)

        const res = await axios.put(uploadUrl, fileBuffer, {
            headers: {
                "Content-Type": "video/quicktime",
                "Content-Length": fileBuffer.length
            },
            maxBodyLength: Infinity
        })

        console.log("Upload response status: ", res.status)
    }

    private async pollUntilReady(editId: number) {

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.cognitoAccessToken}`
            }
        }

        while (true) {
            const res = await axios.get(
                `${this.BASE_URL}/edit/${editId}?&lang=en`,
                config
            )

            const status = res.data.edit.states.autoplay.status
            console.log(`Current status: ${status}`)

            if (status === "ready") return

            await new Promise(r => setTimeout(r, 3000))
        }
    }

    private async getSnippet(videoId: string) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.cognitoAccessToken}`
            }
        }

        const res = await axios.get(
            `${this.BASE_URL}/video/${videoId}?&lang=en`,
            config
        )

        console.log("Snippet: ", res.data.video.snippet_html)

        return res.data.video.snippet_html
    }
}

export default PlayableClient