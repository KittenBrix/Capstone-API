
import * as koa from 'koa';
import { Handle } from '../common/types';

export default class TimeService{
    static async createTimeEntries(userid: number):Promise<any>{
        // get user from id. take discord log, clockify list, create entries with compressed statuses.

    }
    static async getUserTimeLine(userid: number, asSingleLine:boolean):Promise<any>{
        // using TimeEntry table and fccUserCompletion, construct an in order timeline outlining events on user.
        // eg, start/stop/description/type
        // for fcc, description = category + start or end, start = date of completion, end = start.
        // If !asSingleLine, then we include everything, ordered by start time.
        // else, we compress descriptions on the islands algorithm.`
    }
}