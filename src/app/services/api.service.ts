import * as koa from 'koa';
import { Handle } from '../common/types';

export default class BaseService{
    static async HandleErrors(ctx: koa.Context, next: CallableFunction): Promise<void>{
        try {
            ctx.status = 0;
            await next();
        } catch (err){
            ctx.status = ctx.status || 500;
            ctx.body = `HandleErrors: ${err.message}`;
        }
    }
    static async HandleHandles(ctx: koa.Context, next: CallableFunction){
        let data;
        try {
            data = await next();
            if (data.err){
                ctx.status = data.data;
                ctx.body = data.msg;
            } else {
                ctx.status = 200;
                ctx.body = data.data;
            }
        } catch (err){
            throw new Error(JSON.stringify(data));
        }
    }
}