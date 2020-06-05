const winston = require('winston');
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const config = require('config');
const app = express();

app.use(express.static('public'));

const whitelist = [config.get('clientURL'), 'http://localhost:3000', 'http://localhost:4000'];
const corsOptions = {
  credentials: true,
  origin: function (origin, callback) {
    if (origin === undefined || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}
app.use(cors(corsOptions));

app.use(cookieParser());

//initialize passport
app.use(passport.initialize());
app.use(passport.session());

//inits
require('./startup/logging')();
require('./startup/routes')(app);
require('./startup/db')();
require('./startup/passport-init');
require('./startup/prod')(app);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => winston.info(`Listening on port ${port}...`));

module.exports = server;