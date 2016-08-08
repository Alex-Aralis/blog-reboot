import mongoose from 'mongoose';
import { connection as db } from 'mongoose';
require('dotenv').load();


mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost/blogreboot');

export const connectAsync = new Promise((resolve, reject) => {
  db.on('error', err => {
    reject(err);
  });
  db.once('open', () => {
    resolve(db);
  });
});

export const connectSync = async () => await connectAsync;

import * as m from './models';
import * as s from './schemas';

export const Models = m;
export const Schemas = s;
