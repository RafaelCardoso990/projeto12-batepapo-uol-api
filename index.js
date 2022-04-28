import express from 'express'
import chalk from 'chalk';
import cors from 'cors'
import Joi from 'joi';
import { MongoClient } from 'mongodb';

const app = express();
app.use(express.json());
app.use(cors());

let database = null;
const mongoClient = new MongoClient("mongodb://127.0.0.1:27017");
const promise = mongoClient.connect()

promise.then(response => {
    database = mongoClient.db("bate-papo-uol")
    console.log(chalk.bold.yellowBright("Banco de dados conectado"))
})

promise.catch(e => console.log(chalk.red("Xabu"), e));


const schema = Joi.object().keys({
name: Joi.string().min(3)
});

app.post('/participants', (req, res) => {

    
    const {name} = req.body
    
    
    const {error, value} = schema.validate({name});
    
    if(error !== undefined){
        res.sendStatus(422)
        return;
    }
    
    const participants = {name, lastStatus: Date.now()}

  
    const promise = database.collection('participants').insertOne(participants)
    promise.then(confirmação => {
        console.log(confirmação);
        res.sendStatus(201)
    })
    promise.catch(e => {
        console.log(chalk.pink("deu ruim"), e);
        res.status(500)
    })

})


app.listen(5000 ,() =>{
console.log(chalk.bold.blue('Server listening on port 5000'));
})