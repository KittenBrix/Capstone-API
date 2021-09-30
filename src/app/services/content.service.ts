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

    static async getCohorts(ctx?: Koa.Context): Promise<Handle<any>>{
        const data = await DatabaseService.execute(`SELECT id from appCohorts`, undefined);
        // console.log('yeeet',data);
        if (ctx) ctx.body = data;
        return data;
    }
    static async getCohortPeople(ctx: Koa.Context):Promise<Handle<any>>{
        let data;
        if (+ctx.params.cohortid == 0){
            data = await DatabaseService.execute(`
            SELECT A.id as id, A.username as username, A.firstname as firstname, A.lastname as lastname, A.discordid as discordid, A.fcclink as fcclink, A.active as active,
            U.cohortid as cohortid, 
            CR.title as cohortrole, 
            AR.title as userrole
            from appUsers A 
                left join appUserRoles U on A.id = U.userid 
                left join appRoles CR on U.roleid = CR.id 
                left join appRoles AR on A.roleid = AR.id
            where U.cohortid is null`,undefined);
        } else {
            data = await DatabaseService.execute(`
            SELECT A.id as id, A.username as username, A.firstname as firstname, A.lastname as lastname, A.discordid as discordid, A.fcclink as fcclink, A.active as active,
            U.cohortid as cohortid, 
            CR.title as cohortrole, 
            AR.title as userrole
            from appUsers A 
                left join appUserRoles U on A.id = U.userid 
                left join appRoles CR on U.roleid = CR.id 
                left join appRoles AR on A.roleid = AR.id
            where U.cohortid = :cid`,{cid:ctx.params.cohortid});
        }
        if (ctx) ctx.body = data;
        return data;
    }

    static async getCohortCategorySubmissions(ctx: Koa.Context): Promise<Handle<any>> {
        let result: Handle<any> = {data:null, err:true, msg:"couldn't get data. possibly a permissions issue"};
        // if you have teacher+ roles on the cohort, or admin access, you can read the submissions for the whole cohort.
        // otherwise you can only view your own submissions (if you have any)
        try {
            console.log(1)
            const role = (await DatabaseService.execute(`select * from appUserRoles where userid = ? and cohort = ?`,[ctx.user.id, ctx.params.cohortid])).data;
            console.log(2)
            const hasClassAccess = (role && role.roleid && role.roleid >= 3);
            console.log(3)
            const hasSiteAccess = (ctx.user.roleid >= 3);
            console.log(4)
            if (hasSiteAccess || hasClassAccess){
                console.log(5)
                const userids = (await DatabaseService.execute(`SELECT distinct userid from appUserRoles where roleid < 3 and cohortid = ?`,[ctx.params.cohortid])).data.map((el: any)=>{
                    return el.userid;
                });
                console.log(userids);
                const data:any = {}; //data is object. assignment ids are keys. each member is array that is N big, where N is number of people in userids.
                const {data: assns} = await DatabaseService.execute(`SELECT id from appAssignments where moduleid = ? AND inactive = false`,[ctx.params.category]);
                for (const an of assns){
                    const key = `${an.id}`;
                    data[key] = (await DatabaseService.execute(`
                        SELECT *, S.id as sid, U.id as userid FROM appUsers U 
                        LEFT JOIN appSubmissions S 
                            ON S.userid = U.id AND S.assignmentid = ? 
                        WHERE U.id in ( ${userids.join(', ')} )
                        ORDER BY grade desc
                    `,[an.id])).data;
                }
                console.log(data);
                result.data = data;
                result.err = false;
                result.msg = `Cohort ${ctx.params.cohortid} completion in Category "${ctx.params.category}"`;
                console.log(6)
            } else {
                throw new Error("You don't have permission to view this cohort's submissions for this module.")
            }
            console.log(9)
        } catch (err){
            console.log(10)
            result.data = err;
            result.msg = err.message;
            result.err = true;
        }
        ctx.body = result;
        console.log(11)
        return result;
    }

    static async getCohortSchedule(ctx: Koa.Context): Promise<Handle<any>>{
        const data = await DatabaseService.execute(`
            SELECT * from appCohortSchedules where cohortid = ?
        `,[ctx.params.cohortid]);
        ctx.body = data;
        console.log(data);
        return data;
    }

    static async getCohortTimeSheets(ctx: Koa.Context): Promise<Handle<any>>{
        let result =null;
        try{
            console.log('gettimesheet...',ctx.user.id, ctx.params.cohortid, ctx.user.roleid);
            let hasClassAccess = false;
            const hasSiteAccess = (ctx.user.roleid >= 3);
            console.log('ctx.roleid',ctx.user.roleid);
            const {data:results} = await DatabaseService.execute(`select * from appUserRoles where userid = ? and cohortid = ?`,[ctx.user.id, ctx.params.cohortid]);
            if (results){
                const [role] = results;
                hasClassAccess = (role && role.roleid && role.roleid >= 3);
            }
            if (hasSiteAccess || hasClassAccess){
                result =  await DatabaseService.execute(`SELECT * FROM appTimeEntries T where userid in (SELECT userid from appUserRoles where cohortid = ?)`,[ctx.params.cohortid]);
            } else {
                result = await DatabaseService.execute(`SELECT * FROM appTimeEntries T where userid = ?`,[ctx.user.id]);
            }
        } catch (err){
            console.log(err);
            throw err;
        }
        if (ctx) ctx.body = result;
        return result
    }

    static async getUserSubmissions(ctx: Koa.Context): Promise<void>{
        // so check if this user can access the submissions requested for the user (ctx.params.id)
        if (UserService.canAccess(ctx.user.id, ctx.params.id, true)){
            ctx.body = await DatabaseService.execute(`SELECT * from appSubmissions where userid = ?`, [ctx.params.id]);
        }
    }

    static async createUserSubmission(ctx: Koa.Context): Promise<void> {
        const body: any = ctx.request.body;
        if (UserService.canAccess(ctx.user.id, body.userid, false)){
            ctx.body = await DatabaseService.insert('appSubmissions',body);
        }
        throw new Error(`User with id ${ctx.user.id} can't create a submission on behalf of user with id ${body.userid}`);
    }
}