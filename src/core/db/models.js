import { UserSchema } from './schemas';
import mongoose from 'mongoose';

export const User = mongoose.model('User', UserSchema);
