import { Role, User } from "discord.js";
import { Email, Phone } from "../common/types";
import { DatabaseService } from "./db.service";
import * as Koa from 'koa';

// responsible for user settings and things like that.
export class UserService {

    static async getCompleteUser(ctx: Koa.Context){
        // switch based on roleid of current user.
        // admin/owner -check anyone. teach -check class/teachers. student -check classmates names / status.
        // can use appUserRoles to distinguish teacher/student/admin relationship on X cohorts.
    }






    // ~~~~~~~~~~~~~~~~~~~~~~~~~ general non-ctx methods ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // getters
    static async getPhones(userId:number): Promise<any> {
        return await DatabaseService.execute(`SELECT * from appUserPhones where userid = :userId`,{userId});
    }
    static async getEmails(userId:number): Promise<any> {
        return await DatabaseService.execute(`SELECT * from appUserEmails where userid = :userId`,{userId});
    }
    static async getRoles(userId:number): Promise<any> {
        return await DatabaseService.execute(`SELECT * from appUserRoles where userid = :userId`,{userId});
    }
    static async getUserData(userId:number): Promise<any> {
        return await DatabaseService.execute(`SELECT * from appUser where userid = :userId`,{userId});
    }
    // adders TODO
    static async addPhone(userId:number, phone: Phone): Promise<any> {
        // return await DatabaseService.execute(`SELECT * from appUserPhones where userid = :userId`,{userId});
    }
    static async addEmail(userId:number, email:Email): Promise<any> {
        // return await DatabaseService.execute(`SELECT * from appUserEmails where userid = :userId`,{userId});
    }
    static async addRole(userId:number, role:Role): Promise<any> {
        // return await DatabaseService.execute(`SELECT * from appUserRoles where userid = :userId`,{userId});
    }
    // deleters
    static async removePhone(userId:number, phone: Phone): Promise<any> {
        // return await DatabaseService.execute(`SELECT * from appUserPhones where userid = :userId`,{userId});
    }
    static async removeEmail(userId:number, email:Email): Promise<any> {
        // return await DatabaseService.execute(`SELECT * from appUserEmails where userid = :userId`,{userId});
    }
    static async removeRole(userId:number, role:Role): Promise<any> {
        // return await DatabaseService.execute(`SELECT * from appUserRoles where userid = :userId`,{userId});
    }
    // Setters
    static async setUserData(userId:number, userData: User): Promise<any> {
        return await DatabaseService.execute(`SELECT * from appUser where userid = :userId`,{userId});
    }

}