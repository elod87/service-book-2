const express = require('express');
const authRoutes = require('../routes/auth');
const usersRoutes = require('../routes/users');
const actionsRoutes = require('../routes/actions');
const devicesRoutes = require('../routes/devices');
const customersRoutes = require('../routes/customers');
const servicesRoutes = require('../routes/services');
const reportsRoutes = require('../routes/reports');
const importRoutes = require('../routes/import');

module.exports = function (app) {
    app.use(express.json());
    app.use('/auth', authRoutes);    
    app.use('/users', usersRoutes);
    app.use('/actions', actionsRoutes);
    app.use('/devices', devicesRoutes);
    app.use('/customers', customersRoutes);
    app.use('/services', servicesRoutes);
    app.use('/reports', reportsRoutes);
    app.use('/import', importRoutes);
}