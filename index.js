import express, {json} from 'express'
import chalk from 'chalk';
import cors from 'cors'
import Joi from 'joi';
import { MongoClient } from 'mongodb';
import dayjs from 'dayjs';

const app = express();
app.use(json());
app.use(cors());

let user = null
let now = dayjs().format("hh:mm:ss")

let database = null;
const mongoClient = new MongoClient("mongodb://localhost:27017");
const promise = mongoClient.connect()

promise.then(() => {
    database = mongoClient.db("bate-papo-uol")
    console.log(chalk.bold.yellowBright("Banco de dados conectado"))
})

promise.catch(e => console.log(chalk.red("Xabu"), e));


const schema = Joi.object().keys({
    name: Joi.string().min(3)
});

app.post("/participants", async (req, res) => {
    
    const {name} = req.body    
    
    const {error, value} = schema.validate({name});
    
    if(error !== undefined){
        res.sendStatus(422)
        return;
    }
    
    const participants = {name, lastStatus: Date.now()}

    try{  
    
        const participantes = await database.collection("participants").insertOne(participants)
        res.sendStatus(201)
    
    } catch(e) {
        
        console.log(chalk.pink("deu ruim"), e);
        res.status(500)

    }  

})

app.get("/participants", async (req, res) => {
    user = req.headers.user
    try {

        const participantes = await database.collection("participants").find({}).toArray();
        res.send(participantes)    

    } catch(e){

        console.log(chalk.bold.pink("Deu ruim"), e)
        res.sendStatus(500)
    }

})

app.post("/messages", async (req, res) => {        
    const {to, text, type} = req.body
    const message = {
        from: user,
        to: to,
        text: text,
        type: type,
        time: now
    }

    console.log(message)

    try{  
    
        const messages = await database.collection("message").insertOne(message)
        res.sendStatus(201)
    
    } catch(e) {
        
        console.log(chalk.pink("deu ruim"), e);
        res.status(500)

    }  


})

app.listen(5000 ,() =>{
console.log(chalk.bold.blue('Server listening on port 5000'));
})