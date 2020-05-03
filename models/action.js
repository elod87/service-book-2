const mongoose = require('mongoose');
const Joi = require('joi');
const Schema = mongoose.Schema;

const actionSchema = new Schema({
    name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 100
    },
    price: {
        type: Number,
        default: 0,
        required: true
    }
});

actionSchema.statics = {
    search: function(searchString) {        
        return this.find({ name : { $regex: new RegExp(searchString), $options: 'i' } })
    },
    getTotalCount: function(searchString) {
        return this.count({ name : { $regex: new RegExp(searchString), $options: 'i' } });
    }
}

const Action = mongoose.model('Action', actionSchema);

function validateAction(action) {
    const schema = {
        name: Joi.string().min(1).max(100).required(),
        price: Joi.number().allow(0)
    }

    return Joi.validate(action, schema);
}

module.exports.Action = Action;
module.exports.validate = validateAction;