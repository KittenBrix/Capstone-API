import request = require('supertest');
import app from './app';
import {DatabaseService} from './services/db.service'; // used for checking DB content for submission/deletion tests.
import {AuthService} from './services/auth.service'; // extract jwt values.




test('Hello world works', async () => {
    const response = await request(app.callback()).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('OK');
});

test('guest account actions', async () => {
    // expect failure
    let response = await (await request(app.callback()).post('/auth').send({username:'gstudent',password:"badpassword"})).body;
    expect(response.data).toBe(500); // since it's bad result.
    expect(response.msg).toBe('user not found');
    expect(response.status).toBe(404);
    // expect successful log ins.
    const student: any = await login({username:'gstudent',password:'password'});
    const teacher: any = await login({username:'gteacher',password:'password'});
    const admin: any = await login({username:'gadmin',password:'password'});
    expect(+student.roleid).toBe(1);
    expect(+teacher.roleid).toBe(3);
    expect(+admin.roleid).toBe(5);
    // Call some more specific tests using each type of user.

    // Have Student view roster for their cohort. 
    
    // Have student view roster for a cohort they aren't in. expect failure.

    // Have student view roster for non-existent cohort. expect failure for same reason as above.

    // Have teacher view rosters

    // Have admin view rosters.

    // student attempt to submit an assignment. expect failure

    // teacher attempt to submit assingment for student. expect failure.

    // admin attempt to submit assignment for student. expect failure.

    // admin attempt to alter assignment conditions. expect failure.

});

test('test account actions', async () => {
    // expect successful log ins.
    const student: any = await login({username:'tstudent',password:'password'});
    const teacher: any = await login({username:'tteacher',password:'password'});
    const admin: any = await login({username:'tadmin',password:'password'});
    expect(+student.roleid).toBe(2);
    expect(+teacher.roleid).toBe(4);
    expect(+admin.roleid).toBe(6);
    // Call some more specific tests using each type of user.

    // Have Student view roster for their cohort. expect success
    
    // Have student view roster for a cohort they aren't in. expect failure.

    // Have student view roster for non-existent cohort. expect failure for same reason as above.

    // Have teacher view rosters

    // Have admin view rosters.

    // student attempt to submit an assignment. expect success

    // teacher attempt to submit assingment for student. expect success.

    // teacher attempt to submit assignment for student not in their cohort. expect failure.

    // admin attempt to submit assignment for student. expect failure if not teacher for cohort.

    // admin attempt to submit assignment for student not in cohort admin is teaching. expect failure.

    // admin attempt to delete assignment for student in previous two tests. expect success.

    // admin attempt to alter assignment conditions. expect success.

    // admin add assignment to module. expect success.

    // admin delete assignment from module. expect success.

});

// check logins, return token content.
async function login(content:any): Promise<any>{
    let response = await (await request(app.callback()).post('/auth').send(content)).body;
    expect(response.token).toBeDefined();
    let user: any = await AuthService.authenticate(response.token);
    // read this content. expecting a valid object.
    expect(!user).toBeFalsy();
    // read jwt content. expect username matching submitted name.
    expect(user.username).toBe(content.username);
    user.token=response.token;
    return user;
}