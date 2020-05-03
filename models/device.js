const mongoose = require('mongoose');
const Joi = require('joi');
const Schema = mongoose.Schema;

const deviceSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    manufacturer: {
        type: String,
        minlength: 1,
        maxlength: 100
    },
    model: {
        type: String,
        minlength: 1,
        maxlength: 300
    },
    serial: {
        type:String,
        maxlength: 200
    }
});

deviceSchema.statics = {
    search: function(searchString) {        
        return this.find({
            "$or": [
                { name : { $regex: new RegExp(searchString), $options: 'i' } },
                { serial : { $regex: new RegExp(searchString), $options: 'i' } }
            ]
        });
    },
    getTotalCount: function(searchString) {
        return this.count({
            "$or": [
                { name : { $regex: new RegExp(searchString), $options: 'i' } },
                { serial : { $regex: new RegExp(searchString), $options: 'i' } }
            ]
        });
    }
}

const Device = mongoose.model('Device', deviceSchema);

function validateDevice(device) {
    const schema = {
        name: Joi.string(),
        manufacturer: Joi.string().max(100),
        model: Joi.string().max(300),
        serial: Joi.string().max(200).allow('')
    }

    return Joi.validate(device, schema);
}

module.exports.Device = Device;
module.exports.validate = validateDevice;