const express = require('express')
const faker = require('faker')
const moment = require('moment')
const randomString = require('randomstring')

const print = require('./print')

const router = express.Router()

const { Student, validate, validateTC } = require('../models/student')

const {
  ensureAuthenticated,
  isAdmin,
  isLoggedIn,
  createAccessControl,
  readAccessControl,
  updateAccessControl,
  deleteAccessControl
} = require('../helpers/auth')

// Students Home Route
router.get(
  '/',
  [ensureAuthenticated, isAdmin, readAccessControl],
  async (req, res) => {
    const perPage = 50
    const page = req.query.page || 1
    const skip = perPage * page - perPage + 1
    const sort = req.query.sort || 'asc'
    const tc = req.query.tc || false

    const student = await Student.find({ TC: tc })
      .skip(perPage * page - perPage)
      .limit(perPage)
      .sort({
        CurrentClass: sort
      })
      .lean()
    if (student.length > 0) {
      const pages = await Student.countDocuments({ TC: tc })

      res.render('students/index', {
        title: 'Students',
        breadcrumbs: true,
        search_bar: true,
        students: student,
        current: parseInt(page),
        pages: Math.ceil(pages / perPage),
        total: pages,
        perPage: perPage,
        skip: skip,
        to: student.length + 10,
        TC: !tc
      })
    } else {
      res.render('students/index', {
        title: 'Students',
        breadcrumbs: true,
        search_bar: true,
        TC: !tc
      })
    }
  }
)

// Student Detail's Route
router.get(
  '/details',
  [ensureAuthenticated, isAdmin, readAccessControl],
  async (req, res) => {
    const student = await Student.findOne({
      _id: req.query.id
    }).lean()

    if (student) {
      res.render('students/details', {
        title: 'Details',
        breadcrumbs: true,
        student: student
      })
    } else {
      req.flash('error_msg', 'No records found...')
    }
  }
)

// Search Student Route.
router.post('/', [ensureAuthenticated, isAdmin], async (req, res) => {
  let key = req.body.searchInput

  const student = await Student.find({
    RegistrationNo: key
  })

  if (student.length > 0) {
    res.render('students/index', {
      title: 'Student',
      breadcrumbs: true,
      search_bar: true,
      students: student
    })
  } else {
    req.flash('error_msg', 'Record not found.')
    res.redirect('/students')
  }
})

// Add Student Form Route
router.get(
  '/add',
  [ensureAuthenticated, isAdmin, createAccessControl],
  async (req, res) => {
    res.render('students/add', {
      title: 'Add New Student',
      breadcrumbs: true
    })
  }
)

// Process Students Form Data And Insert Into Database.
router.post(
  '/add',
  [ensureAuthenticated, isAdmin, createAccessControl],
  async (req, res) => {
    // req.body.CurrentClass = req.body.ClassAdmittedTo
    let errors = []
    const { error } = validate(req.body)

    if (error) {
      errors.push({
        text: error.details[0].message
      })
      res.render('students/add', {
        title: 'Add Student',
        breadcrumbs: true,
        errors: errors,
        body: req.body
      })
    } else {
      const student = new Student({
        StudentName: {
          FirstName: req.body.FirstName,
          LastName: req.body.LastName
        },
        Gender: req.body.Gender,
        Category: req.body.Category,
        DateOfBirth:  moment(req.body.DateOfBirth).format('LL'),
        DateOfAdmission: moment(req.body.DateOfAdmission).format('LL'),
        FathersName: req.body.FathersName,
        FathersOccupation: req.body.FathersOccupation,
        MothersName: req.body.MothersName,
        MothersOccupation: req.body.MothersOccupation,
        PhoneNumber: req.body.PhoneNumber,
        Address: {
          Address_Line_1: req.body.Address_Line_1,
          Address_Line_2: req.body.Address_Line_2,
          City: req.body.City,
          State: req.body.State,
          PostalCode: req.body.PostalCode,
          Country: req.body.Country
        },
        SSSID: req.body.SSSID,
        Aadhar: req.body.Aadhar,
        Class: req.body.ClassAdmittedTo,
        CurrentClass: req.body.CurrentClass,
        Session: req.body.Session,
        RegistrationNo1: req.body.RegistrationNo1,
        RegistrationNo2: req.body.RegistrationNo2,
        AdmissionNumber: req.body.AdmissionNumber
      })

      try {
        const result = await student.save()

        if (result) {
          req.flash('success_msg', 'Information saved successfully.')
          res.redirect('/students')
        }
      } catch (ex) {
        for (field in ex.errors) {
          errors.push({
            text: ex.errors[field].message
          })
          console.log(ex.errors[field])
        }
        res.render('students/add', {
          title: 'Add Student',
          breadcrumbs: true,
          errors: errors,
          body: req.body
        })
      }
      // } else {
      // errors.push({
      //     text: 'Roll Number Already Exists.'
      // });
      // res.render('students/add', {
      //     title: 'Add Student',
      //     breadcrumbs: true,
      //     errors: errors,
      //     body: req.body
      // });
    }
  }
)

// Student Edit Form
router.get(
  '/edit',
  [ensureAuthenticated, isAdmin, updateAccessControl],
  async (req, res) => {
    const student = await Student.findOne({
      _id: req.query.id
    }).lean()

    if (student) {
      res.render('students/edit', {
        title: 'Edit Student Details',
        breadcrumbs: true,
        student: student
      })
    }
  }
)

// Student Update Route
router.put(
  '/:id',
  [ensureAuthenticated, isAdmin, updateAccessControl],
  async (req, res) => {
    const { error } = validate(req.body)

    if (error) {
      req.flash('error_msg', error.details[0].message)
      res.redirect(`/students/edit?id=${req.params.id}`)
    } else {
      const student = await Student.update(
        {
          _id: req.params.id
        },
        {
          $set: {
            'StudentName.FirstName': req.body.FirstName,
            'StudentName.LastName': req.body.LastName,
            Gender: req.body.Gender,
            Category: req.body.Category,
            DateOfBirth:  moment(req.body.DateOfBirth).format('LL'),
            DateOfAdmission: moment(req.body.DateOfAdmission).format('LL'),
            FathersName: req.body.FathersName,
            FathersOccupation: req.body.FathersOccupation,
            MothersName: req.body.MothersName,
            MothersOccupation: req.body.MothersOccupation,
            PhoneNumber: req.body.PhoneNumber,
            'Address.Address_Line_1': req.body.Address_Line_1,
            'Address.Address_Line_2': req.body.Address_Line_2,
            SSSID: req.body.SSSID,
            Aadhar: req.body.Aadhar,
            'Address.City': req.body.City,
            'Address.State': req.body.State,
            'Address.PostalCode': req.body.PostalCode,
            'Address.Country': req.body.Country,
            CourseName: req.body.CourseName,
            BranchName: req.body.BranchName,
            Class: req.body.ClassAdmittedTo,
            Session: req.body.Session,
            RegistrationNo1: req.body.RegistrationNo1,
            RegistrationNo2: req.body.RegistrationNo2,
            AdmissionNumber: req.body.AdmissionNumber,
            CurrentClass: req.body.CurrentClass,
          }
        }
      )

      if (student) {
        req.flash('success_msg', 'Student Details Updated Successfully.')
        res.redirect('/students')
      }
    }
  }
)

router.delete(
  '/:id',
  [ensureAuthenticated, isAdmin, deleteAccessControl],
  async (req, res) => {
    const result = await Student.remove({
      _id: req.params.id
    })

    if (result) {
      req.flash('success_msg', 'Record deleted successfully.')
      res.send('/students')
    } else {
      res.status(500).send()
    }
  }
)

router.delete('/multiple/:id', async (req, res) => {
  let str = req.params.id

  for (i in str) {
    console.log(i)
  }

  const result = await Student.find({
    _id: {
      $in: []
    }
  })
  console.log(result)
  if (result) {
    req.flash('success_msg', 'Records deleted successfully.')
    res.send('/students')
  } else {
    res.status(500).send()
  }

  //let str = '[' + req.params.id + ']';
  //console.log(str);
})

router.delete(
  '/details/:id',
  [ensureAuthenticated, isAdmin],
  async (req, res) => {
    console.log('Delete Controler')
    const result = await Student.remove({
      _id: req.params.id
    })

    if (result) {
      req.flash('success_msg', 'Record deleted successfully.')
      res.send('/students')
    }
  }
)

//TC Routes
router.get(
  '/tc',
  [ensureAuthenticated, isAdmin, updateAccessControl],
  async (req, res) => {
    const student = await Student.findOne({
      _id: req.query.id
    }).lean()

    if (student) {
      res.render('students/tc', {
        title: 'Create TC',
        breadcrumbs: true,
        student: student
      })
    }
  }
)

router.post(
  '/tc/:id',
  [ensureAuthenticated, isAdmin, deleteAccessControl],
  async (req, res) => {
    const { error } = validateTC(req.body)

    if (error) {
      req.flash('error_msg', error.details[0].message)
      res.redirect(`/students/tc?id=${req.params.id}`)
    } else {
      const id = req.params.id
      const result = await Student.findOneAndUpdate(
        { _id: req.params.id },
        { RelievingDetails: req.body, TC: true }
      ).lean()

      if (result) {
        res.redirect(`/students/details?id=${req.params.id}`)
        req.flash('success_msg', 'Student Marked as passout successfully.')
        req.flash('TC Downloading', 'Student TC Downloading')
        // res.download(xx.filename);
        // res.send('/students');
      }
    }
  }
)

router.get(
  '/tc/download',
  [ensureAuthenticated, isAdmin, deleteAccessControl],
  async (req, res) => {
    const tcData = await Student.findOne({ _id: req.query.id }).lean()
    const printData = await print.printTC(tcData)
    res.download(printData.filename)
  }
)

// router.get('/tc/:id', [ensureAuthenticated, isAdmin, deleteAccessControl], async (req, res) => {
//     console.log("TC Controler PUT ====> ");
//     const result = await Student.findOneAndUpdate (
//         {_id: req.params.id},
//         // { TC: true}
//         ).lean();

//     // if (result) {
//     //     print.printTC(result);
//     //     req.flash('success_msg', 'Student Marked as passout successfully.');
//     //     req.flash('TC Downloading', 'Student TC Downloading');
//     //     res.send('/students');
//     // }
// });
;``
// Faker
// router.get('/faker', async (req, res) => {
//   for (let i = 0; i < 10; i++) {
//     const student = new Student({
//       StudentName: {
//         FirstName: faker.name.firstName(),
//         LastName: faker.name.lastName()
//       },
//       Gender: 'Male',
//       Category: 'General',
//       DateOfBirth: moment(faker.date.past()).format('LL'),
//       DateOfAdmission: moment(faker.date.recent()).format('LL'),
//       FathersName: faker.name.findName(),
//       FathersOccupation: faker.name.jobTitle(),
//       MothersName: faker.name.findName(),
//       MothersOccupation: faker.name.jobTitle(),
//       Email: faker.internet.email(),
//       PhoneNumber: faker.phone.phoneNumber(),
//       Address: {
//         Address_Line_1: `${faker.address.streetAddress()} , ${faker.address.streetName()}`,
//         Address_Line_2: `${faker.address.streetAddress()} , ${faker.address.streetName()}`,
//         City: 'MORENA',
//         State: 'MADHYA PRADESH',
//         PostalCode: 476001,
//         Country: 'INDIA'
//       },
//       SSSID: '098765678909876',
//       Aadhar: '4567898765456789',
//       Class: '1st',
//       CurrentClass: '1st',
//       Session: '2013-2016',
//       RegistrationNo1: randomString.generate({
//         length: 8,
//         charset: 'numeric'
//       }),
//       AdmissionNumber: randomString.generate({
//         length: 4,
//         charset: 'numeric'
//       }),
//       RegistrationNo2: randomString.generate({
//         length: 8,
//         charset: 'numeric'
//       })
//     })

//     const result = await student.save()
//   }
// })

module.exports = router
