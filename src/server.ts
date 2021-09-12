import app from './app/app';
import * as dotenv from 'dotenv';
dotenv.config();
// Process.env will always be comprised of strings, so we typecast the port to a
// number.
const PORT:number = Number(process.env.PORT) || 3000;
app.listen(PORT);
// console.log(`jwt: ${process.env.JWT_SECRET}`);
console.log(`server listening on port ${PORT}`);