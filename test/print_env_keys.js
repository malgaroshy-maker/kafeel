import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
console.log('Env keys:', envFile.split('\n').map(l => l.split('=')[0].trim()).filter(Boolean));
