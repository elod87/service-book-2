const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const { User } = require('../models/user');
const config = require('config');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

passport.use(new GoogleStrategy({
        clientID: config.get('googleId'),
        clientSecret: config.get('googleSecret'),
        callbackURL: '/auth/google/redirect'
    }, async (accesToken, refreshToken, profile, done) => {    
        let user;        
        user = await User.findOne({ googleId: profile.id });
        if (!user) {
            const thumbnail = profile._json && profile._json.picture ? profile._json.picture : '';
            user = await new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                thumbnail: thumbnail
            }).save();

            user.sendForApproval();
        }

        done(null, user);
    })
);  



