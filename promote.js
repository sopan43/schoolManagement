// Connecting to MongoDB...
const mongoose = require('mongoose');
const { Student } = require('./models/student')
var exportToExcel = require('export-to-excel');


// const url = `mongodb://sopan:sopan@school-shard-00-00.jyw4b.mongodb.net:27017,school-shard-00-01.jyw4b.mongodb.net:27017,school-shard-00-02.jyw4b.mongodb.net:27017/sdmschool?ssl=true&replicaSet=atlas-w3e74l-shard-0&authSource=admin&retryWrites=true&w=majority`;

const url = `mongodb://sopanmittal43atlas:sopan@ac-7mqzik7-shard-00-00.wnzl4kq.mongodb.net:27017,ac-7mqzik7-shard-00-01.wnzl4kq.mongodb.net:27017,ac-7mqzik7-shard-00-02.wnzl4kq.mongodb.net:27017/sdmschool?ssl=true&replicaSet=atlas-vpq55e-shard-0&authSource=admin&retryWrites=true&w=majority`;

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
    for(let i=9;i>0;i--){
        if(i===9 || i===6 || i===5 || i===4 || i===8 || i===7){
            console.log("1111");
            const student = await Student.updateMany({CurrentClass: `${i}th`, TC: false},
            { $set: { CurrentClass: `${i+1}th`}}).lean()
      
          console.log("--- student", student);  
        }
        if(i===3){
            const student = await Student.updateMany({CurrentClass: `3rd`, TC: false},
            { $set: { CurrentClass: `4th`}}).lean()
        }
        if(i===2){
            const student = await Student.updateMany({CurrentClass: `2nd`, TC: false},
            { $set: { CurrentClass: `3rd`}}).lean()
        }
        if(i===1){
            const student = await Student.updateMany({CurrentClass: `1st`, TC: false},
            { $set: { CurrentClass: `2nd`}}).lean()
        }
    }
      
   await Student.updateMany({CurrentClass: `U.K.G.`, TC: false},
    { $set: { CurrentClass: `1st`}}).lean()
    await Student.updateMany({CurrentClass: `L.K.G.`, TC: false},
    { $set: { CurrentClass: `U.K.G`}}).lean()
    await Student.updateMany({CurrentClass: `Nursery`, TC: false},
    { $set: { CurrentClass: `L.K.G.`}}).lean()



    //DELETE ME
    // const student = await Student.updateMany({CurrentClass: `10th`},
    //         { $set: { TC: false}}).sort({CurrentClass: 1}).lean()
        
    }

    