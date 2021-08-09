import * as Koa from 'koa';
import { Handle } from "../common/types";
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from './db.service';
import { LoggingService } from './logging.service';
import { globalconfig } from '../common/config';
export class FCCService {
    static async registerUserFCCLink(ctx: Koa.Context): Promise<Handle<boolean>> {
        let result: Handle<boolean> = {
            data: false,
            err: true,
            msg: 'empty'
        };
        const user = ctx.user;
        const link = (<any>ctx.request.body).fcclink;
        if (user && user.id && link != undefined){
            try {
                const success = await DatabaseService.execute(`UPDATE appUsers set fcclink = :link where id = :id`,{link,id:user.id});
                if (success.data && success.data.resultId){
                    result.data = true;
                }
            } catch (err){
                result.err = true;
                result.msg = err.message;
            }
        } else {
            result.msg = "user id or link is missing.";
        }
        return result;
    }

    // update FCC tables based on user's current FCC data
    static async scrapeUserFCC(userId: number): Promise<any> {
    }

    // get user FCC data.
    static async getUserFCCData(userId: number): Promise<any>{
        // using userId, find out which groups of topics have been completed.
    }

    static async scrapeFCCAssignments(): Promise<any>{
        // enter into fccCredentials all assignments on FCC so we know what they need to complete.
    }

}