import * as Router from 'koa-router';
import { UserService } from '../services/user.service';


const routerOptions: Router.IRouterOptions = {
    prefix: '/user',
};

const router: Router = new Router(routerOptions);

// get stuff
// router.get('/', UserService.);

// add stuff
// router.post('/', UserService.);

// delete stuff
// router.delete('/', UserService.);

export default router;