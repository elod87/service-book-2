const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const config = require('config');
const Schema = mongoose.Schema;
const mailSend = require('../startup/mail');

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        default: '',
        maxlength: 100
    },
    password: {
        type: String,
        default: '',
        maxlength: 1024
    },
    googleId: {
        type: String,
        default: ''
    },
    thumbnail: {
        type: String,
        default: ''
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    isValidMail: {
        type: Boolean,
        default: false
    },
    refreshTokens: [String],
    passwordResetTokens: [String]
});

/* 
generate tokens used in classic login
token - session token used in api calls when interacting with the app, expires in 15 minutes
refresh token - allows getting new session token for keeping users logged in, expires in 2 months 
*/
userSchema.methods.generateAuthToken = function () {
    //refresh token
    const refreshToken = jwt.sign({ id: this._id }, config.get('jwtRefreshTokenKey'), {
        expiresIn: 60 * 60 * 24 * 30 * 2 //2 months
    });

    //session token
    const token = jwt.sign({ id: this._id }, config.get('jwtPrivateKey'), {
        expiresIn: 60 * 15 //15 minutes
    });

    return {
        token,
        refreshToken
    }
}

/*
generate google login token
- generates a temporary token which can be used for user validation after successful google login
- token expires in 60 seconds
*/
userSchema.methods.generateGoogleLoginToken = function () {
    const googleToken = jwt.sign({ id: this._id }, config.get('jwtGoogleLoginTokenKey'), {
        expiresIn: 60 //60 seconds
    });

    return googleToken;
}

/* 
generate password reset token 
- used in the link which is sent to the user who wants to reset forgotten password
- token can be used only once 
*/
userSchema.methods.generatePasswordResetToken = function () {
    const resetToken = jwt.sign({ id: this._id }, config.get('jwtResetPasswordTokenKey'));

    return resetToken;
}

/* generate new user mail activation token 
- used in the link which is sent to the user for validating mail address during registration 
- token expires in 60 minutes
*/
userSchema.methods.generateMailActivationToken = function () {
    const mailToken = jwt.sign({ id: this._id }, config.get('jwtMailActivateTokenKey'), {
        expiresIn: 60 * 60 //expires in 60 minutes
    });

    return mailToken;
}

/* generate admin user approve token 
- used in the link which is sent to the admins for approving new user or revoking rights 
*/
userSchema.methods.generateApproveUserToken = function () {
    const approveToken = jwt.sign({ id: this._id }, config.get('jwtApproveUserTokenKey'));

    return approveToken;
}

// user information returned to the client
userSchema.methods.getUserInfoObj = function() {
    return {
        _id: this._id,
        name: this.name,
        email: this.email,
        isGoogleAccount: this.googleId !== '',
        thumbnail: this.thumbnail
    }
}

// send mail to user - validating email address after registration
userSchema.methods.sendMailValidation = function () {
    //send confirmation mail
    mailSend({
        to: this.email,
        subject: 'Service Book registration - validate email',
        bodyHtml: `<div>Hi ${this.name}, validate your email by clicking the link below</div>
        <a href="${config.get('endpointURL')}/users/validate/${this.generateMailActivationToken()} "target="_blank">Activate account</a>`
    });
}

// send mail to admin - approve or revoke user account
userSchema.methods.sendForApproval = function () {
    const token = this.generateApproveUserToken();
    //send mail to admins for new user approval
    mailSend({
        to: config.get('apiMail'),
        subject: 'Service Book new user - approval',
        bodyHtml: `<div>New user login</div>
        <p>Name: ${this.name}</p>
        <p>Mail: ${this.email}</p>
        <p>Is from google: ${this.googleId == '' ?  'NO' : 'YES'}</p>
        <a href="${config.get('endpointURL')}/users/approve/${token}/1" target="_blank">Approve</a>
        <a href="${config.get('endpointURL')}/users/approve/${token}/0" target="_blank">Deny</a>`
    });
}

const User = mongoose.model('User', userSchema);

function validateUser(user) {
    const schema = {
        name: Joi.string().min(3).max(50).required(),
        email: Joi.string().max(100).email(),
        password: Joi.string().max(1024)
    }

    return Joi.validate(user, schema);
}

module.exports.User = User;
module.exports.validate = validateUser;