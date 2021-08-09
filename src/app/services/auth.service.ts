import * as Koa from 'koa';
import { Handle } from "../common/types";
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from './db.service';
import { LoggingService } from './logging.service';
import { globalconfig } from '../common/config';
export class AuthService {

    // generates a new token using login credentials.
    static async getLoginToken(ctx: Koa.Context): Promise<Handle<string|number>>{
        let status: number = 400;
        let msg: string = "Failed to authenticate";
        try{
            const {userName, password} = ctx.body as any;
            const hashedPassword = await bcrypt.hash(password, 10);
            // determine if user and password match.
            const db = await DatabaseService.getConnection();
            const [possibleUsers] = (await db.query(`
                SELECT * from appUsers where username = :username
            `, {userName}) as any[]);
            let user: any = null;
            status = 404;
            msg = "Could not check database for user credentials"
            possibleUsers.forEach(async (element: any) => {
                if (element && element.hashedpassword && hashedPassword == element.hashedpassword){
                    user = element;
                }
            });
            status = 500;
            msg = "failed to sign found user object"
            const { id, username, firstname, lastname, roleid} = user;
            const payload = { id, username, firstname, lastname, roleid};
            const token = jwt.sign(payload, process.env.JWT_SECRET,globalconfig.jwtConfig);
            await LoggingService.logEvent("appUser",String(payload.id),"User logged in to app via login.","Login");
            return {
                data: token,
                err: false,
                msg: "Successfully signed in."
            };

        }
        catch(err){
            return {data:status,err:true,msg}
        }
    }
    // generates a new token using an existing token.
    static async getRefreshToken(ctx: Koa.Context): Promise<Handle<string|number>>{
        let data: string|number = 400;
        let err = true;
        let msg = "invalid token";
        try{
            // verify token, then resign it, and return that token.
            const tokenHandle = this.extractTokenFromCTX(ctx);
            const user = await this.authenticate(tokenHandle.data.toString());
            if (user && user.id){
                data = jwt.sign(user,process.env.JWT_SECRET,globalconfig.jwtConfig);
                err = false;
                msg = "Refreshed token";
            }
        } catch (e){
            msg = e.message;
            err = true;
            data = 500;
        }
        return {data,err,msg};

    }
    // for creating a new user
    static async registerNewUser(ctx: Koa.Context): Promise<Handle<string|number>>{
        // TODO!!!! register a user, but only if the username has not already been used
        // id, username, firstname, lastname, 
        const {username, firstname, lastname, password} = ctx.request.body as any;
        if (!(username && firstname && lastname && password)){
            throw new Error("Registration is missing a required field.");
        }
        let result: Handle<string|number> = {
            data: null,
            err: true,
            msg: "empty"
        };
        const db = await DatabaseService.getConnection();
        try {
            const [usernames] = await db.query(`SELECT username from appUsers where username = :username`,{username});
            if (usernames && (usernames as any).length){
                throw new Error("Username is in use. Request password reset?");
            }
            else {
                const registrationSuccess = await this.registerUser(ctx.request.body);
                if (registrationSuccess){
                    result = await this.getLoginToken(ctx);
                } else {
                    throw new Error("Could not register this user.");
                }
            }
        } catch (err){
            result.err = true;
            result.msg = err.message;
        } finally {
            await db.end();
        }
        return result;
        
    }
    // convert JWT to a user object. sets ctx.token. sets ctx.user
    static async verifyUserJWT(ctx: Koa.Context, next: CallableFunction): Promise<Handle<any>> {
        
        const tokenHandle = this.extractTokenFromCTX(ctx);
        ctx.token = tokenHandle.data.toString();
        ctx.user = await this.authenticate(ctx.token);
        if (ctx.user && ctx.user.id){
            return await next();
        } else {
            return {data:401, err:true, msg:tokenHandle.msg}
        }
    }
    //produces token content if it's valid
    static async authenticate(token: string): Promise<any> {
        let payload: any;
        await jwt.verify(token,process.env.JWT_SECRET, async (err, authData)=>{
            payload = (err) ? null : authData;
        });
        return payload ;
    }
    //gets the token from the headers on a CTX, or provides an error.
    static extractTokenFromCTX(ctx :Koa.Context): Handle<string|number>{
        let payload: Handle<string|number> = {
            data: 400,
            err: true,
            msg: 'no token provided'
        };
        try {
            const bearerHeader = ctx.req.headers['authorization'];
            const [authType, token] = bearerHeader.split(' ');
            if (authType !== undefined && token !== undefined){
                payload.data = token;
                payload.err = false;
                payload.msg = "token found";
            }
        } catch(err){
            payload.msg = err.message;
        }
        return payload;
    }

    //~~~~~~~~~~~~~~~~~~~~  Non CTX methods. these are not expecting the full context.
    static async registerUser(packet:any): Promise<boolean>{
        const {username, firstname, lastname, password} = packet;
        if (!(username && firstname &&lastname && password)){
            return false;
        }
        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const db = await DatabaseService.getConnection();
        const SQL = `INSERT into appUsers (username, hashedpassword, firstname, lastname, roleId ) VALUES
        (:username, :hashedpassword, :firstname, :lastname, 1)`;
        try{
            const result = await db.query(SQL,{
                username,
                hashedPassword,
                firstname,
                lastname
            });
            await db.commit();
        }catch(err){
            console.log("error creating a user");
            await db.end();
            throw err;
        }
        await db.end();
        return true;
    }

}