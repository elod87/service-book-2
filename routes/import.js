const router = require('express').Router();
const fs = require('fs');
const _ = require('lodash');
const auth = require('../middleware/auth');
const { Action, validate: validateAction } = require('../models/action');
const { Customer, validate: validateCustomer } = require('../models/customer');
const { Device, validate: validateDevice } = require('../models/device');
const { Service, validate: validateService } = require('../models/service');

//import from json exported from old application (firebase)
router.get('/', auth, async (req, res) => {
    let importData = fs.readFileSync(config.get('importFile'));
    importData = JSON.parse(importData);
    const promises = [];

    // drop existing data
    await Customer.deleteMany({});
    await Action.deleteMany({});
    await Device.deleteMany({});
    await Service.deleteMany({});

    const newIds = {
        actions: {},
        devices: {},
        customers: {}
    }

    //import customers
    const customers = importData.customers;
    for (const customerKey of Object.keys(customers)) {
        const customer = customers[customerKey];
        const customerData = _.pick(customer, ['name', 'email', 'phone', 'address']);

        const { error } = validateCustomer(customerData);
        if (error) {
            console.log(`Error importing customer: ${JSON.stringify(customer)}; Error: ${error.details[0].message}`);
            continue;
        }

        let newCustomer = new Customer(customerData);

        const promise = newCustomer.save();
        promises.push(promise);

        promise.then((newC) => {
            newIds.customers[customerKey] = newC._id.toString()
        });
    }

    //import actions
    const actions = importData.actions;
    for (const actionKey of Object.keys(actions)) {
        const action = actions[actionKey];
        const actionData = _.pick(action, ['name', 'price']);

        const { error } = validateAction(actionData);
        if (error) {
            console.log(`Error importing action: ${JSON.stringify(action)}; Error: ${error.details[0].message}`);
            continue;
        }

        let newAction = new Action(actionData);

        const promise = newAction.save();
        promises.push(promise);

        promise.then((newA) => {
            newIds.actions[actionKey] = newA._id.toString()
        });
    }


    //import devices
    const devices = importData.devices;
    for (const deviceKey of Object.keys(devices)) {
        const device = devices[deviceKey];
        const deviceData = _.pick(device, ['name', 'manufacturer', 'model', 'serial']);

        const { error } = validateDevice(deviceData);
        if (error) {
            console.log(`Error importing device: ${JSON.stringify(device)}; Error: ${error.details[0].message}`);
            continue;
        }

        let newDevice = new Device(deviceData);

        const promise = newDevice.save();
        promises.push(promise);

        promise.then((newD) => {
            newIds.devices[deviceKey] = newD._id.toString()
        });
    }

    Promise.all(promises)
        .then(async () => {
            const servicePromises = [];

            //import services
            const services = importData.services;
            for (const serviceKey of Object.keys(services)) {
                const service = services[serviceKey];
                const serviceData = _.pick(service, ['description', 'remark', 'status']);

                serviceData.id = serviceKey;
                serviceData.date = new Date(service.date);

                const newService = new Service(serviceData);

                //set customer
                serviceData.customer = newIds.customers[service.customers[0]];

                //set devices
                serviceData.devices = [];
                if (service.devices) {
                    for (const deviceId of service.devices) {
                        serviceData.devices.push(newIds.devices[deviceId]);
                    }
                }

                //set actions
                serviceData.actions = [];
                if (service.actions) {
                    for (const action of service.actions) {
                        serviceData.actions.push({
                            id: newIds.actions[action.actionId],
                            price: action.price,
                            quantity: action.quantity
                        });
                    }
                }

                //set newDevices
                serviceData.newDevices = [];
                if (service.newDevices) {
                    for (const newDevice of service.newDevices) {
                        serviceData.newDevices.push({
                            id: newIds.devices[newDevice.deviceId],
                            price: newDevice.price,
                            quantity: newDevice.quantity
                        });
                    }
                }


                const { error } = validateService(serviceData);
                if (error) {
                    console.log(`Error importing service: ${JSON.stringify(service)}; Error: ${error.details[0].message}`);
                    continue;
                }

                //set customer details
                const customerId = serviceData.customer;
                const customer = await Customer.findById(customerId);
                if (customer) {
                    newService.customer.customerRef = customerId;
                    newService.customer.customerName = customer.name;
                }


                //set devices details
                for (const deviceId of serviceData.devices) {
                    const device = await Device.findById(deviceId);
                    if (device) {
                        newService.devices.push({
                            deviceRef: deviceId,
                            deviceName: device.name
                        });
                    }
                }


                //set actions details
                for (const serviceAction of serviceData.actions) {
                    const action = await Action.findById(serviceAction.id);
                    if (action) {
                        newService.actions.push({
                            actionRef: serviceAction.id,
                            actionName: action.name,
                            price: serviceAction.price,
                            quantity: serviceAction.quantity
                        });
                    }
                }

                
                //set newDevices
                for (const serviceDevice of serviceData.newDevices) {
                    const device = await Device.findById(serviceDevice.id);
                    if (device) {
                        newService.newDevices.push({
                            deviceRef: serviceDevice.id,
                            deviceName: device.name,
                            price: serviceDevice.price,
                            quantity: serviceDevice.quantity
                        });
                    }
                }                

                servicePromises.push(newService.save());
            }

            Promise.all(servicePromises)
                .then(() => {
                    res.send('Imported');
                }).catch((err) => {
                    console.log(`Error during service import: ${err}`);
                });
        });

});

module.exports = router;