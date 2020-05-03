const router = require('express').Router();
const passport = require('passport');
const config = require('config');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
const { User } = require('../models/user');

//login with user and password
router.post('/', async (req, res) => {
    let user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send('Invalid email or password');

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    if (!user.isApproved) {
        return res.status(400).send('Your account was not approved yet');
    }

    const token = user.generateAuthToken();
    user.set('password', undefined, {strict: false} );
    res.send({ token, user });
});

//auth with google
router.get('/google', passport.authenticate('google', {
    scope:['profile', 'email']
}));

//callback route for google
router.get('/google/redirect', passport.authenticate('google'), (req, res) => {
    var user = req.user;
    var token = user.generateAuthToken();
    
    res.redirect(`${config.get('clientURL')}/${user._id}/${token}`);
});

module.exports = router;