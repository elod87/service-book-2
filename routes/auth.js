const router = require('express').Router();
const passport = require('passport');
const config = require('config');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

//classic login with user and password OR getting token automatically when refreshToken is set
router.post('/', async (req, res) => {
    let user;
    let token;
    let refreshToken;  
    let autoLogin = false;
    if (!req.body.email && !req.body.password) {
        //try auto login based on refreshToken when no email and password is present
        autoLogin = true;
        const cookie = req.cookies;
        if (req.cookies && req.cookies.refreshToken) {
            refreshToken = req.cookies.refreshToken;
            try {
                const decoded = jwt.verify(refreshToken, config.get('jwtRefreshTokenKey'));
                const userId = decoded.id;
                user = await User.findOne({ _id: userId, refreshTokens: refreshToken});
                
                if (!user) {
                    return res.status(400).send(`Invalid token.`);
                }
            } catch(ex) {
                return res.status(400).send(`Invalid token. (${ex.message})`);
            }
        } else {
            return res.status(400).send(`No token.`);
        }
    } else {
        user = await User.findOne({ email: req.body.email });        
        if (!user) return res.status(400).send('Invalid email or password');
        
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) return res.status(400).send('Invalid email or password');
    }
        
    if (!user.isApproved) {
        return res.status(400).send('Your account was not approved yet');
    }
    
    
    if (!autoLogin) {
        ({ token, refreshToken } = user.generateAuthToken())
        
        user.refreshTokens.push(refreshToken);
        await user.save();
        
        const refreshTokenDecoded = jwt.decode(refreshToken);
        res.cookie('refreshToken', refreshToken, { expires: new Date(refreshTokenDecoded.exp * 1000), httpOnly: true });
    } else {
        ({ token } = user.generateAuthToken())
    }
    
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

//logout - delete refresh token assigned to user
router.get('/logout', async (req, res) => {
    const cookie = req.cookies;
    if (req.cookies && req.cookies.refreshToken) {
        refreshToken = req.cookies.refreshToken;
        try {
            const decoded = jwt.verify(refreshToken, config.get('jwtRefreshTokenKey'));
            const userId = decoded.id;
            user = await User.findOne({ _id: userId, refreshTokens: refreshToken});
            
            if (!user) {
                return res.status(400).send(`Invalid token.`);
            }
            
            user.refreshTokens.pull(refreshToken);
            await user.save();

            //set cookie expired
            res.cookie('refreshToken', refreshToken, { expires: new Date(0), httpOnly: true });
            return res.send('OK');
        } catch(ex) {
            return res.status(400).send(`Invalid token. (${ex.message})`);
        }
    } else {
        return res.status(400).send(`Invalid token.`);
    }
});

module.exports = router;