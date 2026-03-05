import PlayableClient from "./PlayableAddVideo"
import fs from "fs"

async function testAddVideo() {
    try {
        const client = new PlayableClient(
            {
                email: "ctbunn123+cognito@gmail.com",
                password: "P%v1e94#n@Uhz^XCSnYL"
            }
        )

        const filePath = "../../../Downloads/demo.mov"
        const videoStats = fs.statSync(filePath)

        const result = await client.addVideo({
            filePath: filePath,
            title: "Demo Video",
            width: 480,
            height: 270,
            duration: 31,
            filesize: videoStats.size
        })

        console.log("RESULT:")
        console.log(result)
    } catch (error) {
        console.error("Error adding video: ", error)
    }
}

testAddVideo()