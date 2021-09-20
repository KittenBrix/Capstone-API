import * as Router from 'koa-router';
import { DatabaseService } from '../services/db.service';
import { UserService } from '../services/user.service';


const routerOptions: Router.IRouterOptions = {
    prefix: '/user',
};

const router: Router = new Router(routerOptions);


// get some stuff.
router.get('/:id/', async (ctx)=>{await UserService.readContent(ctx,[`SELECT id, username, firstname, lastname, classroomemail, discordid, fcclink, dateCreated, dateUpdated, roleId, active, primaryemail, primaryphone, clockifyemail FROM appUsers where id = ?`],[[ctx.params.id]]);});
router.get('/:id/phones/', async (ctx)=>{await UserService.readContent(ctx,[`SELECT * FROM appUserPhones where userid = ?`],[[ctx.params.id]]);});
router.get('/:id/emails/', async (ctx)=>{ await UserService.readContent(ctx,[`SELECT * FROM appUserEmails where userid = ?`],[[ctx.params.id]]);});
router.get('/:id/roles/', async (ctx)=>{ await UserService.readContent(ctx,[`SELECT * FROM appUserRoles where userid = ?`],[[ctx.params.id]]);});
router.get('/:id/submissions/', async (ctx)=>{ await UserService.readContent(ctx,[`SELECT * FROM appSubmissions where userid = ?`],[[ctx.params.id]]);});
router.get('/:id/timeentries/', async (ctx)=>{ await UserService.readContent(ctx,[`SELECT * FROM appTimeEntries where userid = ?`],[[ctx.params.id]]);});
// add stuff (Note, anyone can add an item for anyone else technically. we aren't preventing access.)
router.post('/:id/phones/', async (ctx) => { await UserService.postContent(ctx,'phone')});
router.post('/:id/emails/', async (ctx) => { await UserService.postContent(ctx,'email')});
router.post('/:id/roles/',async (ctx) => { await UserService.postContent(ctx,'role')});
router.post('/:id/submissions/', async (ctx) => { await UserService.postContent(ctx,'submission')});
router.post('/:id/', UserService.editUser);

export default router;