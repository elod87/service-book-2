require('express-async-errors');
const winston = require('winston');

module.exports = function () {
    process.on('uncaughtException', (ex) => {
        winston.error(ex.message);
        console.log(ex);
    });

    process.on('unhandledRejection', (ex) => {
        winston.error(ex.message);
        console.log(ex);
    });

    // const filesLogger = new winston.transports.File({ filename: 'logfile.log' });
    const consoleLogger = new winston.transports.Console({ colorize: true });
    
    winston.add(consoleLogger);    
}