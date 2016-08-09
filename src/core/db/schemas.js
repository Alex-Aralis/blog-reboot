import { Schema as schema } from 'mongoose';

const _UserSchema = schema({
  provider: {
    name: {
      type: String,
      enum: ['google', 'facebook', 'local'],
      required: [true, 'User must have a provider.name'],
    },
    id: {
      type: String,
      required: [true, 'User must have a provider.id'],
    },
  },
  displayName: String,
  name: {
    givenName: String,
    familyName: String,
  },
  email: {
    type: String,
    // eslint-disable-next-line
    match: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  },
  imageURL: String,
  language: String,
});

_UserSchema.virtual('name.full').get(
  function getNameFull() {
    return `${this.name.givenName} ${this.name.familyName}`;
  }
);

_UserSchema.virtual('name.full').set(
  function setNameFull(name) {
    const split = name.split(' ');

    this.name.givenName = split[0];
    this.name.familyName = split[1];
  }
);

_UserSchema.set('toObject', { virtuals: true });

if (!_UserSchema.options.toObject) _UserSchema.options.toObject = {};

_UserSchema.options.toObject.transform = (doc, ret) => {
  const _ret = { ...ret };

  delete _ret.__v;
  delete _ret._id;

  return _ret;
};

export const UserSchema = _UserSchema;
