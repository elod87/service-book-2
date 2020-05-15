const winston = require('winston');
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const config = require('config');
const app = express();

app.use(express.static('public'));

app.use(cors({credentials: true, origin: config.get('clientURL')}));

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