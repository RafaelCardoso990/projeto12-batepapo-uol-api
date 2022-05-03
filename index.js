import express, {json} from 'express'
import chalk from 'chalk';
import cors from 'cors'
import joi from 'joi';
import { MongoClient } from 'mongodb';
import dayjs from 'dayjs'
import dotenv from 'dotenv'



dotenv.config();

const app = express();
app.use(json());
app.use(cors());


const mongoClient = new MongoClient(process.env.mongo_url);
let database;

let lastStatus = Date.now();

const schemaMessage = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid("message", "private_message").required(),
    from: joi.string().min(1).required()
});

const schemaParticipant = joi.object({
    name: joi.string().required(),
    lastStatus: joi.number().integer().required()
});

app.post("/participants", async (req, res) => {
    
    const {name} = req.body    

    let participants = {name, lastStatus}
    
    try{  
        await mongoClient.connect()
        database = mongoClient.db(process.env.banco_mongo)
       
        const nameExist = await database.collection("participants").findOne({name})
        
        if(nameExist){
            console.log('Usuario ja existe!')   
            return res.sendStatus(409)
        }

        const verification = schemaParticipant.validateAsync(participants)

        if(verification){
            await database.collection("participants").insertOne(participants)
            await database.collection("message").insertOne({
                from: name,
                to: 'Todos',
                text: 'entra na sala...',
                type: 'status',
                time: dayjs(lastStatus).format("HH:mm:ss")})
        }

        res.sendStatus(201)
        console.log("deu")
        
    } catch(e) {
        
        console.log(("deu ruim"), e);
        res.status(422)
        
    }  
   
})

app.get("/participants", async (req, res) => {
    
    try {
        await mongoClient.connect()
        database = mongoClient.db(process.env.banco_mongo)

        const participantes = await database.collection("participants").find({}).toArray();
      
        res.send(participantes)    
        
    } catch(e){
        
        console.log("Deu ruim", e)
        res.sendStatus(500)
    }
    
})

app.post("/messages", async (req, res) => {        
    const {to, text, type} = req.body
    const {user} = req.headers

    const message = {
        from: user,
        to: to,
        text: text,
        type: type,
        time: dayjs().format("hh:mm:ss")
    }
    
    console.log(message)
    
    try{  
        mongoClient.connect()
        database = mongoClient.db(process.env.banco_mongo)

        const userExist = await database.collection("participants").findOne({user})

        if(!userExist){
            console.log("Usuario não existe!")
        }

        const verification = schemaMessage.validateAsync({to, text, type, from: user})
        if(verification){
            await database.collection("message").insertOne(message)            
        }
        res.sendStatus(201)
        
    } catch(e) {
        
        console.log(chalk.pink("deu ruim"), e);
        res.status(422)
        
    }  
    
    
})

app.get("/messages", async (req, res) => {
    const {limit} = req.query 
    const {user} = req.headers

    console.log(limit)

    try {
        mongoClient.connect()
        database = mongoClient.db(process.env.banco_mongo)

        const userTo = await database.collection("message").findOne({to: user})
        const userFrom = await database.collection("message").findOne({from: user})

        if(!userTo && !userFrom){
            res.sendStatus(404)
        }

        function filtered(arrayMessage, type) {
            if (!arrayMessage) return true;
            return arrayMessage === type;
        }

        const messages = await database.collection("message").find({}).toArray();
        
        const filteredMessages = messages.filter(message => {
            return filtered(message.type, "status")
                || filtered(message.type, "message")
                || (filtered(message.to, user) && filtered(message.type, "private_message"))
                || (filtered(message.from, user) && filtered(message.type, "private_message"));
        });

        const allMessages = filteredMessages.slice(filteredMessages.length - limit, filteredMessages.length);
        
        if (!limit) {
            return res.send(filteredMessages);
        }
        res.send(allMessages);


        
    } catch (e) {
        console.error(e);
        res.sendStatus(422);

    }
})

app.post("/status", async (req,res) =>{
    const {user} = req.headers
   
    try{
        await mongoClient.connect();
        database = mongoClient.db(process.env.banco_mongo)

        const participant = await database.collection("participants").findOne({name: user});
        if(!participant){
            res.sendStatus(404)
            return
        }
        await database.collection("participants").updateOne({name: user}, {$set: {lastStatus:Date.now()}})
        res.sendStatus(200)
        
    } catch(e){
        console.log(e)
        res.sendStatus(422)
    }
})

setInterval(async () => {
    try {
        await mongoClient.connect();
        database = mongoClient.db(process.env.banco_mongo);
        console.log("entrou")


        const participantes = await database.collection("participants").find({}).toArray();
        console.log(participantes)

        const filteredParticipants = participantes.filter(participant => {
            if (parseInt(participant.lastStatus) + 10000 <= parseInt(lastStatus)) {
                return participant;
            }
        })
        

        if (filteredParticipants.length > 0) {

            filteredParticipants.map(participant => {

                database.collection("participants").deleteOne({ name: participant.name });

                database.collection("message").insertOne({ 
                    from: participant.name,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time: dayjs(lastStatus).format("HH:mm:ss") });

                console.log(`Usuário ${participant.name} retirado da sala por inatividade!`);
            })
        }
    } catch (e) {
        console.error(e);
    }
}, 15000);

app.delete("/messages/:ID_DA_MENSAGEM", async (req,res) => {
    const {user} = req.headers
    const id = req.params
    

    try{
    await mongoClient.connect()
    database = mongoClient.db(process.env.banco_mongo);
    
    const search = await database.collection("message").findOne({_id: new ObjectId(id)})
    if(!search){
        return res.sendStatus(404)
    }
    
    if(search.from !== user){
        return res.sendStatus(401)
    }
    
    await database.collection("message").deleteOne({_id: new ObjectId(id)})
    res.sendStatus(200)
    
    } catch(e){
        res.status(422)
    }
   
})



app.listen(process.env.porta ,() =>{
    console.log(chalk.bold.blue('Server listening on port', process.env.porta));
})