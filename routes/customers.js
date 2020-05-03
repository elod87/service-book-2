const router = require('express').Router();
const _ = require('lodash');
const { Customer, validate } = require('../models/customer');
const { Service } = require('../models/service');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

//get all customer
router.get('/', auth, async (req, res) => {
    const pageSize = Number(req.query.per_page);
    const page = Number(req.query.page);
    const search = req.query.search;
    const orderByColumn = req.query.orderByColumn;
    const orderDirection = req.query.orderDirection;

    const sortString = orderDirection === 'desc' && orderByColumn ? `-${orderByColumn}` : orderByColumn;
    const customers = await Customer.search(search)
        .skip(page * pageSize)
        .limit(pageSize)
        .sort(sortString);

    const totalCount = await Customer.getTotalCount(search);

    const result = {
        data: customers,
        page: page,
        totalCount: totalCount
    }

    res.send(result);
});

//create new customer
router.post('/', auth, async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const customerData = _.pick(req.body, ['name', 'email', 'phone', 'address']);

    let customer = new Customer(customerData);

    await customer.save();
    res.send(customer);
});

//update customer
router.put('/:id', [auth, validateObjectId], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let customer = null;

    customer = await Customer.findByIdAndUpdate(req.params.id, {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address
    }, {
        new: true
    });

    if (!customer) return res.status(404).send('Customer not found');

    //update customer name in services where this customer is used
    await Service.updateMany(
        { 'customer.customerRef': customer._id },
        { $set: {'customer.customerName': customer.name } }
    );

    res.send(customer);
});

//delete customer
router.delete('/:id', [auth, validateObjectId], async (req, res) => {
    //check if action is used currently in services
    const serviceCount = await Service.count({ 'customer.customerRef': req.params.id });
    if (serviceCount > 0) {
        return res.status(403).send('Delete not allowed: customer is in use');
    }

    let customer = null;
    customer = await Customer.findByIdAndRemove(req.params.id);

    if (!customer) res.status(404).send('Customer not found');

    res.send(customer);
});

//get customer
router.get('/:id', validateObjectId, async (req, res) => {
    let customer = null;
    customer = await Customer.findById(req.params.id);

    if (!customer) res.status(404).send('Customer not found');

    res.send(customer);
})

module.exports = router;

