const router = require('express').Router();
const _ = require('lodash');
const { Action, validate } = require('../models/action');
const { Service } = require('../models/service');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

//get all actions
router.get('/', auth, async (req, res) => {
    const pageSize = Number(req.query.per_page);
    const page = Number(req.query.page);
    const search = req.query.search;
    const orderByColumn = req.query.orderByColumn;
    const orderDirection = req.query.orderDirection;

    const sortString = orderDirection === 'desc' && orderByColumn ? `-${orderByColumn}` : orderByColumn;
    const actions = await Action.search(search)    
    .skip(page * pageSize)
    .limit(pageSize)
    .sort(sortString);   

    const totalCount = await Action.getTotalCount(search);

    const result = {
        data: actions,
        page: page,
        totalCount: totalCount
    }

    res.send(result);
});

//create new action
router.post('/', auth, async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let action = new Action(_.pick(req.body, ['name', 'price']));

    await action.save();

    res.send(action);
});

//update action
router.put('/:id', [auth, validateObjectId], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let action = null;
    action = await Action.findByIdAndUpdate(req.params.id, {
        name: req.body.name,
        price: req.body.price
    }, {
        new: true
    });

    if (!action) return res.status(404).send('Action not found');

    //update action name in services where this action is used
    await Service.updateMany(
        { 'actions.actionRef': action._id },
        { $set: {'actions.$.actionName': action.name } }
    );
    
    res.send(action);
});

//delete action
router.delete('/:id', [auth, validateObjectId], async (req, res) => {
    //check if action is used currently in services
    const serviceCount = await Service.count({ 'actions.actionRef': req.params.id });
    if (serviceCount > 0) {
        return res.status(403).send('Delete not allowed: action is in use');
    }

    let action = null;
    action = await Action.findByIdAndRemove(req.params.id);

    if (!action) res.status(404).send('Action not found');

    res.send(action);
});

//get action
router.get('/:id', validateObjectId, async (req, res) => {
    let action = null;
    action = await Action.findById(req.params.id);

    if (!action) res.status(404).send('Action not found');

    res.send(action);
})

module.exports = router;

