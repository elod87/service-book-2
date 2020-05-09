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
    }
});

userSchema.methods.generateAuthToken = function () {
    return jwt.sign({ _id: this._id }, config.get('jwtPrivateKey'));
}

userSchema.methods.sendMailValidation = function () {
    //send confirmation mail
    mailSend({
        to: this.email,
        subject: 'Service Book registration - validate email',
        bodyHtml: `<div>Hi ${this.name}, validate your email by clicking the link below</div>
        <a href="${config.get('endpointURL')}/users/validate/${this._id}/${this.generateAuthToken()}" target="_blank">Click here</a>`
    });
}

userSchema.methods.sendForApproval = function () {
    const token = this.generateAuthToken();
    //send mail to admins for new user approval
    mailSend({
        to: config.get('apiMail'),
        subject: 'Service Book new user - approval',
        bodyHtml: `<div>New user login</div>
        <p>Name: ${this.name}</p>
        <p>Mail: ${this.email}</p>
        <p>Is from google: ${this.googleId == '' ?  'NO' : 'YES'}</p>
        <a href="${config.get('endpointURL')}/users/approve/${this._id}/${token}/1" target="_blank">Approve</a>
        <a href="${config.get('endpointURL')}/users/approve/${this._id}/${token}/0" target="_blank">Deny</a>`
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