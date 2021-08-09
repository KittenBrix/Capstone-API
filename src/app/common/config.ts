import { DatabaseService } from "../services/db.service"
import { GlobalConfig } from "./types"
export const globalconfig: GlobalConfig = {
    headers: null,
    dbPool: null,
    db: null,
    discord: null,
    jwtConfig: {
        expiresIn: '1h'
    },
}