const path = require('path');
const fs = require('fs');

console.log("--- STARTING DICTIONARY TEST ---");

// 1. Calculate the path
const filePath = path.join(__dirname, 'data', 'Allnorepeat.txt');
console.log(`Checking file at path: ${filePath}`);

// 2. Check if file exists
if (fs.existsSync(filePath)) {
    console.log("✅ File FOUND!");
    
    // 3. Try reading it
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        console.log(`File read successfully. Length: ${data.length} characters.`);
        
        // 4. Try parsing it (The Regex Logic)
        const matches = data.match(/\b[A-Z]{4}\b/g);
        if (matches) {
            console.log(`✅ SUCCESS! Found ${matches.length} valid words.`);
            console.log(`First 5 words: ${matches.slice(0, 5).join(", ")}`);
        } else {
            console.error("❌ File read, but NO 4-letter words found by Regex.");
        }

    } catch (readErr) {
        console.error("❌ File exists but could not be read:", readErr.message);
    }
} else {
    console.error("❌ FILE NOT FOUND. Please check the 'data' folder.");
    console.log("Current directory is:", __dirname);
    console.log("Expected folder structure:");
    console.log("  server/");
    console.log("    ├── test_dict.js");
    console.log("    └── data/");
    console.log("          └── Allnorepeat.txt");
}

console.log("--- END TEST ---");