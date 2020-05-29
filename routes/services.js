const router = require('express').Router();
const _ = require('lodash');
const { Service, validate } = require('../models/service');
const { Customer } = require('../models/customer');
const { Device } = require('../models/device');
const { Action } = require('../models/action');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

const formatReturnedService = (service) => {
    if (service.customer && service.customer.customerRef) {
        const { _id: id, name, phone } = service.customer.customerRef;

        service.customer = { id, name, phone }        
    }

    if (service.actions) {
        let index = 0;
        for (const serviceAction of service.actions) {
            const action = serviceAction.actionRef;
            const { _id: id, name } = action;

            service.actions[index] = { id, name, 
                price: serviceAction.price, 
                quantity: serviceAction.quantity
            }

            index++;
        }
    }

    if (service.devices) {
        let index = 0;
        for (const serviceDevice of service.devices) {
            const device = serviceDevice.deviceRef;
            const { _id: id, name, serial } = device;

            service.devices[index] = { id, name, serial }

            index++;
        }
    }

    if (service.newDevices) {
        let index = 0;
        for (const newDevice of service.newDevices) {
            const device = newDevice.deviceRef;
            const { _id: id, name, serial } = device;

            service.newDevices[index] = { id, name, serial, 
                price: newDevice.price, 
                quantity: newDevice.quantity
            }

            index++;
        }
    }
}

//get all services
router.get('/', auth, async (req, res) => {
    const pageSize = req.query.per_page ? Number(req.query.per_page) : 20;
    const page = Number(req.query.page);
    const search = req.query.search;
    const orderByColumn = req.query.orderByColumn === 'customer' ? 'customer.customerName' : req.query.orderByColumn;
    const orderDirection = req.query.orderDirection;
    const statusFilter = req.query.status;

    const sortString = orderDirection === 'desc' && orderByColumn ? `-${orderByColumn}` : orderByColumn;
    const services = await Service.search(search, statusFilter)
        .skip(page * pageSize)
        .limit(pageSize)
        .sort(sortString);

    const totalCount = await Service.getTotalCount(search, statusFilter);

    for (var service of services) {
        formatReturnedService(service);    
    }

    const result = {
        services,
        hasMore: (page + 1) * pageSize < totalCount
    }

    res.send(result);
});

//create new service
router.post('/', auth, async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const serviceData = _.pick(req.body, ['description', 'remark']);

    const service = new Service(serviceData);

    // TODO: get customer and devices async
    //set customer
    const customerId = req.body.customer;
    const customer = await Customer.findById(customerId);
    if (customer) {
        service.customer.customerRef = customerId,
        service.customer.customerName = customer.name
    }

    //set devices
    for (deviceId of req.body.devices) {
        const device = await Device.findById(deviceId);
        if (device) {
            service.devices.push({
                deviceRef: deviceId,
                deviceName: device.name
            });
        }
    }

    let newService = await service.save();

    newService = await Service.findById(newService._id)
            .populate('customer.customerRef', 'name phone')
            .populate('actions.actionRef', 'name')
            .populate('devices.deviceRef', 'name serial')
            .populate('newDevices.deviceRef', 'name serial')
            .lean();
        
        formatReturnedService(newService); 

    res.send(newService);
});

//update service
router.put('/:id', [auth, validateObjectId], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const service = await Service.findById(req.params.id);

    if (service) {
        service['description'] = req.body.description;
        service['remark'] = req.body.remark;
        service['status'] = req.body.status;

        //update customer
        const customerId = req.body.customer;
        const customer = await Customer.findById(customerId);
        if (customer) {
            service.customer.customerRef = customerId,
            service.customer.customerName = customer.name
        }

        //update devices
        service.devices = [];
        for (deviceId of req.body.devices) {
            const device = await Device.findById(deviceId);
            if (device) {
                service.devices.push({
                    deviceRef: deviceId,
                    deviceName: device.name
                });
            }
        }

        //update actions
        service.actions = [];
        for (newAction of req.body.actions) {
            const action = await Action.findById(newAction.id);
            if (action) {
                service.actions.push({
                    actionRef: newAction.id,
                    actionName: action.name,
                    price: newAction.price,
                    quantity: newAction.quantity
                })
            }
        }

        //update new Devices
        service.newDevices = [];
        for (newDevice of req.body.newDevices) {
            const device = await Device.findById(newDevice.id);
            if (device) {
                service.newDevices.push({
                    deviceRef: newDevice.id,
                    deviceName: device.name,
                    price: newDevice.price,
                    quantity: newDevice.quantity
                })
            }
        }

        service.lastModified = Date.now();

        await service.save();

        const updatedService = await Service.findById(service._id)
            .populate('customer.customerRef', 'name phone')
            .populate('actions.actionRef', 'name')
            .populate('devices.deviceRef', 'name serial')
            .populate('newDevices.deviceRef', 'name serial')
            .lean();
        
        formatReturnedService(updatedService);        

        res.send(updatedService);
    } else {
        return res.status(404).send('Service not found');
    }

});

//delete service
router.delete('/:id', [auth, validateObjectId], async (req, res) => {
    const service = await Service.findByIdAndRemove(req.params.id);

    if (!service) res.status(404).send('Service not found');

    res.send(service);
});

//get service
router.get('/:id', validateObjectId, async (req, res) => {
    const service = await Service.findById(req.params.id);

    if (!service) res.status(404).send('Service not found');

    res.send(service);
});


module.exports = router;

