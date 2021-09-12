import { Email, Handle, Phone, Roles, Submission, User } from "../common/types";
import { DatabaseService } from "./db.service";
import * as Koa from 'koa';
import { UserService } from "./user.service";
// handles routes for deletion.



export class ContentService {
    // delete content CTX method
    static async deleteContent(ctx: Koa.Context, table: 'appUserEmails' | 'appUserPhones' | 'appUserRoles' | 'appSubmissions'): Promise<Handle<boolean>>{
        const result: Handle<boolean>  = {data:false,err:true,msg:`Can't find item to delete`};       
        const itemId = ctx.params.itemid;
        const [{userid}] = (await DatabaseService.execute(`SELECT * from ${table} where id = ?`,[itemId])).data;
        if (userid){
            const [user] = (await DatabaseService.execute(`SELECT * from appUsers where id = ?`,[userid])).data;
            const accessorRole = ctx.user.roleid;
            if (user.id == ctx.user.id){
                console.log('same person. allowing delete.');
            } else if (!user.id){
                return {data:false,err:true,msg:`You can't delete things from unknown users`};
            } else if ((accessorRole <= user.role) || (accessorRole % 2 == 1)){
                return {data:false,err:true,msg:`You can't delete things from user ${user.id}`};
            }
            const res = await DatabaseService.execute(`DELETE FROM ${table} where id = ? and userid = ?`,[itemId,user.id]);
            result.data = <boolean>res.data;
            result.err = res.err;
            result.msg = res.msg;
        }
        return result;
    }

    static async getCohortPeople(ctx: Koa.Context):Promise<Handle<any>>{
        return DatabaseService.execute(`
            SELECT A.id as id, A.username as username, A.firstname as firstname, A.lastname as lastname, A.discordid as discordid, A.fcclink as fcclink, A.active as active,
            U.cohort as cohort, U.id as cohortid, CR.title as cohortrole, AR.title as userrole
                from appUsers A left join appUserRoles U on A.id = U.userid 
                left join appRoles CR on U.roleid = CR.id left join appRoles AR on A.roleid = AR.id
            where U.cohort = ?)`,[ctx.params.cohort]);
    }

    static async getCohortCategorySubmissions(ctx: Koa.Context): Promise<Handle<any>> {
        const result: Handle<any> = {data:null, err:true, msg:"couldn't get data. possibly a permissions issue"};
        // if you have teacher+ roles on the cohort, or admin access, you can read the submissions for the whole cohort.
        // otherwise you can only view your own submissions (if you have any)
        try {
            const [[role]] = (await DatabaseService.execute(`select * from appUserRoles where userid = ? and cohort = ?`,[ctx.user.id, ctx.params.cohort])).data;
            const hasClassAccess = (role && role.roleid && role.roleid >= 3);
            const hasSiteAccess = (ctx.user.roleid >= 3);
            if (hasSiteAccess || hasClassAccess){
                return await DatabaseService.execute(`
                SELECT S.id as submissionid, S.userid as userid, U.firstname as firstname, U.lastname as lastname,
                    S.assignmentid as assignmentid, S.text as text, S.grade as grade, S.pass as pass
                FROM appSubmissions S LEFT JOIN appUsers U on S.userid = U.id
                LEFT JOIN appUserRoles UR on S.userid = UR.userid
                LEFT JOIN appAssignments ASNN on S.assignmentid = ASNN.id
                WHERE UR.roleid <= 2 AND ASNN.moduleid = ? AND UR.cohortid = ?
                `,[ctx.params.category, ctx.params.cohort]);
            } else {
                return await DatabaseService.execute(`
                SELECT S.id as submissionid, S.userid as userid, U.firstname as firstname, U.lastname as lastname,
                    S.assignmentid as assignmentid, S.text as text, S.grade as grade, S.pass as pass
                FROM appSubmissions S LEFT JOIN appUsers U on S.userid = U.id
                LEFT JOIN appUserRoles UR on S.userid = UR.userid
                LEFT JOIN appAssignments ASNN on S.assignmentid = ASNN.id
                WHERE UR.roleid <= 2 AND ASNN.moduleid = ? AND UR.cohortid = ? AND S.userid = ?
                `,[ctx.params.category, ctx.params.cohort, ctx.user.id]);
            }

        } catch (err){
            result.data = err;
            result.msg = err.message;
            result.err = true;
        }
        return result;
    }

    static async getCohortSchedule(ctx: Koa.Context): Promise<Handle<any>>{
        return await DatabaseService.execute(`
            SELECT * from appCohortSchedules where cohortid = ?
        `,[ctx.params.cohort]);
    }

    static async getCohortTimeSheets(ctx: Koa.Context): Promise<Handle<any>>{
        try{
            const [[role]] = (await DatabaseService.execute(`select * from appUserRoles where userid = ? and cohort = ?`,[ctx.user.id, ctx.params.cohort])).data;
            const hasClassAccess = (role && role.roleid && role.roleid >= 3);
            const hasSiteAccess = (ctx.user.roleid >= 3);
            if (hasSiteAccess || hasClassAccess){
                return await DatabaseService.execute(`SELECT * FROM appTimeEntries T where userid in (SELECT userid from appUserRoles where cohort = ?)`,[ctx.params.cohort]);
            } else {
                return await DatabaseService.execute(`SELECT * FROM appTimeEntries T where userid = ?`,[ctx.user.id]);
            }
        } catch (err){
            console.log(err);
            throw err;
        }
    }

    static async getUserSubmissions(ctx: Koa.Context): Promise<Handle<any>>{
        // so check if this user can access the submissions requested for the user (ctx.params.id)
        if (UserService.canAccess(ctx.user.id, ctx.params.id, true)){
            return DatabaseService.execute(`SELECT * from appSubmissions where userid = ?`, [ctx.params.id]);
        }
    }

    static async createUserSubmission(ctx: Koa.Context): Promise<Handle<any>> {
        const body: any = ctx.request.body;
        if (UserService.canAccess(ctx.user.id, body.userid, false)){
            return DatabaseService.insert('appSubmissions',body);
        }
        throw new Error(`User with id ${ctx.user.id} can't create a submission on behalf of user with id ${body.userid}`);
    }
}