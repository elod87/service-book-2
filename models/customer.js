const mongoose = require('mongoose');
const Joi = require('joi');
const Schema = mongoose.Schema;

const customerSchema = new Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        default: '',
        maxlength: 100
    },
    phone: {
        type:String,
        required: true,
        default: ''
    },
    address: {
        type: String,
        default: '',
        maxlength: 100
    }
});

customerSchema.statics = {
    search: function(searchString) {        
        return this.find({
            "$or": [
                { name : { $regex: new RegExp(searchString), $options: 'i' } },
                { email : { $regex: new RegExp(searchString), $options: 'i' } },
                { phone : { $regex: new RegExp(searchString), $options: 'i' } },
                { address : { $regex: new RegExp(searchString), $options: 'i' } }
            ]
        });
    },
    getTotalCount: function(searchString) {
        return this.count({
            "$or": [
                { name : { $regex: new RegExp(searchString), $options: 'i' } },
                { email : { $regex: new RegExp(searchString), $options: 'i' } },
                { phone : { $regex: new RegExp(searchString), $options: 'i' } },
                { address : { $regex: new RegExp(searchString), $options: 'i' } }
            ]
        });
    }
}

const Customer = mongoose.model('Customer', customerSchema);

function validateCustomer(customer) {
    const schema = {
        name: Joi.string().min(1).max(100).required(),
        email: Joi.string().max(100).allow(''),
        address: Joi.string().max(200).allow(''),
        phone: Joi.string().required()
    }

    return Joi.validate(customer, schema);
}

module.exports.Customer = Customer;
module.exports.validate = validateCustomer;