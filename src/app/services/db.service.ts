import * as mysql from 'mysql2/promise';
import { Handle } from '../common/types';

// provide a service to get a configured database connection.
export class DatabaseService {
    static readonly config = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    };
    private static dbPool: mysql.Pool = mysql.createPool(DatabaseService.config);
    static async getPool(): Promise<mysql.Pool>{
        return await this.dbPool;
    }
    static async getConnection(): Promise<mysql.Connection>{
        const conn = await this.dbPool.getConnection();
        conn.config.namedPlaceholders = true;
        return conn;
    }

    static async execute(SQL:string, DATA:any):Promise<Handle<any>>{
        const db = await this.getConnection();
        let result: Handle<any> = {data:null,err:false,msg:null};
        try{
            const res = await db.query(SQL,DATA);
            result.data = res;
        }catch(err){
            result.err = true;
            result.msg = err.message;
        }finally{
            await db.end();
        }
        return result;
    }
}