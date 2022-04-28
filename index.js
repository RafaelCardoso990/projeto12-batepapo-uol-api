import express from 'express'
import chalk from 'chalk';
import cors from 'cors'
import Joi from 'joi';

const app = express();
app.use(express.json());
app.use(cors());

const schema = Joi.object().keys({
name: Joi.string().min(1)
});

app.post('/participants', (req, res) => {

const {name} = req.body

const {error, value} = schema.validate({name});

if(error !== undefined){
res.sendStatus(422)
return;
}

console.log(value.name)

res.sendStatus(201)
})

app.listen(5000 ,() =>{
console.log(chalk.bold.blue('Server listening on port 5000'));
})