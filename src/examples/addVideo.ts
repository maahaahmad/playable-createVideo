import fs from "fs"
import { getVideoMetadata } from "../utils/getVideoMetadata"
import { getContentType } from "../utils/getContentType"
import PlayableClient from "../PlayableClient"
import { config } from "../config"

async function addVideo() {
    try {

        // Using hardcoded credentials for testing only; replace with user-provided credentials in production
        const client = new PlayableClient(
            {
                email: config.playable.userEmail!,
                password: config.playable.userPassword!
            }
        )

        if (!config.playable.userEmail || !config.playable.userPassword) {
            throw new Error("PLAYABLE_USER_EMAIL and PLAYABLE_USER_PASSWORD must be set")
        }

        const filePath = "FILE-PATH" // replace with user's video file path

        const videoStats = fs.statSync(filePath)
        const metadata = await getVideoMetadata(filePath)
        const contentType = getContentType(filePath)

        const result = await client.addVideo({
            filePath: filePath,
            title: "VIDEO TITLE", // replace with user's video title
            width: metadata.width,
            height: metadata.height,
            duration: metadata.duration,
            filesize: videoStats.size,
            contentType: contentType
        })

        console.log("Video added successfully!")
        console.log(`Video ID: ${result.videoId}`)
        console.log(`Snippet: ${result.snippetHtml}`)
    } catch (error) {
        console.error("Error adding video: ", error)
    }
}

addVideo()