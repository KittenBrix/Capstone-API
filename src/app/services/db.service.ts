import * as mysql from 'mysql2/promise';
import { Handle } from '../common/types';
import * as dotenv from 'dotenv';
import moment = require('moment');
dotenv.config();
// provide a service to get a configured database connection.
export class DatabaseService {
    private static config = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    };
    public static dbPool: mysql.Pool = mysql.createPool(DatabaseService.config);
    static async getPool(): Promise<mysql.Pool>{
        return await this.dbPool;
    }
    static async getConnection(): Promise<mysql.PoolConnection>{
        const conn = await this.dbPool.getConnection();
        conn.config.namedPlaceholders = true;
        return conn;
    }

    static async execute(SQL:string, DATA:any, log:boolean = false):Promise<Handle<any>>{
        const db = await this.getConnection();
        let result: Handle<any> = {data:null,err:false,msg:null};
        try{
            const res = await db.query(SQL,DATA);
            result.data = (res.length == 2) ? res[0]: res;
            const res2 = await db.commit();
            if (log){
                console.log(SQL,res,res2);
            }
        }catch(err){
            console.log('DBERR', err);
            result.err = true;
            result.msg = err.message;
        }finally{
            await db.release();
        }
        return result;
    }

    static async insert(table:string, content: any): Promise<Handle<any>>{
        const data = await DatabaseService.execute(`describe ?`,[table]);
        const fields: string[] = [];
        const values: string[] = [];
        const keys = Object.keys(content);
        for (const field of data.data){
            if (keys.includes(field.field)){
                fields.push(field.field);
                values.push(`:${field.field}`);
            }
        }
        const SQL = `INSERT into ${table} (${fields.join(', ')}) VALUES (${values.join(', ')})`;
        const result = await DatabaseService.execute(SQL, content);
        return result;
    }
}