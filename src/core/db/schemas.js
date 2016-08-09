import { Schema as schema } from 'mongoose';

export const UserSchema = schema({
  provider: String,
  dispalyName: String,
  email: String,
  id: String,
  imageURL: String,
});
