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
        // console.log("HandleHandles")
        let data;
        try {
            data = await next();
            data = data ?? ctx.body;
            // console.log("handlehandles",data);
            if (data && data.err){
                ctx.body = {data: data.data, msg: data.msg, status: ctx.status ?? 500};
            } else if (data && data.data){
                ctx.body = data.data;
            } else if (data){
                ctx.body = data;
            }
            ctx.status = 200;

        } catch (err){
            console.log(err);
            ctx.status = 500;
            ctx.body = err.message;
        }
    }
}