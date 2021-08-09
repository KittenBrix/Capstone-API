import * as Router from 'koa-router';
import { AuthService } from '../services/auth.service';


const routerOptions: Router.IRouterOptions = {
    prefix: '/auth',
};

const router: Router = new Router(routerOptions);

router.post('/', AuthService.getLoginToken);
router.post('/refresh', AuthService.getRefreshToken);
router.post('/register', AuthService.registerNewUser);

export default router;