const router = require('express').Router();
const config = require('config');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, validate } = require('../models/user');
const auth = require('../middleware/auth');
const mailSend = require('../startup/mail');
const validateObjectId = require('../middleware/validateObjectId');


//verify current user
router.get('/me', auth, async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');
    res.send(user);
})

//register new user
router.post('/', async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).send('User already registered');

    user = new User(_.pick(req.body, ['name', 'email', 'password']));

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    await user.save();

    const token = user.generateAuthToken();

    res.header('x-auth-token', token).send(_.pick(user, ['_id', 'name', 'email']));

    user.sendMailValidation();
    user.sendForApproval();
});


//update user
router.put('/:id', [auth, validateObjectId], async (req, res) => {    
    const user = await User.findByIdAndUpdate(req.params.id, {
        name: req.body.name
    }, {
        new: true
    });

    if (!user) return res.status(404).send('User not found');
 
    res.send(user);
});

//forgot password
router.post('/forgotpassword', async (req, res) => {
    const email = req.body.email;

    const user = await User.findOne({ email });
    if (user) {
        mailSend({
            to: email,
            subject: 'Service Book reset password',
            bodyHtml: `<div>Hi ${user.name}, you can reset your password accessing the following link:</div>
            <a href="${config.get('clientURL')}/reset-password/${user._id}/${user.generateAuthToken()}" target="_blank">Reset password</a>`
        });

        res.send('Mail sent');
    } else {
        res.send('No user registered with this email address');
    }
});

//reset password - initialized by forgot password
router.post('/resetpassword', auth, async (req, res) => {
    const { password } = req.body;

    const user = await User.findById(req.user._id);
    if (user) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        res.send('Password was successfully reset');
    } else {
        res.status(400).send('User not found');
    }
});

//change password
router.post('/changepassword', auth, async (req, res) => {
    const { currentPassword, password } = req.body;

    const user = await User.findById(req.user._id);
    if (user) {
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) return res.status(401).send('Password incorrect');

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        res.send('Password was successfully reset');
    } else {
        res.status(400).send('User not found');
    }
});


//validate email address
router.get('/validate/:userId/:token', async (req, res) => {
    const userId = req.params.userId;
    const token = req.params.token;

    if (!token) return res.status(401).send('Access denied. No token provided');
    try {
        jwt.verify(token, config.get('jwtPrivateKey'));

        const user = await User.findOne({ _id: userId });
        if (user) {
            user.isValidMail = true;
            await user.save();

            res.send('validated')
        } else {
            throw new Error('Invalid user');
        }


    } catch (ex) {
        res.status(400).send('Invalid user or token.');
    }
});

//approve new user
router.get('/approve/:userId/:token/:approved', async (req, res) => {
    const userId = req.params.userId;
    const token = req.params.token;
    const approved = req.params.approved == 1;

    if (!token) return res.status(401).send('Access denied. No token provided');
    try {
        jwt.verify(token, config.get('jwtPrivateKey'));

        const user = await User.findOne({ _id: userId });
        if (user) {
            user.isApproved = approved;
            await user.save();

            if (approved) {
                res.send('user access granted');
                mailSend({
                    to: user.email,
                    subject: 'Service Book registration approved',
                    bodyHtml: `<div>Hi ${user.name}, your Service Book registration was approved, log in to your account</div>`
                });
            } else {
                res.send('user access revoked');
                mailSend({
                    to: user.email,
                    subject: 'Service Book account suspended',
                    bodyHtml: `<div>Hi ${user.name}, your Service Book account was suspended</div>`
                });
            }
        } else {
            throw new Error('Invalid user');
        }

    } catch (ex) {
        res.status(400).send('Invalid user or token.');
    }
});


module.exports = router;