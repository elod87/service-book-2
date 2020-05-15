const router = require('express').Router();
const passport = require('passport');
const config = require('config');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

//classic login with user and password
router.post('/', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send('Invalid email or password');
    
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');
    
    if (!user.isApproved) {
        return res.status(400).send('Your account was not approved yet');
    }
    
    const { token, refreshToken } = user.generateAuthToken();
    
    user.refreshTokens.push(refreshToken);
    await user.save();
    
    const refreshTokenDecoded = jwt.decode(refreshToken);
    res.cookie('refreshToken', refreshToken, { expires: new Date(refreshTokenDecoded.exp * 1000), httpOnly: true });
        
    res.send({ token, user: user.getUserInfoObj() });
});

//validate user logged in with google
router.get('/validate', async (req, res) => {
    const googleToken = req.header('x-auth-token');
    if (!googleToken) return res.status(401).send('Access denied. No token provided');
    let userId;
    try {
        const decoded = jwt.verify(googleToken, config.get('jwtGoogleLoginTokenKey'));
        userId = decoded.id;
    } catch(ex) {
        return res.status(400).send(`Invalid token. (${ex.message})`);
    }

    const user = await User.findOne({ _id: userId });
    if (!user) return res.status(400).send('User not found');    
    
    if (!user.isApproved) {
        return res.status(400).send('Your account is waiting for approval. You will receive a notification mail when account is activated.');
    }
    
    const { token, refreshToken } = user.generateAuthToken();
    
    user.refreshTokens.push(refreshToken);
    await user.save();
    
    const refreshTokenDecoded = jwt.decode(refreshToken);
    res.cookie('refreshToken', refreshToken, { expires: new Date(refreshTokenDecoded.exp * 1000), httpOnly: true });
        
    res.send({ token, user: user.getUserInfoObj() });
});

//auth with google
router.get('/google', passport.authenticate('google', {
    scope:['profile', 'email']
}));

//callback route for google
router.get('/google/redirect', passport.authenticate('google'), (req, res) => {   
    var user = req.user;
    var googleToken = user.generateGoogleLoginToken();
    
    res.redirect(`${config.get('clientURL')}/validate/${googleToken}`);
});

module.exports = router;