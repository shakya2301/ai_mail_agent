import readlinesync from 'readline-sync';
import OpenAI from 'openai';
import { directoryScanner, mailSender } from './mailer_tools/tools.js';
import { fetchAndParseEmails } from './mailer_tools/readmail.js';

import dotenv from 'dotenv';
dotenv.config();

const myMailDirectory = {
    "Kavya Shakya" : 'kavya.shakya23@gmail.com',
    "Ben Affleck" : 'con.kavya@gmail.com'
}


const client = new OpenAI({
    apiKey : process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
})


// TOOLS Dictionary.
const tools = {
    "mailSender" : mailSender,
    "directoryScanner" : directoryScanner,
    "mailReader" : fetchAndParseEmails
}

const SYSTEM_PROMPT = `
You are an AI email assistant with a structured communication workflow:
IF THE USER GREETS YOU GREET HIM/HER BACK AND TELL THEM WHAT YOU CAN DO AND ASK THEM HOW YOU CAN HELP THEM TODAY.

TOOLS AVAILABLE:
- directoryScanner(query: string): string
- mailSender(content: {subject : string , body : string , html : string}, receiverEmail: string): boolean
- mailReader(n: number): {senderEmail: string, emailContent: {subject: string, body: string, date: string}[]}[]

example usage: 
{"type": "action", "function": "directoryScanner", "input": {"name": "Ben"}}
{"type": "action", "function": "mailSender", "input": {"content": {"subject": "Test", "body": "This is a test mail", "html": "<h1>Test</h1>"}, "receiverEmail": "

Always use the action command with the input key containing the required parameters in an object with same name

COMMUNICATION PROTOCOL:
1. Understand user's email intent
2. Locate recipient's email address
3. Confirm recipient details
4. Generate email content
5. Get user confirmation
6. Send email
7. Greet the user cordially and ask for relevant information like subject and body of the email, if generated yourself, confirm with the user

WORKFLOW STEPS:
A. EMAIL ADDRESS RETRIEVAL
- Use directoryScanner to find recipient's email
- If email not found, ask user for correct email
- Confirm email address with user

B. EMAIL CONTENT GENERATION
- Request context/purpose of email
- Generate draft content
- Get user approval for content
- Allow user to modify draft

C. EMAIL SENDING
- Confirm all details (recipient, content)
- Use mailSender to send email
- Provide sending confirmation

D. EMAIL READING(WHEN USER ASKS FOR IT)
- Use mailReader to read the last n emails
- Always first provide a summary along with the senders email and the date of the email
- If and only if the user wants to read the email, provide the email content.

CRITICAL RESPONSE RULES:
- Always respond in valid, parseable JSON
- Follow sequence: Plan → Action → Observation → Reply
- Use waiting message when processing
- Be explicit about missing information
- Request user input when needed

RESPONSE TYPES:
- "plan": Describe next workflow step
- "action": Execute tool/function
- "reply": Request user input
- "observation": Report tool/action result
- "generation": Create draft content
- "output": Conclude task
- "waiting": Notify user of processing time
- "end": Terminate conversation ONLY IF USER SAYS "BYE" , or "END" or "QUIT", or something like that. 

EXAMPLE FLOW:
{"type": "plan", "plan": "Find Ben's email address"}
{"type": "action", "function": "directoryScanner", "input": "Ben"}
{"type": "reply", "reply": "I found Ben Affleck's email. Confirm: con.kavya@gmail.com?"}
{"type" : "waiting" , "waiting" : A good waiting message like, hang tight while I work on this"} %% USE THIS WHEN YOU ARE PROCESSING SOMETHING LIKE SENDING EMAIL OR LOOKING UP THE DIRECTORY.

CRITICAL: NO ADDITIONAL CHARACTERS BEFORE/AFTER JSON OBJECT. ENSURE THAT WHEN CONFIRMING THE HTML CONTENT, SKIP THE TAGS JUST SHOW THE CONTENT INSIDE THE TAGS AND DESCRIBE THE STYLING IN WORDS.
`

let messages = [
    {
        'role' : 'system',
        content : SYSTEM_PROMPT
    }
]

outerloop:
while(true)
{
    const query = readlinesync.question("You : ");
    const q = {
        'type' : 'user',
        'user' : query
    }

    messages.push({
        'role' : 'user',
        content : JSON.stringify(q)
    })

    while(true)
    {
        const response = await client.chat.completions.create({
            model : 'llama-3.3-70b-versatile',
            messages : messages,
            response_format : {type : 'json_object'}
        })

        const chat = response.choices[0].message.content;
        const chatJson = JSON.parse(chat);
        // console.log("Model Response : ", chat , "datatype : ", typeof(chat));


        messages.push({
            'role' : 'user',
            content : chat
        })

        if(chatJson.type == "action")
        {
            const tool = tools[chatJson.function];
            // console.log(`Executing : ${chatJson.function}`);

            let observationResult;
            if(chatJson.function === "directoryScanner")
            {
                observationResult = tool(chatJson.input.name);
            }
            else if(chatJson.function === "mailSender")
            {
                observationResult = await tool(chatJson.input.content, chatJson.input.receiverEmail);
            }
            else if(chatJson.function === "mailReader")
            {
                observationResult = await tool(chatJson.input.n);
            }
            messages.push({
                'role' : 'assistant',
                content : JSON.stringify({
                    'type' : 'observation',
                    'observation' : observationResult
                })
            })
        }

        else if(chatJson.type == "reply")
        {
            console.log("Bot : ", chatJson.reply);
            messages.push({
                'role' : 'assistant',
                content : JSON.stringify({
                    'type' : 'reply',
                    'reply' : chatJson.reply
                })
            })
            break;
        }
        else if (chatJson.type == "output")
        {
            console.log("Bot : ", chatJson.output);
            break;
        }
        else if(chatJson.type == "waiting")
        {
            console.log("Bot : ", chatJson.waiting);
        }
        else if(chatJson.type == "end")
        {
            break outerloop;
        }
    }
}
