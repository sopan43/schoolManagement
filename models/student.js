const Joi = require('joi')
const mongoose = require('mongoose')

const academicDetails = new mongoose.Schema({
  class: {
    type: String
  },
  examType: {
    type: String,
    enum: ['Q', 'H', 'A']
  },
  subjects: [
    {
      name: {
        type: String,
        required: true
      },
      marks: {
        type: String,
        required: true
      },
      maxMarks: {
        type: String,
        required: true
      },
      passingMarks: {
        type: String,
        required: true
      }
    }
  ]
})

const studentSchema = new mongoose.Schema({
  StudentName: {
    FirstName: {
      type: String,
      required: true
    },
    LastName: {
      type: String,
      required: true
    }
  },
  Gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female']
  },
  DateOfBirth: {
    type: String,
    required: true
  },
  DateOfAdmission: {
    type: String,
    required: true
  },
  Category: {
    type: String,
    required: true,
    enum: ['General', 'OBC', 'SC', 'ST']
  },
  FathersName: {
    type: String,
    required: true
  },
  MothersName: {
    type: String,
    required: true
  },
  FathersOccupation: {
    type: String,
    required: true
  },
  MothersOccupation: {
    type: String,
    required: true
  },
  PhoneNumber: {
    type: String,
    required: true
  },
  Address: {
    Address_Line_1: {
      type: String,
      required: true
    },
    Address_Line_2: {
      type: String
    },
    City: {
      type: String,
      required: true
    },
    State: {
      type: String,
      required: true
    },
    PostalCode: {
      type: String,
      required: true
    },
    Country: {
      type: String,
      required: true
    }
  },
  SSSID: {
    type: String,
    required: true
  },
  Aadhar: {
    type: String,
    required: true
  },
  Class: {
    type: String,
    required: true,
    enum: [
      'Nursery',
      'L.K.G.',
      'U.K.G.',
      '1st',
      '2nd',
      '3rd',
      '4th',
      '5th',
      '6th',
      '7th',
      '8th',
      '9th',
      '10th'
    ]
  },
  CurrentClass: {
    type: String,
    required: true,
    enum: [
      'Nursery',
      'L.K.G.',
      'U.K.G.',
      '1st',
      '2nd',
      '3rd',
      '4th',
      '5th',
      '6th',
      '7th',
      '8th',
      '9th',
      '10th'
    ]
  },
  Session: {
    type: String,
    required: true
  },
  TC: {
    type: Boolean,
    required: true,
    default: false
  },
  RegistrationNo1: {
    type: String
  },
  RegistrationNo2: {
    type: String
  },
  AdmissionNumber: {
    type: String
  },
  academicDetails: [academicDetails],
  RelievingDetails: {
    TCNumber: {
      type: String
    },
    Status: {
      type: String
    },
    DateOfRelieving: {
      type: String
    },
    TCDate: {
      type: String
    },
    RelievingReason: {
      type: String
    }
  }
})

const Student = mongoose.model('Student', studentSchema)

function validateStudent (student) {
  const schema = {
    RegistrationNo2: Joi.string()
      .allow('')
      .allow(null),
    RegistrationNo1: Joi.string()
      .allow('')
      .allow(null),
    // TCNumber: Joi.string()
    //   .allow('')
    //   .allow(null),
    Status: Joi.string()
      .allow('')
      .allow(null),
    DateOfRelieving: Joi.string()
      .allow('')
      .allow(null),
    TCDate: Joi.string()
      .allow('')
      .allow(null),
    // RelievingReason: Joi.string()
    //   .allow('')
    //   .allow(null),
    FirstName: Joi.string()
      .alphanum()
      .regex(/[a-zA-Z]/)
      .required()
      .label(' First Name'),
    AdmissionNumber: Joi.string().required(),
    LastName: Joi.string().required(),
    Gender: Joi.string().required(),
    Category: Joi.string().required(),
    DateOfBirth: Joi.string().required(),
    DateOfAdmission: Joi.string().required(),
    FathersName: Joi.string().required(),
    FathersOccupation: Joi.string().required(),
    MothersName: Joi.string().required(),
    MothersOccupation: Joi.string().required(),
    PhoneNumber: Joi.number()
      .integer()
      .positive()
      .required(),
    Address_Line_1: Joi.string().required(),
    Address_Line_2: Joi.string().required(),
    SSSID: Joi.string().required(),
    Aadhar: Joi.string().required(),
    City: Joi.string().required(),
    State: Joi.string().required(),
    PostalCode: Joi.number().required(),
    Country: Joi.string().required(),
    ClassAdmittedTo: Joi.string().required(),
    CurrentClass: Joi.string().required(),
    Session: Joi.string().required(),
    _method: Joi.string().empty('')
  }

  return Joi.validate(student, schema)
}

function validateTC (student) {
  const schema = {
    // TCNumber: Joi.string().required(),
    Status: Joi.string().required(),
    DateOfRelieving: Joi.string().required(),
    TCDate: Joi.string().required(),
    // RelievingReason: Joi.string().required(),
    _method: Joi.string().empty('')
  }

  return Joi.validate(student, schema)
}

exports.Student = Student
exports.validate = validateStudent
exports.validateTC = validateTC
