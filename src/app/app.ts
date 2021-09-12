import * as Koa from 'koa';
import * as HttpStatus from 'http-status-codes';
import BaseService from './services/api.service';
import { AuthService } from './services/auth.service';
import AuthRoutes from './routes/auth.routes';
import UserRoutes from './routes/user.routes';
import ContentRoutes from './routes/content.routes';
import * as cors from 'koa2-cors';
import bodyParser = require('koa-bodyparser');
const app:Koa = new Koa();

// cors stuff
app.use(cors({origin:"*"}));
app.use(bodyParser());

// Generic error handling middleware.
app.use(async (ctx: Koa.Context, next: () => Promise<any>) => {
  try {
    await next();

  } catch (error) {
    ctx.status = 200;
    error.status = ctx.status;
    ctx.body = { error };
    ctx.app.emit('error', error, ctx);
  }
});

// Initial route
// app.use(async (ctx:Koa.Context) => {
//   ctx.body = 'Hello world';
// });

// Application error logging.
app.on('error', console.error);

// Handle any server errors and convert data formats.
app.use(BaseService.HandleErrors);
app.use(BaseService.HandleHandles);
// Allow registration/login endpoints
app.use(AuthRoutes.routes()).use(AuthRoutes.allowedMethods());
// enforce JWT authentication.
app.use(AuthService.verifyUserJWT);
// user routes
app.use(UserRoutes.routes()).use(UserRoutes.allowedMethods());
app.use(ContentRoutes.routes()).use(ContentRoutes.allowedMethods());
// at this point, you can reg/login, add, edit, and delete user content.
// assignment stuff is necessary.


export default app;