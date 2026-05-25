const express = require('express')
const router = express.Router()
const moment = require('moment')
const fs = require('fs')
const path = require('path')
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

const settingsPath = path.join(__dirname, '..', 'data', 'examSettings.json')

function loadSettings() {
  const defaults = {
    schoolName: 'S.D.M. Public High School',
    schoolAddress: 'M.S. Road, Morena',
    logoUrl: 'https://res.cloudinary.com/tsp/image/upload/v1664338574/sampleImage.png',
    examTime: '09:00 a.m – 11:30 a.m.',
    examTitle: 'Annual Examination 2025-26',
    instructions: [
      'Students have to come with their pencil box only.',
      'Leave for preparation will be on 7th of March 2026.',
      'Result will be declared on 28th of March 2026.',
      'The School will reopen on 1st of April 2026.'
    ]
  }
  try {
    return Object.assign({}, defaults, JSON.parse(fs.readFileSync(settingsPath, 'utf8')))
  } catch (e) {
    return defaults
  }
}

function deleteGeneratedFilesOnce(files) {
  let hasCleaned = false

  return () => {
    if (hasCleaned) return
    hasCleaned = true

    files.forEach(file => {
      if (!file || !file.filename) return

      fs.unlink(file.filename, err => {
        if (err && err.code !== 'ENOENT') {
          console.error(`Unable to delete temp file: ${file.filename}`, err)
        }
      })
    })
  }
}

function buildZipDownloadList(files) {
  return files.map(file => ({
    path: file.filename,
    name: path.basename(file.filename)
  }))
}

function sendZipAndCleanup(res, files, zipName) {
  const cleanup = deleteGeneratedFilesOnce(files)
  res.once('finish', cleanup)
  res.once('close', cleanup)
  res.zip(buildZipDownloadList(files), zipName)
}

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
        students: student,
        courseInstructionsText: (course.instructions || []).join('\n')
      })
    }
  }
)

router.put(
  '/:id/examdates',
  [ensureAuthenticated, isAdmin, updateAccessControl],
  async (req, res) => {
    const course = await Course.findOne({ _id: req.params.id }).lean()
    const dates = [].concat(req.body.examDate || [])
    const updatedSubjects = course.subjects.map((sub, i) => {
      const raw = dates[i]
      const formatted = raw ? moment(raw).format('LL') : ''
      return Object.assign({}, sub, { examDate: formatted })
    })
    const instructions = (req.body.instructions || '').split('\n').map(s => s.trim()).filter(Boolean)
    await Course.update({ _id: req.params.id }, { $set: { subjects: updatedSubjects, instructions } })
    req.flash('success_msg', 'Exam schedule saved.')
    res.redirect(`/courses/edit?id=${req.params.id}`)
  }
)

router.put(
  '/:id',
  [ensureAuthenticated, isAdmin, updateAccessControl],
  async (req, res) => {
    const existing = await Course.findOne({ _id: req.params.id }).lean()
    const names = [].concat(req.body.name || [])
    let updateArr = []
    for (let i = 0; i < names.length; i++) {
      updateArr.push({
        name: names[i],
        passingMarks: req.body.passingMarks[i],
        maxMarks: req.body.maxMarks[i],
        examDate: existing && existing.subjects[i] ? existing.subjects[i].examDate : '',
        markingType: req.body.markingType[i]
      })
    }
    await Course.update(
      { _id: req.params.id },
      { $set: { subjects: updateArr } }
    )
    req.flash('success_msg', 'Subject configuration saved.')
    res.redirect(`/courses/edit?id=${req.params.id}`)
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
      }else{
        course2.push(course.subjects[i])
      }
      
    }
    course.subjects = course2
    const settings = loadSettings()
    const activeInstructions = (course.instructions && course.instructions.length > 0)
      ? course.instructions
      : settings.instructions
    settings.numberedInstructions = activeInstructions.map((text, i) => ({ num: i + 1, text }))
    const [file] = await print.printAdmitCard(student, course, settings)
    const downloadName = `${course.displayName.replace(/[^a-zA-Z0-9]/g, '-')}-Admit-Cards.pdf`
    res.download(file.filename, downloadName, () => {
      fs.unlink(file.filename, () => {})
    })
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

      const academicDetail =
        findAcademicDetailsIndex >= 0
          ? students[i].academicDetails[findAcademicDetailsIndex]
          : null

      students[i].subjects = academicDetail && Array.isArray(academicDetail.subjects)
        ? academicDetail.subjects
        : []
      delete students[i].academicDetails

      students[i].subjects.forEach(subject => {
        const sub = course.subjects.find(el => el.name === subject.name)
        if (!sub) return
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
      students[i].percentage =
        totalMaxMarks > 0
          ? ((totalMarksObtained / totalMaxMarks) * 100).toFixed(2)
          : '0.00'
      if (nSubs.length === 0) students[i].result = 'NA'
      nSubLen = nSubs.length > 6 ? nSubs.length : 6
      gSubLen = gSubs.length === 0 ? 0 : gSubs.length + 5
      delete students[i].subjects
    }
    let dummyLenArr = []
    for (let i = 0; i < 22 - nSubLen - gSubLen; i++) {
      dummyLenArr.push(i)
    }
    const x = await print.printMarkSheet(
      students,
      course,
      dummyLenArr,
      req.query.type
    )
    sendZipAndCleanup(res, x, 'marksheets.zip')
  }
)


router.get(
  '/reportcardFinal',
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
    const numberSubs =   getAllNumberSubs(course.subjects)
    console.log('numberSubs   ',numberSubs);
    for (let i = 0; i <  students.length; i++) {
      let findAcademicDetailsIndexes = students[i].academicDetails.map(
        el =>
          el.class === course.displayName ? el : ''
      ).filter(String)

     

      
      // students[i].subjects =
      //   students[i].academicDetails[findAcademicDetailsIndexes[0]].subjects
      // delete students[i].academicDetails

   

      // students[i].subjects.forEach(subject => {
      //   const sub = course.subjects.find(el => el.name === subject.name)
      //   subject.maxMarks = sub.maxMarks
      //   subject.passingMarks = sub.passingMarks
      //   subject.markingType = sub.markingType
      // })
      // let gSubs = []
      let {finalArr:nSubs, totalMarksObtained, grandTotalMaxMarks} = getFinalResult(findAcademicDetailsIndexes, numberSubs )
      let gSubs = getFinalGradeResult(findAcademicDetailsIndexes)
      // let totalMarksObtained = 0
      // let totalMaxMarks = 0
      // students[i].result = 'PASS'
      // students[i].subjects.forEach(subject => {
      //   if (subject.markingType === 'Grade') gSubs.push(subject)
      //   if (subject.markingType === 'Number') nSubs.push(subject)
      // })

      // nSubs.forEach(sub => {
      //   if (!isNaN(sub.marks)) totalMarksObtained += +sub.marks
      //   if (isNaN(sub.marks) || +sub.marks < sub.passingMarks)
      //     students[i].result = 'FAIL'
      //   totalMaxMarks += sub.maxMarks
      // })

      students[i].gSubs = gSubs
      students[i].nSubs = nSubs
      students[i].totalMaxMarks = grandTotalMaxMarks
      students[i].totalMarksObtained = totalMarksObtained
      students[i].totalMarksObtainedWord = converter.toWords(totalMarksObtained)
      students[i].percentage =
        grandTotalMaxMarks > 0
          ? ((totalMarksObtained / grandTotalMaxMarks) * 100).toFixed(2)
          : '0.00'
      students[i].result = getResultFromNumberSubjects(nSubs)
      nSubLen = nSubs.length > 6 ? nSubs.length : 6
      // gSubLen = gSubs.length === 0 ? 0 : gSubs.length + 5
      // delete students[i].subjects
    }
    let dummyLenArr = []
    for (let i = 0; i < 10 - nSubLen; i++) {
      dummyLenArr.push(i)
    }




    const x = await print.printMarkSheet(
      students,
      course,
      dummyLenArr,
      req.query.type
    )
    sendZipAndCleanup(res, x, 'marksheets.zip')

    // res.send();

  }
)

function getAllNumberSubs(subjects){
  let numberSubs = [];
  subjects.forEach(el => {
    if(el.markingType === 'Number'){
      numberSubs.push(el.name)
    }
  })
  return numberSubs
}

function getFinalResult(academicDetailsForCurrentClass, numberSubs) {
  let allSubsArr = [];
  let finalArr = [];
  academicDetailsForCurrentClass.forEach(el => {
 
   allSubsArr.push(...el.subjects)
  })
  
  const filterArr = allSubsArr.filter(el =>  numberSubs.indexOf(el.name) !== -1 ? 1: 0 )
  let totalMarksObtained = 0
  let grandTotalMaxMarks = 0
  numberSubs.forEach(sub => {
    let allOccSub = filterArr.map( el => el.name === sub ? el : '').filter(String)
    let totalMarks = 0
    let totalMaxMarks = 0
    let totalPassingMarks = 0
    allOccSub.forEach(el => {
      if (!isNaN(el.marks))  totalMarks += +el.marks
      totalMaxMarks += +el.maxMarks
      totalPassingMarks += +el.passingMarks
    })
    totalMarksObtained += totalMarks
    grandTotalMaxMarks += totalMaxMarks
    finalArr.push({name: sub, marks: totalMarks,maxMarks:totalMaxMarks , passingMarks:totalPassingMarks})
  })
return {finalArr, totalMarksObtained, grandTotalMaxMarks};
}

function getFinalGradeResult(academicDetailsForCurrentClass) {
  let allSubsArr = []
  academicDetailsForCurrentClass.forEach(el => {
    if (Array.isArray(el.subjects)) allSubsArr.push(...el.subjects)
  })

  const gradeSubs = allSubsArr.filter(el => el.markingType === 'Grade')
  const uniqueMap = {}

  gradeSubs.forEach(sub => {
    if (!uniqueMap[sub.name]) uniqueMap[sub.name] = []
    uniqueMap[sub.name].push(sub.marks)
  })

  return Object.keys(uniqueMap).map(name => ({
    name,
    marks: uniqueMap[name][uniqueMap[name].length - 1] || 'NA'
  }))
}

function getResultFromNumberSubjects(numberSubjects) {
  if (!Array.isArray(numberSubjects) || numberSubjects.length === 0) return 'NA'

  for (const sub of numberSubjects) {
    if (isNaN(sub.marks) || +sub.marks < +sub.passingMarks) return 'FAIL'
  }

  return 'PASS'
}


router.get(
  '/examcalendar',
  [ensureAuthenticated, isAdmin, readAccessControl],
  async (req, res) => {
    const courses = await Course.find().lean()
    const schedule = []
    courses.forEach(course => {
      course.subjects.forEach(sub => {
        if (sub.examDate && sub.examDate.trim() && sub.examDate !== 'Invalid date') {
          schedule.push({
            className: course.displayName,
            courseId: course._id,
            subject: sub.name,
            examDate: sub.examDate,
            sortKey: new Date(sub.examDate).valueOf() || 0
          })
        }
      })
    })
    schedule.sort((a, b) => a.sortKey - b.sortKey)
    res.render('courses/examcalendar', {
      title: 'Exam Calendar',
      breadcrumbs: true,
      courses,
      schedule
    })
  }
)

router.get(
  '/admitsettings',
  [ensureAuthenticated, isAdmin, updateAccessControl],
  (req, res) => {
    const settings = loadSettings()
    settings.instructionsText = settings.instructions.join('\n')
    res.render('courses/admitsettings', {
      title: 'Admit Card Settings',
      breadcrumbs: true,
      settings
    })
  }
)

router.post(
  '/admitsettings',
  [ensureAuthenticated, isAdmin, updateAccessControl],
  (req, res) => {
    const settings = {
      schoolName: req.body.schoolName || '',
      schoolAddress: req.body.schoolAddress || '',
      logoUrl: req.body.logoUrl || '',
      examTime: req.body.examTime || '',
      examTitle: req.body.examTitle || '',
      instructions: (req.body.instructions || '').split('\n').map(s => s.trim()).filter(Boolean)
    }
    const dataDir = path.join(__dirname, '..', 'data')
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    req.flash('success_msg', 'Admit card settings saved.')
    res.redirect('/courses/admitsettings')
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
