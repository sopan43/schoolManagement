const Joi = require('joi')
const mongoose = require('mongoose')

const admitCardSchema = new mongoose.Schema({
  class: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  subjects: [
    {
      name: {
        type: String,
        required: true
      },
      examDate: {
        type: String
      }
    }
  ]
})

const AdmitCard = mongoose.model('AdmitCard', admitCardSchema)

exports.AdmitCard = AdmitCard