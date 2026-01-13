
const path = require('path');
const process = require('process');

const cwd = process.cwd();
const imagePath = "/uploads/test.png";
const joined = path.join(cwd, "public", imagePath);
console.log(`CWD: ${cwd}`);
console.log(`ImagePath: ${imagePath}`);
console.log(`Joined: ${joined}`);

// Test with manual slice
const cleanJoined = path.join(cwd, "public", imagePath.replace(/^\//, ''));
console.log(`Clean Joined: ${cleanJoined}`);
