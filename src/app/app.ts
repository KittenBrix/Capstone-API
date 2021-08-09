import * as Koa from 'koa';
import * as HttpStatus from 'http-status-codes';
import BaseService from './services/api.service';
import { AuthService } from './services/auth.service';
import AuthRoutes from './routes/auth.routes';
import UserRoutes from './routes/user.routes';
const app:Koa = new Koa();

// Generic error handling middleware.
app.use(async (ctx: Koa.Context, next: () => Promise<any>) => {
  try {
    await next();
  } catch (error) {
    ctx.status = error.statusCode || error.status || HttpStatus.INTERNAL_SERVER_ERROR;
    error.status = ctx.status;
    ctx.body = { error };
    ctx.app.emit('error', error, ctx);
  }
});

// Initial route
app.use(async (ctx:Koa.Context) => {
  ctx.body = 'Hello world';
});

// Application error logging.
app.on('error', console.error);

// Handle any server errors and convert data formats.
app.use(BaseService.HandleErrors);
app.use(BaseService.HandleHandles);
// Allow registration/login endpoints
app.use(AuthRoutes.routes());
app.use(AuthRoutes.allowedMethods());
// enforce JWT authentication.
app.use(AuthService.verifyUserJWT);
// enable user settings alterations
// app.use 
//      (add/remove recovery email)
//      (set primary email) 
//      (add/remove/set phone numbers)
//      (set GClass)
app.use(UserRoutes.routes());
app.use(UserRoutes.allowedMethods());


export default app;