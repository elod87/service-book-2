const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const Schema = mongoose.Schema;

const serviceSchema = new Schema({
    id: {
        type: String,
        default: Date.now
    },
    date: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        required: true,
        maxlength: 200
    },
    remark: {
        type: String,
        maxlength: 200
    },
    status: {
        type: String,
        default: 'received'
    },
    lastModified: {
        type: Date,
        default: Date.now
    },
    customer: {
        customerRef: {
            type: Schema.Types.ObjectId,
            ref: 'Customer'
        },
        customerName: {
            type: String
        }
    },
    devices: [
        {
            deviceRef: {
                type: Schema.Types.ObjectId,
                ref: 'Device'
            },
            deviceName: {
                type: String
            }
        }
    ],
    actions: [
        {
            actionRef: {
                type: Schema.Types.ObjectId,
                ref: 'Action'
            },
            actionName: {
                type: String
            },
            price: {
                type: Number,
                default: 0
            },
            quantity: {
                type: Number,
                default: 0
            }
        }
    ],
    newDevices: [
        {
            deviceRef: {
                type: Schema.Types.ObjectId,
                ref: 'Device'
            },
            deviceName: {
                type: String
            },
            price: {
                type: Number,
                default: 0
            },
            quantity: {
                type: Number,
                default: 0
            }
        }
    ]
});

const createSearchConditions = (searchString) => {
    return [
        { 'actions.actionName': { $regex: new RegExp(searchString), $options: 'i' } },
        { 'customer.customerName': { $regex: new RegExp(searchString), $options: 'i' } },
        { 'devices.deviceName': { $regex: new RegExp(searchString), $options: 'i' } },
        { 'newDevices.deviceName': { $regex: new RegExp(searchString), $options: 'i' } },
        { description: { $regex: new RegExp(searchString), $options: 'i' } },
        { remark: { $regex: new RegExp(searchString), $options: 'i' } },
        { id: { $regex: new RegExp(searchString), $options: 'i' } }
    ]
}

serviceSchema.statics = {
    search: function (searchString, statusFilter) {
        return this.find({
            status: statusFilter ? { $in: statusFilter.split(',') } : { $ne: null },
            "$or": createSearchConditions(searchString, statusFilter)            
        })            
            .populate('customer.customerRef', 'name phone')
            .populate('actions.actionRef', 'name')
            .populate('devices.deviceRef', 'name serial')
            .populate('newDevices.deviceRef', 'name serial')
            .lean();
    },
    getTotalCount: function (searchString, statusFilter) {
        return this.count({
            status: statusFilter ? { $in: statusFilter.split(',') } : { $ne: null },
            "$or": createSearchConditions(searchString, statusFilter)
        });
    }
}

const Service = mongoose.model('Service', serviceSchema);

function validateService(service) {
    const schema = {
        id: Joi.string().allow(''),
        customer: Joi.objectId().required(),
        date: Joi.date().iso(),
        description: Joi.string().max(200).required(),
        devices: Joi.array().min(1).required(),
        status: Joi.string(),
        remark: Joi.string().allow(''),
        actions: Joi.array(),
        newDevices: Joi.array()
    }

    return Joi.validate(service, schema);
}

module.exports.Service = Service;
module.exports.validate = validateService;