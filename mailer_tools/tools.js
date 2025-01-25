import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const myMailDirectory = {
    "Kavya Shakya" : 'kavya.shakya23@gmail.com',
    "Ben Affleck" : 'con.kavya@gmail.com'
}

function directoryScanner(query = "") {
    // Trim and create case-insensitive regex with flexible matching
    const sanitizedQuery = query.trim().replace(/\s+/g, '.*');
    const queryRegex = new RegExp(sanitizedQuery, 'i');

    // Enhanced matching using regex
    const matches = Object.entries(myMailDirectory).filter(([name, email]) => 
        queryRegex.test(name.replace(/\s+/g, ''))
    );

    if (matches.length === 0) return 'not found';
    if (matches.length === 1) return matches[0][1];
    
    // Return multiple matches with names and emails
    return matches.map(([name, email]) => `${name}: ${email}`).join('; ');
}

async function mailSender(content = {subject: "" , body : "" , html : ""}, recieverEmail = "")
{
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth : {
                user : process.env.USER_EMAIL,
                pass: process.env.USER_PASSWORD
            }
        })
        
        try {
            // Validate inputs
            if (!recieverEmail || !content.subject) {
                console.log("Missing required email or subject");
                return false;
            }
            
            const info = await transporter.sendMail({
                from: process.env.USER_NAME,
                to: `${recieverEmail}`,
                subject: content.subject,
                text: content.body || '', 
                html: content.html || ''
            });
            
            // console.log("Message sent: %s", info.messageId);
            
            // Check if the message was actually sent
            return info.messageId ? true : false;
        } catch (error) {
            // console.error("Email sending failed:", error);
            return false;
        }
}

export { directoryScanner, mailSender };

// console.log(directoryScanner("kav"));