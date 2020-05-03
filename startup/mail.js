const config = require('config');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
    config.get('googleId'),
    config.get('googleSecret'),
    "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
    refresh_token: config.get('googleRefreshToken')
});
const accessToken = oauth2Client.getAccessToken();

const smtpTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: config.get('apiMail'),
        clientId: config.get('googleId'),
        clientSecret: config.get('googleSecret'),
        refreshToken: config.get('googleRefreshToken'),
        accessToken: accessToken
    }
});

module.exports = ({ to, subject, bodyHtml}) => {
    const mailOptions = {
        from: config.get('apiMail'),
        to: to,
        subject: subject,
        generateTextFromHTML: true,
        html: bodyHtml
    };

    smtpTransport.sendMail(mailOptions, (error, response) => {
        smtpTransport.close();
    });
};


