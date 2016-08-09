/**
 * React Starter Kit (https://www.reactstarterkit.com/)
 *
 * Copyright © 2014-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

/**
 * Passport.js reference implementation.
 * The database schema used in this sample is available at
 * https://github.com/membership/membership.db/tree/master/postgres
 */

import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from './db';
import { auth as config } from '../config';
import { User } from './db/models';
/*
 * Sign in with Google
*/

passport.use(new GoogleStrategy(
  {
    ...config.google,
    callbackURL: '/login/google/return',
  },
  async (accessToken, refreshToken, originalProfile, done) => {
   /*
    * I'm not sure why I'm getting back an array with types for emails
    * addresses, however I'm afraid of new things so I'm removing
    * all the types I have not seen before.  Which is all but
    * account.
    */
    let emails = originalProfile.emails
      .filter(
        email => email.type === 'account'
      );

    // only keep the acctual email addresses.
    emails = emails.map(email => email.value);

    const profile = {
      ...originalProfile,
      provider: {
        name: originalProfile.provider,
        id: originalProfile.id,
      },

      // only keep the first one because I only want one.
      email: emails && emails.length && emails[0],
      imageURL: originalProfile._json.image.url,
      language: originalProfile._json.language,
    };

    const user = await User.findOne({
      'provider.name': profile.provider.name,
      'provider.id': profile.provider.id,
    });

    // user was found in db
    if (user) {
      done(null, user.toObject());

    // user was not found in db
    } else {
      const newUser = new User({
        ...profile,
      });

      await newUser.save();

      done(null, newUser.toObject());
    }
  }
));

/**
 * Sign in with Facebook.
 */

passport.use(new FacebookStrategy({
  clientID: config.facebook.id,
  clientSecret: config.facebook.secret,
  callbackURL: '/login/facebook/return',
  profileFields: ['name', 'email', 'link', 'locale', 'timezone'],
  passReqToCallback: true,
}, (req, accessToken, refreshToken, profile, done) => {
  const loginName = 'facebook';
  db.connect(async ({ query }) => {
    if (req.user) {
      let result = await query(
        'SELECT 1 FROM user_login WHERE name = $1 AND key = $2',
        loginName, profile.id
      );
      if (result.rowCount) {
        // There is already a Facebook account that belongs to you.
        // Sign in with that account or delete it, then link it with your current account.
        done();
      } else {
        await query(`
          INSERT INTO user_account (id, email) SELECT $1, $2::character
            WHERE NOT EXISTS (SELECT 1 FROM user_account WHERE id = $1);`,
          req.user.id, profile._json.email);
        await query(`
          INSERT INTO user_login (user_id, name, key) VALUES ($1, 'facebook', $2);`,
          req.user.id, profile.id);
        await query(`
          INSERT INTO user_claim (user_id, type, value) VALUES
            ($1, 'urn:facebook:access_token', $3);`,
          req.user.id, profile.id);
        await query(`
          INSERT INTO user_profile (user_id) SELECT $1
            WHERE NOT EXISTS (SELECT 1 FROM user_profile WHERE user_id = $1);`,
          req.user.id);
        await query(`
          UPDATE user_profile SET
            display_name = COALESCE(NULLIF(display_name, ''), $2),
            gender       = COALESCE(NULLIF(gender, ''), $3),
            picture      = COALESCE(NULLIF(picture, ''), $4),
          WHERE user_id = $1;`,
          req.user.id, profile.displayName, profile._json.gender,
          `https://graph.facebook.com/${profile.id}/picture?type=large`);
        result = await query(`
          SELECT id, email FROM user_account WHERE id = $1;`,
          req.user.id);
        done(null, result.rows[0]);
      }
    } else {
      let result = await query(`
        SELECT u.id, u.email FROM user_account AS u
          LEFT JOIN user_login AS l ON l.user_id = u.id
        WHERE l.name = $1 AND l.key = $2`, loginName, profile.id);
      if (result.rowCount) {
        done(null, result.rows[0]);
      } else {
        result = await query('SELECT 1 FROM user_account WHERE email = $1', profile._json.email);
        if (result.rowCount) {
          // There is already an account using this email address. Sign in to
          // that account and link it with Facebook manually from Account Settings.
          done(null);
        } else {
          result = await query(`
            INSERT INTO user_account (email) VALUES ($1) RETURNING (id)`,
            profile._json.email
          );
          const userId = result.rows[0].id;
          await query(`
            INSERT INTO user_login (user_id, name, key) VALUES ($1, 'facebook', $2)`,
            userId, profile.id);
          await query(`
            INSERT INTO user_claim (user_id, type, value) VALUES
              ($1, 'urn:facebook:access_token', $2);`,
            userId, accessToken);
          await query(`
            INSERT INTO user_profile (user_id, display_name, gender, picture)
            VALUES ($1, $2, $3, $4);`,
            userId, profile.displayName, profile._json.gender,
            `https://graph.facebook.com/${profile.id}/picture?type=large`
          );
          result = await query('SELECT id, email FROM user_account WHERE id = $1;', userId);
          done(null, result.rows[0]);
        }
      }
    }
  }).catch(done);
}));

export default passport;
