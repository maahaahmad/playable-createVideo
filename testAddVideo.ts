import PlayableClient from "./PlayableAddVideo"
import fs from "fs"
import getVideoMetadata from "./getVideoMetadata"
import { getContentType } from "./getContentType"

async function testAddVideo() {
    try {
        const client = new PlayableClient(
            {
                email: "technoworkers22@gmail.com",
                password: "PlayablE@0226**!!"
            }
        )

        const filePath = "../../../Downloads/test.mp4"
        const videoStats = fs.statSync(filePath)
        const metadata = await getVideoMetadata(filePath)
        const contentType = await getContentType(filePath)
        console.log('Video metadata:', metadata) 

        const result = await client.addVideo({
            filePath: filePath,
            title: "Test - Test Video Coffee",
            width: metadata.width,
            height: metadata.height,
            duration: metadata.duration,
            filesize: videoStats.size,
            contentType: contentType
        })

        console.log("RESULT:")
        console.log(result)
    } catch (error) {
        console.error("Error adding video: ", error)
    }
}
testAddVideo()