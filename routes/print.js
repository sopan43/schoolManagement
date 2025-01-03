const express = require('express')
const pdf = require('pdf-creator-node')

const router = express.Router()

const pdfMake = require('../pdfMake/pdfMake')
const vfsFonts = require('../pdfMake/vfs_fonts')

pdfMake.vfs = vfsFonts.pdfMake.vfs

///
var fs = require('fs')
const path = require('path')

const html = fs.readFileSync(
  path.join(__dirname, '../views/pdfTemplates/template.html'),
  'utf-8'
)
const tcTemplate = fs.readFileSync(
  path.join(__dirname, '../views/pdfTemplates/tcTemplate.html'),
  'utf-8'
)

const admitcard = fs.readFileSync(
  path.join(__dirname, '../views/pdfTemplates/admitcard.html'),
  'utf-8'
)

const markSheet = fs.readFileSync(
  path.join(__dirname, '../views/pdfTemplates/markSheet.html'),
  'utf-8'
)

const { Student } = require('../models/student')


const {
  ensureAuthenticated,
  isAdmin,
  isLoggedIn,
  createAccessControl,
  readAccessControl,
  updateAccessControl,
  deleteAccessControl
} = require('../helpers/auth')

const options = require('../helper/options')
const array = require('joi/lib/types/array')
// Student Detail's Route
// const generatePdf = async () => {
router.get(
  '/details',
  [ensureAuthenticated, isAdmin, readAccessControl],
  async (req, res) => {
    const student = await Student.findOne({
      _id: req.query.id
    }).lean()

    const filePath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'Admission Forms',
      student.StudentName.FirstName
    )
    const document = {
      html: html,
      data: {
        student: student
      },
      path: filePath + '.pdf'
    }
    pdf
      .create(document, options)
      .then(res => {
        console.log(res)
      })
      .catch(error => {
        console.log(error)
      })
    req.flash('success_msg', 'Student Downloading')
    res.redirect('#')
  }
)

module.exports = {
  printTC: student => {
    return new Promise((resolve, reject) => {
      const filePath = path.join(
        __dirname,
        'TC',
        `${student.StudentName.FirstName}-TC`
      )
      const document = {
        html: tcTemplate,
        data: {
          student: student
        },
        path: filePath + '.pdf'
      }
      pdf
        .create(document, options)
        .then(res => {
          resolve(res)
        })
        .catch(error => {
          console.log(error)
        })
    })
  },

  printAdmitCard: async (students, course) => {
    return new Promise((resolve, reject) => {
      let i
      let aa = []
      course.subjects.sort((a,b)=> {
        if ( a.examDate < b.examDate ){
          return -1;
        }
        if ( a.examDate > b.examDate ){
          return 1;
        }
        return 0;
      })
      
      students.forEach(async student => {
        // console.log(student, '-----')
        const filePath = path.join(
          __dirname,
          'Admit-Card',
          `${student.AdmissionNumber}-${student.StudentName.FirstName}-Admit-Card`
        )
        const document = {
          html: admitcard,
          data: {
            student: student,
            course: course,
            subs: course.subjects
          },
          path: filePath + '.pdf'
        }
        aa.push(pdf.create(document, options))
      })
      // }
      Promise.all(aa).then(values => {
        // console.log(values)
        resolve(values)
      })
    })
  },

  printMarkSheet: async (students, course, dummyLenArr, examType) => {
    return new Promise((resolve, reject) => {
      let i
      let aa = []
      // for (i = 0; i < students.length; i++) {
      students.forEach(async student => {
        const filePath = path.join(
          __dirname,
          'Mark-sheet',
          `${student.AdmissionNumber}-${student.StudentName.FirstName}-${student.StudentName.LastName}-Mark-Sheet`
        )
        const document = {
          html: markSheet,
          data: {
            student: student,
            course: course,
            nSubs: student.nSubs,
            dummyLenArr: dummyLenArr,
            examType
          },
          path: filePath + '.pdf'
        }
        aa.push(pdf.create(document, options))
      })
      // }
      Promise.all(aa).then(values => {
        // console.log(values)
        resolve(values)
      })
    })
  }

  // printTC: student => {
  //   return new Promise((resolve, reject) => {
  //     const filePath = path.join(
  //       __dirname,
  //       'TC',
  //       `${student.StudentName.FirstName}-TC`
  //     )
  //     const document = {
  //       html: tcTemplate,
  //       data: {
  //         users: users,
  //       },
  //       path: filePath + '.pdf'
  //     }
  //     pdf
  //       .create(document, options)
  //       .then(res => {
  //         resolve(res)
  //       })
  //       .catch(error => {
  //         console.log(error)
  //       })
  //   })
  // },
}
