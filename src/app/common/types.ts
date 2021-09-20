import {Client} from 'discord.js';
import { Pool } from 'mysql2/promise';

// global object, like a configuration object.
export interface GlobalConfig {
    headers: any;
    dbPool: Pool;
    db: {
      connection: any;
      query: (query: string, pdo?: any) => any;
    };
    discord: Client;
    jwtConfig: any;
  }



// all responses use a data Handle to retrieve information.
// both data and err must be provided. msg can hold anything, but commonly holds err information.
export interface Handle<T> {
    data: T | null,
    err: boolean,
    msg?: string | Error
}

export const HandleDefault: Handle<any> = {
    data: {},
    err: false,
    msg:''
};

// what the front end gets when the individual logs in
export interface User {
    id?: number,
    username?: string,
    hashedpassword?: string,
    firstname?: string,
    lastname?: string,
    classroomemail?: string,
    primaryemail?: string,
    clockifyemail?: string,
    primaryphone?:string,
    discordid?: string,
    fcclink?: string,
    dateCreated?: string,
    dateUpdated?: string,
    roleId?: number,
    active?: boolean
};

export interface Phone {
  id?: number,
  userid?: number,
  phone?: string,
  typename?: string
};

export interface Email {
  id?: number,
  userid?: number,
  email?: string,
  typename?: string
};

export interface Roles {
  id?: number,
  userid?:number,
  roleid?:number,
  cohortid?:number
};

export interface Submission {
  id?: number,
  userid?: number,
  assignmentid?: number,
  text?: string,
  grade?: number,
  pass?: boolean
}
