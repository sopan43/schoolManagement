const express = require('express')
const router = express.Router()
const moment = require('moment')
const { Course } = require('../models/course')
const { Student } = require('../models/student')
const print = require('./print')
var converter = require('number-to-words');
var zip = require('express-zip')

const {
  ensureAuthenticated,
  isAdmin,
  readAccessControl,
  createAccessControl,
  updateAccessControl,
  deleteAccessControl
} = require('../helpers/auth')

router.get(
  '/',
  [ensureAuthenticated, isAdmin, readAccessControl],
  async (req, res) => {
    const perPage = 15
    const page = req.query.page || 1
    const skip = perPage * page - perPage

    const course = await Course.find()
      .skip(skip)
      .limit(perPage)
      .lean()

    if (course) {
      const pages = await Course.find().countDocuments()
      res.render('courses/index', {
        title: 'Courses',
        breadcrumbs: true,
        search_bar: false,
        // dept: dept,
        course: course,
        current: parseInt(page),
        pages: Math.ceil(pages / perPage)
      })
    } else if (dept) {
      res.render('courses/index', {
        title: 'Courses',
        breadcrumbs: true,
        search_bar: true,
        dept: dept
      })
    } else {
      req.flash('error_msg', 'No department found')
      res.redirect('/')
    }
  }
)

router.get(
  '/add',
  [ensureAuthenticated, isAdmin, createAccessControl],
  async (req, res) => {
    const dept = await Department.find()

    if (dept) {
      res.render('courses/add', {
        title: 'Add New Course',
        breadcrumbs: true,
        dept: dept
      })
    }
  }
)

router.post(
  '/add',
  [ensureAuthenticated, isAdmin, createAccessControl],
  async (req, res) => {
    let errors = []
    const dept = await Department.find()

    const { error } = validateCourse(req.body)

    if (error) {
      errors.push({
        text: error.details[0].message
      })
      res.render('courses/add', {
        title: 'Add New Course',
        breadcrumbs: true,
        errors: errors,
        body: req.body,
        dept: dept
      })
    } else {
      let startDate = moment(req.body.startDate).format(
        'MMMM Do YYYY, h:mm:ss a'
      )
      let endDate = moment(req.body.endDate).format('MMMM Do YYYY, h:mm:ss a')

      const course = new Course({
        departmentName: req.body.departmentName,
        courseName: req.body.courseName,
        courseDuration: req.body.courseDuration,
        startDate: startDate,
        endDate: endDate,
        courseFee: req.body.courseFee,
        intake: req.body.intake
      })

      try {
        const result = await course.save()

        if (result) {
          req.flash('success_msg', 'Course saved successfully.')
          res.redirect('/courses')
        }
      } catch (ex) {
        for (field in ex.errors) {
          errors.push({
            text: ex.errors[field].message
          })
        }
        res.render('courses/add', {
          title: 'Add New Course',
          breadcrumbs: true,
          errors: errors,
          body: req.body,
          dept: dept
        })
      }
    }
  }
)

router.get(
  '/edit',
  [ensureAuthenticated, isAdmin, updateAccessControl],
  async (req, res) => {
    const course = await Course.findOne({
      _id: req.query.id
    }).lean()
    const student = await Student.find({
      CurrentClass: course.displayName,
      TC: false
    }).lean()

    if (course) {
      res.render('courses/edit', {
        title: 'Edit Course',
        breadcrumbs: true,
        course: course,
        students: student
      })
    }
  }
)

router.put(
  '/:id',
  [ensureAuthenticated, isAdmin, updateAccessControl],
  async (req, res) => {
    let updateArr = []
    for (let i = 0; i < req.body.name.length; i++) {
      updateArr.push({
        name: req.body.name[i],
        passingMarks: req.body.passingMarks[i],
        maxMarks: req.body.maxMarks[i],
        examDate: moment(req.body.examDate[i]).format('LL'),
        markingType: req.body.markingType[i]
      })
    }
    await Course.update(
      {
        _id: req.params.id
      },
      {
        $set: {
          subjects: updateArr
        }
      }
    )
    req.flash('success_msg', 'Course Updated Successfully.')
    res.redirect('/courses')
  }
)

router.delete(
  '/:id',
  [ensureAuthenticated, isAdmin, deleteAccessControl],
  async (req, res) => {
    const result = await Course.remove({
      _id: req.params.id
    })

    if (result) {
      req.flash('success_msg', 'Record deleted successfully.')
      res.send('/courses')
    }
  }
)

router.get(
  '/report',
  [ensureAuthenticated, isAdmin, deleteAccessControl],
  async (req, res) => {
    const course = await Course.findOne({
      _id: req.query.id
    }).lean()
    const student = await Student.find({
      CurrentClass: course.displayName,
      TC: false
    }).lean()
    for (let i = 0; i < student.length; i++) {
      if (student[i].academicDetails) {
        let findAcademicDetailsIndex = student[i].academicDetails.findIndex(
          el =>
            el.class === course.displayName && el.examType === req.query.type[0]
        )
        if (findAcademicDetailsIndex !== -1) {
          let findSubject = student[i].academicDetails[
            findAcademicDetailsIndex
          ].subjects.find(el => el.name === req.query.subject)

          if (findSubject) {
            student[i].marks = findSubject.marks
          }
        }
      }
    }
    res.render('courses/report', {
      title: 'Add Marks',
      breadcrumbs: true,
      course: course,
      students: student,
      subject: req.query.subject,
      type: req.query.type
    })
  }
)

router.post(
  '/report',
  [ensureAuthenticated, isAdmin, deleteAccessControl],
  async (req, res) => {
    
    const course = await Course.findOne({
      _id: req.query.id
    }).lean()
   
    const subject = course.subjects.find( el => el.name === req.query.subject)
   
    const student = await Student.find({
      CurrentClass: course.displayName,
      TC: false
    }).lean()

    for (let i = 0; i < student.length; i++) {
      if (student[i].academicDetails) {
        let findAcademicDetailsIndex = student[i].academicDetails.findIndex(
          el =>
            el.class === course.displayName && el.examType === req.query.type[0]
        )
        if (findAcademicDetailsIndex === -1) {
          student[i].academicDetails.push({
            class: course.displayName,
            examType: req.query.type[0],
            subjects: []
          })
          findAcademicDetailsIndex = student[i].academicDetails.length - 1
        }

        let findSubject = student[i].academicDetails[
          findAcademicDetailsIndex
        ].subjects.find(el => el.name === req.query.subject)
        if (findSubject) {
          findSubject.marks = req.body.marks[i]
          findSubject.maxMarks = subject.maxMarks
          findSubject.passingMarks = subject.passingMarks
        } else {
          findSubject = {
            name: req.query.subject,
            marks: req.body.marks[i],
            maxMarks: subject.maxMarks, passingMarks: subject.passingMarks
          }
          student[i].academicDetails[findAcademicDetailsIndex].subjects.push(
            findSubject
          )
       }

        const up = {
          class: course.displayName,
          examType: req.query.type[0],
          subjects:
            student[i].academicDetails[findAcademicDetailsIndex].subjects
        }
        student[i].academicDetails[findAcademicDetailsIndex] = up
        await Student.update(
          {
            _id: student[i]._id
          },
          {
            $set: {
              academicDetails: student[i].academicDetails
            }
          }
        )
      } else {
        let academicDetails = []
        details = {
          class: course.displayName,
          examType: req.query.type[0],
          subjects: [{ name: req.query.subject, marks: req.body.marks[i], maxMarks: subject.maxMarks, passingMarks: subject.passingMarks }]
        }
        academicDetails.push(details)
        await Student.update(
          {
            _id: student[i]._id
          },
          {
            $set: {
              academicDetails: academicDetails
            }
          }
        )
      }
    }

    req.flash('success_msg', 'Information saved successfully.')
    res.redirect(`/courses/edit?id=${req.query.id}`)
  }
)

router.get(
  '/admitcard',
  [ensureAuthenticated, isAdmin, deleteAccessControl],
  async (req, res) => {
    const course = await Course.findOne({
      _id: req.query.id
    }).lean()
    const student = await Student.find({
      CurrentClass: course.displayName,
      TC: false
    }).lean()
    const course2 = [] 
    for(let i=0;i<course.subjects.length;i++){
      if(course.subjects[i].examDate === undefined || course.subjects[i].examDate.trim() === "" || course.subjects[i].examDate === "Invalid date"){
        console.log("-----------");
      }else{
        course2.push(course.subjects[i])
      }
      
    }
    course.subjects = course2
    console.log("====== ", course);
    const x = await print.printAdmitCard(student, course)
    let downloadArr = []
    x.forEach(file => {
      const filePath = file.filename.split('/')
      const fileName = filePath.pop()
      downloadArr.push({ path: file.filename, name: fileName })
    })
    res.zip(downloadArr, 'admitCard.zip')
  }
)

router.get(
  '/reportcard',
  [ensureAuthenticated, isAdmin, deleteAccessControl],
  async (req, res) => {
    const course = await Course.findOne({
      _id: req.query.id
    }).lean()
    const students = await Student.find({
      CurrentClass: course.displayName,
      TC: false
    }).lean()

    let nSubLen
    let gSubLen

    for (let i = 0; i < students.length; i++) {
      let findAcademicDetailsIndex = students[i].academicDetails.findIndex(
        el =>
          el.class === course.displayName && el.examType === req.query.type[0]
      )

      students[i].subjects =
        students[i].academicDetails[findAcademicDetailsIndex].subjects
      delete students[i].academicDetails

      students[i].subjects.forEach(subject => {
        const sub = course.subjects.find(el => el.name === subject.name)
        subject.maxMarks = sub.maxMarks
        subject.passingMarks = sub.passingMarks
        subject.markingType = sub.markingType
      })
      let gSubs = []
      let nSubs = []
      let totalMarksObtained = 0
      let totalMaxMarks = 0
      students[i].result = 'PASS'
      students[i].subjects.forEach(subject => {
        if (subject.markingType === 'Grade') gSubs.push(subject)
        if (subject.markingType === 'Number') nSubs.push(subject)
      })

      nSubs.forEach(sub => {
        if (!isNaN(sub.marks)) totalMarksObtained += +sub.marks
        if (isNaN(sub.marks) || +sub.marks < sub.passingMarks)
          students[i].result = 'FAIL'
        totalMaxMarks += sub.maxMarks
      })

      students[i].gSubs = gSubs
      students[i].nSubs = nSubs
      students[i].totalMaxMarks = totalMaxMarks
      students[i].totalMarksObtained = totalMarksObtained
      students[i].totalMarksObtainedWord = converter.toWords(totalMarksObtained)
      students[i].percentage = (
        (totalMarksObtained / totalMaxMarks) *
        100
      ).toFixed(2)
      nSubLen = nSubs.length > 6 ? nSubs.length : 6
      gSubLen = gSubs.length === 0 ? 0 : gSubs.length + 5
      delete students[i].subjects
    }
    let dummyLenArr = []
    for (let i = 0; i < 19 - nSubLen - gSubLen; i++) {
      dummyLenArr.push(i)
    }
    const x = await print.printMarkSheet(
      students,
      course,
      dummyLenArr,
      req.query.type
    )
    let downloadArr = []
    x.forEach(file => {
      const filePath = file.filename.split('/')
      const fileName = filePath.pop()
      downloadArr.push({ path: file.filename, name: fileName })
    })
    res.zip(downloadArr, 'marksheets.zip')
  }
)

// GET Courses AJAX
router.get('/getCourses', (req, res) => {
  res.render('courses/getCourses', {
    title: 'Get Courses By Dept',
    breadcrumbs: true
  })
})

module.exports = router
