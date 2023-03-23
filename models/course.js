const Joi = require('joi')
const mongoose = require('mongoose')

const courseSchema = new mongoose.Schema({
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
      passingMarks: {
        type: Number
      },
      maxMarks: {
        type: Number
      },
      examDate: {
        type: String
      },
      markingType: {
        type: String
      }
    }
  ]
})

const Course = mongoose.model('Course', courseSchema)

exports.Course = Course
