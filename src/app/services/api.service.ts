import * as koa from 'koa';
import { Handle } from '../common/types';

export default class BaseService{
    static async HandleErrors(ctx: koa.Context, next: CallableFunction): Promise<void>{
        try {
            // ctx.status = 0;
            await next();
        } catch (err){
            console.log(err);
            ctx.status = 500;
            ctx.body = `HandleErrors: ${err.message}`;
        }
    }
    static async HandleHandles(ctx: koa.Context, next: CallableFunction){
        let data;
        try {
            data = await next();
            if (data.err){
                console.log("handlehandles",data);
                ctx.body = {data: data.data, msg: data.msg, status: ctx.status ?? 500};
            } else {
                ctx.body = data.data;
            }
            ctx.status = 200;

        } catch (err){
            console.log(err);
            ctx.status = 500;
            ctx.body = err.message;
        }
    }
}