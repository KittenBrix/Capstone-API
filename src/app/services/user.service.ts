import { Email, Handle, Phone, Roles, Submission, User } from "../common/types";
import { DatabaseService } from "./db.service";
import * as Koa from 'koa';
import * as bcrypt from 'bcrypt';
import moment = require("moment");

// responsible for user settings and things like that.
export class UserService {
    // Access definitions
    static async canAccess(accessorId: number, userId:number, readOnly:boolean){
        if (accessorId == userId) return true;  // you can always read/alter yourself.
        const editor = (await DatabaseService.execute(`SELECT * from appUsers where id = ?`,[accessorId])).data[0];
        const user = (await DatabaseService.execute(`SELECT * from appUsers where id = ?`,[userId])).data[0];
        const roleId = (editor ? editor.roleId: null) ?? 0;
        const userRole = (user ? user.roleId : 0) ?? 0;
        if (readOnly){
            //read requests
            if (roleId > userRole) return true;  // if your site rank is higher than the individual, you can read it
            // now if they have a lower role than you in a cohort, return true as well.
            try{
                const SQL1 = `SELECT roleid, cohortid FROM appUserRoles where userid = ?`;
                const accessorRoles = (await DatabaseService.execute(SQL1,[accessorId])).data;
                const where = [];
                for (const role of accessorRoles){
                    where.push(`(roleid < ${role.roleid} AND cohortid = ${role.cohortid})`)
                }
                const SQL2 = `SELECT count(*) FROM appUserRoles where userid = ? AND (${where.join(' OR ')})`;
                const hasSuperiority = Boolean((await DatabaseService.execute(SQL2,[userId])).data);
                return hasSuperiority
            }catch (err){
                console.log(err);
                return false;
            }
        } else {
            // write request
            if (roleId % 2 == 1) return false;      // guests can't write
            if (roleId >= 5 && roleId > userRole) return true;   //if you're admin+, and you outrank the individual, you can alter it.
            try{
                // if you're a teacher, you can alter anything belonging to one of your students.
                const SQL1 = `SELECT cohortid FROM appUserRoles where userid = ? and roleid in (4,6,8)`;
                const accessorCohorts = (await DatabaseService.execute(SQL1,[accessorId])).data;
                const cohorts = accessorCohorts.map((el:any)=>{
                    return el.cohortid ?? null;
                });
                const SQL2 = `SELECT count(*) as C FROM appUserRoles where userid = ? and roleid < 3 and cohortid in (${['null',...cohorts].join(', ')})`;
                const values = (await DatabaseService.execute(SQL2, [userId])).data[0];
                const isStudent = Boolean(values.C);
                return isStudent;
            } catch(err){
                console.log(err);
                return false;
            }
        }
    }
    private static async readable(ctx: Koa.Context): Promise<boolean>{
        const { id } = ctx.user;
        const reqId = ctx.params.userId;
        return await this.canAccess(id, reqId, true);
    }
    // read content CTX methods for a router
    static async readContent(ctx: Koa.Context, SQLLIST: string[], DATALIST: any[][], fields: string[] = []): Promise<void>{
        let result: Handle<any> = {data: {}, err: false, msg:`Can't access content for user ${ctx.params.id} with given credentials`};
        if (!this.canAccess(ctx.user.id,ctx.params.id,true)){
            ctx.body = result;
            return;
        }
        operation: try{
            if (SQLLIST.length != DATALIST.length){
                break operation;
            }
            const promises = [];
            for (const index in SQLLIST){
                promises.push(DatabaseService.execute(SQLLIST[index],DATALIST[index]));
            }
            
            const data = await Promise.all(promises);
            result.msg = "";
            for (const index in data){
                const handle = data[index];
                const field = fields[index] ?? index;

                result.data[field] = handle.data;
                result.err = result.err || handle.err;
                result.msg = handle.msg || result.msg;
            }
        } catch (err){
            result.data = err;
            result.err = true;
            result.msg = err.message;
            console.log(err);
        }
        // console.log('readcontent',result);
        ctx.body = result;
    }

    static async readDashContent(id: number){
        const readDate = moment().add(-1,'weeks').format('YYYY-MM-DD hh:mm:ss');
        const data =  await DatabaseService.execute(`SELECT id, message, dateUpdated FROM appLog where entityid = :id and dateUpdated >= :readDate`, {id, readDate});
        return data;
        // return await DatabaseService.execute(`SELECT id, message, dateUpdated FROM appLog where entityid = :id and dateupdated > :readDate`, {id, readDate});
    }

    static async readUpcomingContent(id: number){
        const data: any[] = [];
        // const schedules: any[] = [];
        const roles = (await DatabaseService.execute(`SELECT * from appUserRoles where userid= :id`,{id})).data;
        const cohorts = roles.map((el:any)=>{
            return el.cohortid;
        });
        const terms: any[] = [null];
        for (const term of cohorts){terms.push('?');}
        const schedules = (await DatabaseService.execute(`SELECT * from appCohortSchedules where cohortid in (${terms.join(', ')})`,cohorts)).data;
        
        const lastWeek = moment().startOf('day');
        const nextWeek = moment().add(1,'weeks').endOf('day');
        for (const schedule of schedules){
            const {description} = schedule;
            const start = moment(schedule.start);
            const hours = start.format('hh:mmA');
            const reps = Number(schedule.repeats ?? '0');
            if (reps){
              // propogate repeats
              const daysbetween = Math.abs(lastWeek.diff(start.startOf('day'),'days'));
              const numberPrevious = Math.floor(daysbetween/reps);
              let check = moment(start).add(numberPrevious*reps,'days');
              while (nextWeek.isSameOrAfter(check,'days')){
                if (lastWeek.isSameOrBefore(check,'days')){
                  data.push({
                    time: moment(check.utc(true)),
                    description
                  });
                }
                check = check.add(reps,'days');
              }
            } else {
                if (start.isSameOrAfter(lastWeek) && start.isSameOrBefore(nextWeek)){
                  data.push({
                    time: moment(start.utc(true)),
                    description
                  });
                }
              }
        }
        data.sort((el2,el1)=>{
            const before = el1.time.isSameOrBefore(el2.time);
            const after = el1.time.isSameOrAfter(el2.time);
            return Number(before) - Number(after);
        })
        return data;
    }

    static async readRemainingAssignmentContent(id: number){
        // assignments left (some turned in, some not)
        const SQL = `SELECT
        module.id as modid, module.name as modulename,
        asn.id as assignmentid, asn.name as assignmentname,
        sub.id as submissionid, sub.grade as grade, sub.pass as pass, sub.text as content
        FROM appAssignmentCategory module
        LEFT OUTER JOIN appAssignments asn on module.id = asn.moduleid
        LEFT OUTER JOIN appSubmissions sub on sub.assignmentid = asn.id and sub.userid = :id
        ORDER BY module.id, asn.id, sub.id;`;
        // assignments left to be graded.
        const roles = (await DatabaseService.execute(`SELECT * from appUserRoles where userid= :id`,{id})).data;
        const student: number[] = [];
        const teacher: number[] = [];
        const remaining: any[] = [];
        const toGrade: any[] = [];
        for (const role of roles){
            if (role.roleid < 3){
                student.push(+role.cohortid);
            } else {
                teacher.push(+role.cohortid);
            }
        }
        if (student.length){
            const assignments = (await DatabaseService.execute(SQL,{id})).data;
            remaining.push(...assignments.map((el:any)=>{
                return el;
            }));
        }
        if (teacher.length){
            const SQL2 = `SELECT
            module.id as modid, module.name as modulename,
            asn.id as assignmentid, asn.name as assignmentname,
            sub.id as submissionid, users.id as userid, users.username as username
            FROM appAssignmentCategory module
            LEFT JOIN appAssignments asn on module.id = asn.moduleid
            INNER JOIN appSubmissions sub on sub.assignmentid = asn.id
            INNER JOIN appUsers users on users.id = sub.userid
            WHERE sub.userid in (SELECT distinct userid from appUserRoles where roleid < 3 and cohortid in (${teacher.join(', ')}))
            AND (sub.grade is null or sub.grade = 0)
            ORDER BY module.id, asn.id, sub.id;`;
            const assignments = (await DatabaseService.execute(SQL2,undefined)).data;
            // console.log('grade needed: ',Object.keys(assignments[10]));
            toGrade.push(...assignments.map((el:any)=>{
                return el;
            }));
        }
        return {toGrade, remaining};
    }

    // post content CTX methods for a router
    static async postContent(ctx: Koa.Context, typing: string): Promise<void>{
        const body:any = ctx.request.body;
        body.userid = ctx.params.id
        const result:Handle<boolean> = {data:false,err:true,msg:`Can't post object for user ${body.userid}`}
        if (await this.canAccess(ctx.user.id, body.userid,false)){
            result.msg = `trying alteration for ${typing}`
            switch (typing){
                case 'phone':
                    result.data = await this.addPhone(<Phone>body); break;
                case 'email':
                    result.data = await this.addEmail(<Email>body); break;
                case 'role':
                    result.data = await this.addRole(<Roles>body); break;
                case 'submission':
                    result.data = await this.addSubmission(<Submission>body); break;
            }
            result.msg = result.data==true ? "query successful": "not successful";
        }
        ctx.body = result;
    }
    

    // ~~~~~~~~~~~~~~~~~~~~~~~~~ general non-ctx methods ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // getters
    static async getItems(userId:number, itemType:string): Promise<any> {
        let table = '';
        switch(itemType){
            case "role":
                table = 'appUserRoles'; break;
            case "phone":
                table = 'appUserPhones'; break;
            case "email":
                table = 'appUserEmails'; break;
            case "user":
                table = 'appUsers'; break;
            default:
                throw new Error(`getItems: item type ${itemType} is not valid`);
        }
        return await DatabaseService.execute(`SELECT * from ${table} where userid = :userId`,{userId});
    }
    // adders and setters
    static async addPhone(phone: Phone): Promise<boolean> {
        // return await DatabaseService.execute(`SELECT * from appUserPhones where userid = :userId`,{userId});
        let SQL = '';
        const inputs = [];
        if (!(phone.typename && phone.userid && phone.phone)){
            return false;
        }
        if (phone.id){
            SQL = `UPDATE appUserPhones set phone = ?, typename = ?, userid = ? WHERE id = ? `;
            inputs.push(phone.phone, phone.typename, phone.userid, phone.id);
        } else {
            SQL = `INSERT INTO appUserPhones (phone, userid, typename) VALUES (?,?,?)`;
            inputs.push(phone.phone, phone.userid, phone.typename);
        }
        try {
            await DatabaseService.execute(SQL, inputs);
            await DatabaseService.execute(`INSERT INTO AppLog (entityid, message, eventtype, entitytype) VALUES (?,?,?,?)`,[phone.userid, `Phone ${phone.phone} added to account`, 'Create', 'user']);
            return true;
        } catch(err){
            console.log(err);
            throw err;
        }
    }
    static async addEmail(email:Email): Promise<boolean> {
        // return await DatabaseService.execute(`SELECT * from appUserEmails where userid = :userId`,{userId});
        let SQL = '';
        const inputs = [];
        if (!(email.typename && email.userid && email.email)){
            return false;
        }
        if (email.id){
            SQL = `UPDATE appUserEmails set email = ?, typename = ?, userid = ? WHERE id = ? `;
            inputs.push(email.email, email.typename, email.userid, email.id);
        } else {
            SQL = `INSERT INTO appUserEmails (email, userid, typename) VALUES (?,?,?)`;
            inputs.push(email.email, email.userid, email.typename);
        }
        try {
            await DatabaseService.execute(SQL, inputs);
            await DatabaseService.execute(`INSERT INTO AppLog (entityid, message, eventtype, entitytype) VALUES (?,?,?,?)`,[email.userid, `Email ${email.email} added to account`, 'Create', 'user']);
            return true;
        } catch(err){
            console.log(err);
            throw err;
        }
    }
    static async addRole(role:Roles): Promise<boolean> {
        // return await DatabaseService.execute(`SELECT * from appUserRoles where userid = :userId`,{userId});
        let SQL = '';
        const inputs = [];
        if (!(role.cohortid && role.userid && role.roleid)){
            return false;
        }
        if (role.id){
            SQL = `UPDATE appUserRoles set roleid = ?, cohortid = ?, userid = ? WHERE id = ? `;
            inputs.push(role.roleid, role.cohortid, role.userid, role.id);
        } else {
            SQL = `INSERT INTO appUserRoles (roleid, cohortid, userid) VALUES (?,?,?)`;
            inputs.push(role.roleid, role.cohortid, role.userid);
        }
        try {
            await DatabaseService.execute(SQL, inputs);
            await DatabaseService.execute(`INSERT INTO AppLog (entityid, message, eventtype, entitytype) VALUES (?,?,?,?)`,[role.userid, `Role ${role.roleid} added to account`, 'Create', 'user']);
            return true;
        } catch(err){
            console.log(err);
            throw err;
        }
    }
    static async addSubmission(sub: Submission){
        let SQL = '';
        const inputs = [];
        if (!(sub.assignmentid && sub.userid && sub.text)){
            return false;
        }
        if (sub.id){
            SQL = `UPDATE appSubmissions set assignmentid = ?, text = ?, userid = ?, grade = ?, pass = ?  WHERE id = ? `;
            inputs.push(sub.assignmentid, sub.text, sub.userid, sub.grade ?? null, sub.pass ?? null, sub.id);
        } else {
            SQL = `INSERT INTO appSubmissions (assignmentid, text, userid) VALUES (?,?,?)`;
            inputs.push(sub.assignmentid, sub.text, sub.userid);
        }
        try {
            await DatabaseService.execute(SQL, inputs);
            await DatabaseService.execute(`
                INSERT INTO AppLog (entityid, message, eventtype, entitytype) VALUES (?,?,?,?)`,
                [sub.userid, `Submission updated for assignment: ${sub.assignmentid}`, 'Create', 'User']);
            return true;
        } catch(err){
            console.log(err);
            throw err;
        }
    }
    static async addUserData(user: User, password: string): Promise<any> {
        let data;
        if (user.id){
            data = await this.editUserData(user, password);
        } else {
            const SQL = `INSERT INTO appUsers 
            (username, firstname, lastname, classroomemail, primaryemail, clockifyemail, primaryphone, discordid, fcclink, roleId, active, hashedpassword) VALUES 
            (:uname, :fname, :lname, :cemail, :pemail, :lemail, :pphone, :did, :fcc, :rid, :act, :pass)`;
            const hashedpassword = await bcrypt.hash(password, 10);
            const values = {
                uname: user.username ?? null,
                fname: user.firstname ?? null,
                lname: user.lastname ?? null,
                cemail: user.classroomemail ?? null,
                pemail: user.primaryemail ?? null,
                lemail: user.clockifyemail ?? null,
                pphone: user.primaryphone ?? null,
                did: user.discordid ?? null,
                fcc: user.fcclink ?? null,
                rid: user.roleId ?? 2,
                act: user.active ?? 1,
                pass: hashedpassword
            };
            data = await DatabaseService.execute(SQL, values);
        }
        return data;
    }
    static async editUserData(user: User, password?: string): Promise<Handle<any>> {
        const terms:string[] = [];
        const values:any[] = [];
        if (!user.id){return {data:null,err:true,msg:"can't edit user without id."};}
        if (password){
            terms.push(" hashedpassword = ? ");
            values.push( await bcrypt.hash(password, 10));
        }
        if (user.username){
            terms.push(" username = ? ");
            values.push(user.username);
        }
        if (user.firstname){
            terms.push(" firstname = ? ");
            values.push(user.firstname);
        }
        if (user.lastname){
            terms.push(" lastname = ? ");
            values.push(user.lastname);
        }
        if (user.classroomemail){
            terms.push(" classroomemail = ? ");
            values.push(user.classroomemail);
        }
        if (user.primaryemail){
            terms.push(" primaryemail = ? ");
            values.push(user.primaryemail);
        }
        if (user.clockifyemail){
            terms.push(" clockifyemail = ? ");
            values.push(user.clockifyemail);
        }
        if (user.primaryphone){
            terms.push(" primaryphone = ? ");
            values.push(user.primaryphone);
        }
        if (user.discordid){
            terms.push(" discordid = ? ");
            values.push(user.discordid);
        }
        if (user.fcclink){
            terms.push(" fcclink = ? ");
            values.push(user.fcclink);
        }
        if (user.roleId){
            terms.push(" roleId = ? ");
            values.push(user.roleId);
        }
        if (user.active == false || user.active == true){
            terms.push(" active = ? ");
            values.push(user.active);
        }
        const SQL = `UPDATE appUsers SET ${terms.join(', ')} WHERE id = ?`;
        await DatabaseService.execute(`INSERT INTO AppLog (entityid, message, eventtype, entitytype) VALUES (?,?,?,?)`,[user.id, `${terms.length} values altered on the user record.`, 'Update', 'user']);
        return await DatabaseService.execute(SQL,[...values,user.id]);
    }
    // deleters
    static async deleteItemById(id: number, itemType: string): Promise<boolean> {
        // return await DatabaseService.execute(`SELECT * from appUserPhones where userid = :userId`,{userId});
        let table = '';
        switch(itemType){
            case "role":
                table = 'appUserRoles'; break;
            case "phone":
                table = 'appUserPhones'; break;
            case "email":
                table = 'appUserEmails'; break;
            case "user":
                table = 'appUsers'; break;
            default:
                throw new Error(`deleteItemById: item type ${itemType} is not valid`);
        }
        await DatabaseService.execute(`DELETE FROM ${table} WHERE id = ?`,[id]);
        return true;
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~ router methods ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    static async editUser(ctx:Koa.Context){
        console.log("editUser entered")
        let res: Handle<any> = {
            data:null,
            err:true,
            msg:"Can't edit the provided user with your credentials"
        };
        try{
            if (UserService.canAccess(ctx.user.id, ctx.params.id, false)){
                const userInfo: any = ctx.request.body;
                userInfo.id = ctx.params.id;
                res = await UserService.editUserData(userInfo, userInfo.password ?? undefined);
                // console.log('res',res.data);
                res.data = Boolean(res.data.changedRows);
            }
        } catch (err){
            res.data = null;
            res.err = true;
            res.msg = err.message;
        } finally {
            console.log("edituser returning.", JSON.stringify(res));
            ctx.body = res;
            return res;
        }
    }

    static async getDashContent(ctx:Koa.Context){
        const user = ctx.user;
        const target = await (await DatabaseService.execute(`SELECT * from appUsers where id = ?`,[ctx.params.id])).data[0];
        ctx.body = {data:null,err:true,msg:"not found"};
        if (!!user && !!target && this.canAccess(user.id, target.id, true)){
            const tid: number = parseInt(target.id);
            ctx.body = await UserService.readDashContent(tid);
        }
        return ctx.body;
    }

    static async getUpcomingContent(ctx: Koa.Context){
        const user = ctx.user;
        const target = await (await DatabaseService.execute(`SELECT * from appUsers where id = ?`,[ctx.params.id])).data[0];
        ctx.body = {data:null,err:true,msg:"not found"};
        if (!!user && !!target && this.canAccess(user.id, target.id, true)){
            const tid: number = parseInt(target.id);
            ctx.body = await UserService.readUpcomingContent(tid);
        }
        return ctx.body;
    }

    static async getRemainingAssignmentContent(ctx: Koa.Context){
        const user = ctx.user;
        const target = await (await DatabaseService.execute(`SELECT * from appUsers where id = ?`,[ctx.params.id])).data[0];
        ctx.body = {data:null,err:true,msg:"not found"};
        if (!!user && !!target && this.canAccess(user.id, target.id, true)){
            const tid: number = parseInt(target.id);
            ctx.body = await UserService.readRemainingAssignmentContent(tid);
        }
        return ctx.body;
    }
}