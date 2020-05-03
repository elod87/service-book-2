const router = require('express').Router();
const _ = require('lodash');
const { Device, validate } = require('../models/device');
const { Service } = require('../models/service');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

//get all devices
router.get('/', auth, async (req, res) => {
    const pageSize = Number(req.query.per_page);
    const page = Number(req.query.page);
    const search = req.query.search;
    const orderByColumn = req.query.orderByColumn;
    const orderDirection = req.query.orderDirection;

    const sortString = orderDirection === 'desc' && orderByColumn ? `-${orderByColumn}` : orderByColumn;
    const devices = await Device.search(search)
        .skip(page * pageSize)
        .limit(pageSize)
        .sort(sortString);

    const totalCount = await Device.getTotalCount(search);

    const result = {
        data: devices,
        page: page,
        totalCount: totalCount
    }

    res.send(result);
});

//create new device
router.post('/', auth, async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    //calculate name field (manufacturer + model)
    const manufacturer = req.body.manufacturer || '';
    const model = req.body.model || '';
    const name = manufacturer + ' ' + model;

    const deviceData = { ..._.pick(req.body, ['manufacturer', 'model', 'serial']), name }

    let device = new Device(deviceData);

    await device.save();
    res.send(device);
});

//update device
router.put('/:id', [auth, validateObjectId], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let device = null;

    //calculate name field (manufacturer + model)
    const manufacturer = req.body.manufacturer || '';
    const model = req.body.model || '';
    const name = manufacturer + ' ' + model;

    device = await Device.findByIdAndUpdate(req.params.id, {
        name: name,
        manufacturer: req.body.manufacturer,
        model: req.body.model,
        serial: req.body.serial
    }, {
        new: true
    });

    if (!device) return res.status(404).send('Device not found');

    //update device name in services where this device is used (devices and newDevices)
    const promise1 = Service.updateMany(
        { 'devices.deviceRef': device._id },
        { $set: {'devices.$.deviceName': device.name } }
    );
    const promise2 = Service.updateMany(
        { 'newDevices.deviceRef': device._id },
        { $set: {'newDevices.$.deviceName': device.name } }
    );

    Promise.all([promise1, promise2])
        .then(() => {
            res.send(device);
        });    
});

//delete device
router.delete('/:id', [auth, validateObjectId], async (req, res) => {
    //check if action is used currently in services
    const serviceCount = await Service.count({
        "$or": [
            { 'devices.deviceRef': req.params.id },
            { 'newDevices.deviceRef': req.params.id }
        ]
    });
       
    if (serviceCount > 0) {
        return res.status(403).send('Delete not allowed: device is in use');
    }


    let device = null;
    device = await Device.findByIdAndRemove(req.params.id);

    if (!device) res.status(404).send('Device not found');

    res.send(device);
});

//get device
router.get('/:id', validateObjectId, async (req, res) => {
    let device = null;
    device = await Device.findById(req.params.id);

    if (!device) res.status(404).send('Device not found');

    res.send(device);
})

module.exports = router;

