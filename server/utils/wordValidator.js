const fs = require('fs');
const path = require('path');

// Load the words into memory once when the server starts
let validWords = new Set();

try {
    const filePath = path.join(__dirname, '../data/Allnorepeat.txt');
    const data = fs.readFileSync(filePath, 'utf8');

    // Regex to find only 4-letter all-caps words (ignoring tags)
    const matches = data.match(/\b[A-Z]{4}\b/g);
    
    if (matches) {
        matches.forEach(word => validWords.add(word));
        console.log(`✅ Dictionary Loaded: ${validWords.size} valid words.`);
    }
} catch (err) {
    console.error("❌ Could not load word list:", err.message);
}

module.exports = {
    isValid: (word) => {
        if (!word) return false;
        return validWords.has(word.toUpperCase());
    },
    getRandomWord: () => {
        const items = Array.from(validWords);
        return items[Math.floor(Math.random() * items.length)];
    }
};