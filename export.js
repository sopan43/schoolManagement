// Connecting to MongoDB...
const mongoose = require('mongoose');
const { Student } = require('./models/student')
var exportToExcel = require('export-to-excel');


const url = `mongodb://sopan:sopan@school-shard-00-00.jyw4b.mongodb.net:27017,school-shard-00-01.jyw4b.mongodb.net:27017,school-shard-00-02.jyw4b.mongodb.net:27017/sdmschool?ssl=true&replicaSet=atlas-w3e74l-shard-0&authSource=admin&retryWrites=true&w=majority`;

// const url = `mongodb://sopanmittal43atlas:sopan@ac-7mqzik7-shard-00-00.wnzl4kq.mongodb.net:27017,ac-7mqzik7-shard-00-01.wnzl4kq.mongodb.net:27017,ac-7mqzik7-shard-00-02.wnzl4kq.mongodb.net:27017/sdmschool?ssl=true&replicaSet=atlas-vpq55e-shard-0&authSource=admin&retryWrites=true&w=majority`;

const connectionParams={
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true 
}
mongoose.connect(url,connectionParams)
    .then( () => {
        console.log('Connected to database ')
        getFinalResult()
    })
    .catch( (err) => {
        console.error(`Error connecting to the database. \n${err}`);
    })



   async function getFinalResult() {
        const student = await Student.find({}).sort({CurrentClass: 1}).lean()
        console.log(student[0]);

        let samapleData = []
        student.forEach(x => {
            samapleData.push({
                sssmid: x.SSSID,
                Gender: x.Gender,
                CurrentClass: x.CurrentClass,
                Name: `${x.StudentName.FirstName} ${x.StudentName.LastName} `,
                Category: x.Category,
                DateOfBirth: x.DateOfBirth,
                MothersName: x.MothersName,
                FathersName: x.FathersName,
                Aadhar: x.Aadhar,
                AdmissionNumber: x.AdmissionNumber,
                Address: `${x.Address.Address_Line_1} ${x.Address.Address_Line_2} ${x.Address.City} ${x.Address.State} `,
            })
        })


        setTimeout(() => {
            console.log("Delayed for 1 second.");
            exportToExcel.exportXLSX({
                filename: 'studentdata',
                sheetname: 'sheet1',
                title: [
                    {
                    "fieldName": "sssmid",
                    "displayName": "SSSM ID",
                    "type": "string"  
                }
                ,
                {
                    "fieldName": "CurrentClass",
                    "displayName": "Grade-Class",
                    "type": "string"  
                }
                ,
                {
                    "fieldName": "Name",
                    "displayName": "Name Of Student",
                    "type": "string"  
                }
                ,
                {
                    "fieldName": "Gender",
                    "displayName": "Gender",
                    "type": "string"  
                }
                ,
                {
                    "fieldName": "Category",
                    "displayName": "Cast",
                    "type": "string"  
                }
                ,
                {
                    "fieldName": "DateOfBirth",
                    "displayName": "DOB",
                    "type": "string"  
                }
                ,
                {
                    "fieldName": "MothersName",
                    "displayName": "Mother Name",
                    "type": "string"  
                }
                ,
                {
                    "fieldName": "FathersName",
                    "displayName": "Father Name",
                    "type": "string"  
                }
                ,
                {
                    "fieldName": "Aadhar",
                    "displayName": "Aadhar",
                    "type": "string"  
                }
                ,
                {
                    "fieldName": "Address",
                    "displayName": "Address",
                    "type": "string"  
                }
                ,
                {
                    "fieldName": "AdmissionNumber",
                    "displayName": "AdmissionNumber",
                    "type": "string"  
                }

            ],
                data: samapleData
            })
          }, "1000")

        
    }

    