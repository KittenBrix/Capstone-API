import { DatabaseService } from "./db.service";

export class LoggingService {
    static async logEvent(entityType: string, entityId: string, message: string, eventType: string){
        const db = await DatabaseService.getConnection();
        try {
            await db.query(`INSERT INTO appLog (entityid, entitytype, message, eventtype) VALUES (:entityId, :entityType, :message, :eventType)`,{
                entityType, entityId, message, eventType
            });
            await db.commit();
        } catch (err) {
            console.log(err.message);
        } finally {
            await db.release();
        }
    }
}