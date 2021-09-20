import { DatabaseService } from './app/services/db.service';
import { uuid } from 'uuidv4';
import * as bcrypt from 'bcrypt';
import moment = require('moment');

async function main() {
    console.log('hello');
    // await createFakeTimeEntries();
    console.log('bye');
    
}


async function createFakeUsers() {
    // create an amount of fake users with randomized names and things.
    const names = [
    "Rudy Davidson",
    "Billy Saunders",
    "Jody Ward",
    "Brice Richardson",
    "Casey Moss",
    "Leigh Rutledge",
    "Kiran Dennis",
    "Danni Short",
    "Kai Mckay",
    "Kris Newman",
    "Frederick Khan",
    "Brandon Evans",
    "Toby Carter",
    "Sam Murphy",
    "Harvey Jordan",
    "Edward Ferrell",
    "Malakai Goodman",
    "Holden Vincent",
    "Emmett Conley",
    "Edwin Morton",
    "Kris Robertson",
    "Rudy Murphy",
    "Sammy Davis",
    "Silver Turner",
    "Casey Woods",
    "Willy Odom",
    "Sam Cortez",
    "Taylor Cooley",
    "Sammy Fowler",
    "Charlie French",
    "Daniel Parry",
    "Ollie Elliott",
    "Leo Burton",
    "Adam Anderson",
    "Tom Grant",
    "Ryan Perkins",
    "Maxim Dillon",
    "Quentin Marsh",
    "Jesse Morrison",
    "Bodhi Ramsey",
    "Ellie Green",
    "Sarah Parry",
    "Faith Newman",
    "Emma Poole",
    "Imogen Brooks",
    "Felicity Rowland",
    "Viviana Rios",
    "Cassandra Cantrell",
    "Talia Eaton",
    "Aylin Alford",
    "Sammy Phillips",
    "Mell Johnson",
    "Tyler Fisher",
    "Nicky Francis",
    "Bret Wallace",
    "Dane Nash",
    "Ray Fischer",
    "Sammy Smith",
    "Bailey Robinson",
    "Kerry Gallagher"
    ]
    const extras = [
        "Guest Student",
        "Test Student",
        "Guest Teacher",
        "Test Teacher",
        "Guest Admin",
        "Test Admin",
        "View Owner",
        "Test Owner"
    ];
    const VALUES = [];
    const items = [];
    const hash = bcrypt.hashSync('password',10);
    for (const index in extras){
        const full = extras[index];
        const role = +index + 1;
        const [f, l] = full.split(' ');
        const un = `${f[0]}${l}`.toLowerCase();
        VALUES.push( `(?,?,?,?,?,?)`);
        items.push(un,hash,f,l,role,true);
    }
    const SQL = `INSERT INTO appUsers (username, hashedpassword,firstname,lastname,roleId,active) VALUES ${VALUES.join(', ')}`;
    const result = await DatabaseService.execute(SQL, items);
}

async function createFakeUserRoles(){
    const {data} = await DatabaseService.execute(`SELECT * from appUsers where id > 131`, undefined);
    const {data: cohorts} = await DatabaseService.execute(`SELECT id from appCohorts`,undefined);
    for (const index in data){
        const user = data[index];
        const SQL = `INSERT into appUserRoles (userid, roleid, cohortid) values (?,?,?)`
        await DatabaseService.execute(SQL,[user.id, +index+1, cohorts[Math.floor(Math.random()*cohorts.length)].id]);
    }
}

async function createFakeSubmissions(){
    const {data: users} = await DatabaseService.execute(`SELECT * from appUsers where roleid <= 2`,undefined);
    const {data: assignments} = await DatabaseService.execute(`SELECT * from appAssignments`,undefined);
    for (const user of users){
        // all users are students. must be submitting work.
        const completednumber = Math.floor(Math.random()*assignments.length*.5 + 1);
        const completeIDs: any[] = [];
        for (let i = 0; i < completednumber; i++){
            const assignmentid = Math.floor(Math.random()*assignments.length);
            if (!completeIDs.includes(assignmentid)){
                let grade = null;
                let pass = null;
                if (Math.random() >= 0.45){
                    grade = Math.floor(Math.random()*35 + 65.5);
                }
                if (grade){
                    pass = (grade >= 70) ? true: false;
                }
                await DatabaseService.execute(`INSERT INTO appSubmissions (userid, assignmentid, text, grade, pass) VALUES (?,?,?,?,?)`,
                [user.id, assignmentid,"[REDACTED CONTENT] https://github.com/KittenBrix",grade,pass]);
                completeIDs.push(assignmentid);
            }
        }
    }
}

async function createFakeSchedules() {
    // made class schedule twice weekly.
    // made office hours biweekly on same days.
    const cohort = 216;
    const description = `Tuesday Lecture for ${cohort}`;
    // YYYY-MM-DD hh:mm:ss
    const start1 = "2021-04-08 17:30:00";
    const repeats = 7;  //every 7 days.
    const duration = 2.0; //lasts 2 hours;
    const SQL = `INSERT INTO appCohortSchedules (cohortid, start, repeats, description, duration) VALUES (?,?,?,?,?)`;
    await DatabaseService.execute(SQL,[cohort,start1,repeats,description,duration]);
}

async function createFakeTimeEntries() {
    const {data: users} = await DatabaseService.execute(`SELECT * from appUsers where roleid <= 4`,undefined);
    for (const user of users){
        const today = moment();
        const {data:roles} = await DatabaseService.execute(`SELECT cohortid from appUserRoles where roleid <= 4 and userid = ?`,[user.id]);
        const likelihood = Math.random()*2.0/3.0 + .25;
        const VALUES: string[] = [];
        const items: any[] = [];
        for (const course of roles){
            const {data: schedule} = await DatabaseService.execute(`SELECT * from appCohortSchedules where cohortid = ?`,[course.cohortid]);
            // console.log(schedule);
            for (const instance of schedule){
                const evaluatedDay = moment(instance.start);
                hit: while (evaluatedDay.isBefore(today)){
                    if (Math.random() <= likelihood){
                        const end = moment(evaluatedDay);
                        end.add(Number(instance.duration),'hours');
                        const startday: string = evaluatedDay.format('YYYY-MM-DD HH:mm:ss');
                        const endday: string = end.format('YYYY-MM-DD HH:mm:ss');
                        // console.log(startday, endday);
                        VALUES.push('(?,?,?,?)');
                        items.push(user.id, startday, endday, instance.description);
                    }
                    if (instance.repeats){
                        evaluatedDay.add(instance.repeats,'days');
                    } else {
                        break hit;
                    }
                }
            }
        }
        const {data:result, msg} = await DatabaseService.execute(`INSERT INTO appTimeEntries (userid, start, end, source) VALUES ${VALUES.join(', ')}`,items);
        console.log(user.username,result,msg);
    }
    console.log("doneeee");
}

async function createFakeEmails() {
    const {data: users} = await DatabaseService.execute(`SELECT * from appUsers where roleid <= 2`,undefined);
    for (const user of users){
        const email1 = `${user.username}@gmail.com`;
        const email2 = `${user.username}-recovery@gmail.com`;
        const phone1 = `209${Math.floor(Math.random()*8999999+1000000)}`;
        const phone2 = `209${Math.floor(Math.random()*8999999+1000000)}`;
        await DatabaseService.execute(`INSERT into appUserEmails (email, userid, typename) VALUES (?,?,?)`,[email1,user.id,'primary']);
        await DatabaseService.execute(`INSERT into appUserEmails (email, userid, typename) VALUES (?,?,?)`,[email2,user.id,'secondary']);
        await DatabaseService.execute(`INSERT into appUserPhones (phone, userid, typename) VALUES (?,?,?)`,[phone1,user.id,'cell']);
        await DatabaseService.execute(`INSERT into appUserPhones (phone, userid, typename) VALUES (?,?,?)`,[phone2,user.id,'alt']);

    }
}

export default main;