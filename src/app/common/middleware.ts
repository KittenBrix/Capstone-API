import * as Koa from 'koa';

export const hasAdminAccess: any = async (ctx: Koa.Context) => {
    return ctx.user.roleid >= 5;
}

export const isGuestUser: any = async (ctx: Koa.Context) => {
    return (ctx.user.roleid % 2 == 1);
}