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

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const getGeneralRemarksHeightMm = ({
  numberSubjectCount,
  gradeSubjectCount,
  hasGradingSubjects
}) => {
  // Estimated rendered rows on marksheet (header + totals + optional grading rows).
  const fixedRows = 10
  const gradingRows = hasGradingSubjects ? 1 + gradeSubjectCount : 0
  const renderedRows = numberSubjectCount + fixedRows + gradingRows


  // Smaller remark box when rows are many, bigger when rows are fewer.
  const minHeight = 12
  const maxHeight = 80
  const computedHeight = 78 - renderedRows * 3
  console.log('renderedRows, gradingRows, numberSubjectCount  ', renderedRows, gradingRows, numberSubjectCount, computedHeight)
  return {
    renderedRows,
    generalRemarksMinHeight: `${clamp(computedHeight, minHeight, maxHeight)}mm`
  }
}
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

  printAdmitCard: async (students, course, settings) => {
    return new Promise((resolve, reject) => {
      // Fix: string comparison fails for "May 3" vs "May 27" — use Date objects
      course.subjects.sort((a, b) => new Date(a.examDate) - new Date(b.examDate))

      // Scale subject column font down so even 15 subjects never overflow 136mm.
      // contentMinHeight fills the available space so there is no wasted whitespace.
      const n = course.subjects.length
      let subjectFontSize, subjectLineHeight, contentMinHeight
      if (n <= 8) {
        subjectFontSize = '14px';  subjectLineHeight = '1.35'; contentMinHeight = '50mm'
      } else if (n <= 11) {
        subjectFontSize = '13px';  subjectLineHeight = '1.3';  contentMinHeight = '44mm'
      } else {
        subjectFontSize = '12px';  subjectLineHeight = '1.25'; contentMinHeight = '40mm'
      }

      // Group students into pairs so 2 admit cards fit on one A4 page
      const pairs = []
      for (let i = 0; i < students.length; i += 2) {
        pairs.push({
          students: students.slice(i, i + 2),
          isLast: i + 2 >= students.length
        })
      }

      const className = course.displayName.replace(/[^a-zA-Z0-9]/g, '-')
      const dir = path.join(__dirname, 'Admit-Card')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      const filePath = path.join(dir, `${className}-Admit-Cards.pdf`)
      const document = {
        html: admitcard,
        data: {
          pairs,
          course,
          subs: course.subjects,
          subjectFontSize,
          subjectLineHeight,
          contentMinHeight,
          settings: settings || {}
        },
        path: filePath
      }
      pdf.create(document, options)
        .then(result => resolve([result]))
        .catch(reject)
    })
  },

  printMarkSheet: async (students, course, dummyLenArr, examType) => {
    return new Promise((resolve, reject) => {
      if (!students || students.length === 0) return reject(new Error('No students'))

      // All students in the same class share the same subject structure — compute layout once
      const ref = students.find(s => Array.isArray(s.nSubs) && s.nSubs.length > 0) || students[0]
      const nSubCount = Array.isArray(ref.nSubs) ? ref.nSubs.length : 0
      const gSubCount = Array.isArray(ref.gSubs) ? ref.gSubs.length : 0
      const hasNumberSubjects = nSubCount > 0
      const hasGradingSubjects = gSubCount > 0
      const isLongSheet = nSubCount + gSubCount > 12
      const { generalRemarksMinHeight } = getGeneralRemarksHeightMm({
        numberSubjectCount: nSubCount,
        gradeSubjectCount: gSubCount,
        hasGradingSubjects
      })

      const className = course.displayName.replace(/[^a-zA-Z0-9]/g, '-')
      const dir = path.join(__dirname, 'Mark-sheet')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      const filePath = path.join(dir, `${className}-Mark-Sheets.pdf`)
      const document = {
        html: markSheet,
        data: {
          students,
          course,
          hasNumberSubjects,
          hasGradingSubjects,
          isLongSheet,
          generalRemarksMinHeight,
          examType
        },
        path: filePath
      }
      pdf.create(document, options)
        .then(result => resolve([result]))
        .catch(reject)
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
