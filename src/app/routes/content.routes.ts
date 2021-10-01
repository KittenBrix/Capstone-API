import * as Router from 'koa-router';
import { hasAdminAccess, isGuestUser } from '../common/middleware';
import { ContentService } from '../services/content.service';
import { DatabaseService } from '../services/db.service';


const routerOptions: Router.IRouterOptions = {};
const router: Router = new Router(routerOptions);

// deletes for anything user related.
router.del('/phones/:itemid', async (ctx) => {ctx.body = await ContentService.deleteContent(ctx,'appUserPhones')});
router.del('/roles/:itemid', async (ctx) => {ctx.body = await ContentService.deleteContent(ctx,'appUserRoles')});
router.del('/emails/:itemid', async (ctx) => {ctx.body = await ContentService.deleteContent(ctx,'appUserEmails')});
router.del('/submissions/:itemid', async (ctx) => {ctx.body = await ContentService.deleteContent(ctx,'appSubmissions')});
// now stuff for categories.
router.get('/categories/', async (ctx) => {ctx.body = await DatabaseService.execute(`SELECT * from appAssignmentCategory`,undefined)});
router.get('/categories/:id', async (ctx) => {ctx.body = await DatabaseService.execute(`SELECT * from appAssignmentCategory where id = ?`,[ctx.params.id])});
router.get('/categories/:id/assignments/', async (ctx) => {ctx.body = await DatabaseService.execute(`SELECT * from appAssignments where moduleid = ? AND inactive = false`,[ctx.params.id])});
// router.post('/categories/', async (ctx) => {
//     if (hasAdminAccess(ctx) && !isGuestUser(ctx)){
//         const keys = [];
//         const values = [];
//         const Qs = [];
//         for (const key of Object.keys(ctx.request.body)){
//             keys.push(key);
//             values.push((<any>ctx.request.body)[key]);
//             Qs.push('?');
//         }
//         ctx.body = await DatabaseService.execute(`INSERT into appAssignmentCategory (${Qs.join(', ')}) VALUES (${Qs.join(', ')})`,[...keys, ...values]);
//     }
//     throw new Error("user does not have permission to post or alter categories.");
// });
// router.post('/assignments/categories/:id', async (ctx) => {
//     if (hasAdminAccess(ctx) && !isGuestUser(ctx)){
//         const sets = [];
//         const values = [];
//         for (const key of Object.keys(ctx.request.body)){
//             sets.push(`${key} = ?`)
//             values.push((<any>ctx.request.body)[key]);
//         }
//         ctx.body = await DatabaseService.execute(`UPDATE appAssignmentCategory set ${sets.join(', ')} where id = ?`,[...values, ctx.params.id]);
//     }
//     throw new Error("user does not have permission to post or alter categories.");
// });
// router.delete('/assignments/categories/:id', async (ctx) => {
//     if (hasAdminAccess(ctx) && !isGuestUser(ctx)){
//         ctx.body = await DatabaseService.execute(`DELETE FROM appAssignmentCategory where id = ?`, [ctx.params.id]);
//     }
//     throw new Error('User does not have delete permissions on categories');
// });
// now stuff for assignments themselves.
router.get('/assignments/', async (ctx) => {ctx.body = await DatabaseService.execute(`SELECT * from appAssignments where inactive = false`,undefined)});
router.get('/assignments/:id', async (ctx) => {ctx.body = await DatabaseService.execute(`SELECT * from appAssignments where id = ?`,[ctx.params.id])});
// router.post('/assignments/', async (ctx) => {
//     if (hasAdminAccess(ctx) && !isGuestUser(ctx)){
//         const keys = [];
//         const values = [];
//         const Qs = [];
//         for (const key of Object.keys(ctx.request.body)){
//             keys.push(key);
//             values.push((<any>ctx.request.body)[key]);
//             Qs.push('?');
//         }
//         ctx.body = await DatabaseService.execute(`INSERT into appAssignments (${Qs.join(', ')}) VALUES (${Qs.join(', ')})`,[...keys, ...values]);
//     }
//     throw new Error("user does not have permission to post or alter assignments.");
// });
// router.post('/assignments/:id', async (ctx) => {
//     if (hasAdminAccess(ctx) && !isGuestUser(ctx)){
//         const sets = [];
//         const values = [];
//         for (const key of Object.keys(ctx.request.body)){
//             sets.push(`${key} = ?`)
//             values.push((<any>ctx.request.body)[key]);
//         }
//         ctx.body = await DatabaseService.execute(`UPDATE appAssignments set ${sets.join(', ')} where id = ?`,[...values, ctx.params.id]);
//     }
//     throw new Error("user does not have permission to post or alter assignments.");
// });
// router.delete('/assignments/:id', async (ctx) => {
//     if (hasAdminAccess(ctx) && !isGuestUser(ctx)){
//         ctx.body = await DatabaseService.execute(`DELETE FROM appAssignmentCategory where id = ?`, [ctx.params.id]);
//     }
//     throw new Error('User does not have delete permissions on assignments');
// });
// submissions are different, deleteContent handled deletions, but we need reading and posting
router.get('/submissions/user/:id', ContentService.getUserSubmissions);
router.post('/submissions/', ContentService.createUserSubmission);

// but lets look at the cohort view, which can have people viewed, assignments (view by category), schedule, and time entries
router.get('/cohorts/', ContentService.getCohorts)
router.get('/cohorts/:cohortid/people/', ContentService.getCohortPeople);
router.get('/cohorts/:cohortid/category/:category/submissions', ContentService.getCohortCategorySubmissions);
router.get('/cohorts/:cohortid/schedule', ContentService.getCohortSchedule);
router.get('/cohorts/:cohortid/timeEntries/', ContentService.getCohortTimeSheets);
// assignments in a course
router.post('/assignments/', async (ctx) => {
    if ((await hasAdminAccess(ctx)) && !(await isGuestUser(ctx))){
        const keys = [];
        const values = [];
        const Qs = [];
        for (const key of Object.keys(ctx.request.body)){
            keys.push(key);
            values.push((<any>ctx.request.body)[key]);
            Qs.push('?');
        }
        const SQL = `INSERT into appAssignments (${keys.join(', ')}) VALUES (${Qs.join(', ')})`;
        try {
        ctx.body = await DatabaseService.execute(SQL,values);
        } catch (err){
            console.log(err);
            console.log(err.message);
        }
    } else {
        throw new Error("user does not have permission to post or alter assignments.");
    }
});
router.post('/assignments/:id', async (ctx) => {
    const admin1 = await hasAdminAccess(ctx);
    const admin2 = await isGuestUser(ctx);
    if (admin1 && !admin2){
        const sets = [];
        const values = [];
        for (const key of Object.keys(ctx.request.body)){
            sets.push(`${key} = ?`)
            values.push((<any>ctx.request.body)[key]);
        }
        ctx.body = await DatabaseService.execute(`UPDATE appAssignments set ${sets.join(', ')} where id = ?`,[...values, ctx.params.id]);
    }else{
        throw new Error("user does not have permission to post or alter this assignment.");
    }
});
router.delete('/assignments/:id', async (ctx) => {
    if ((await hasAdminAccess(ctx)) && !(await isGuestUser(ctx))){
        ctx.body = await DatabaseService.execute(`UPDATE appAssignments set inactive = true where id = ?`, [ctx.params.id]);
    } else {
        throw new Error('User does not have delete permissions on assignments');
    }
});
export default router;
