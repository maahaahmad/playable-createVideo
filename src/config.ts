import dotenv from "dotenv"
dotenv.config()

export const config = {
    playable: {
        baseUrl: process.env.PLAYABLE_BASE_URL,
        userEmail: process.env.PLAYABLE_USER_EMAIL,
        userPassword: process.env.PLAYABLE_USER_PASSWORD
    }
}