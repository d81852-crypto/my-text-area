const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

console.log("Starting Article Index build (v12.0 - Full Text)...");

// --- 1. Create mapping from index.html ---
const yearMap = {};
let fileNames = [];
try {
    const indexHtmlPath = path.join(__dirname, 'index.html');
    if (!fs.existsSync(indexHtmlPath)) {
        throw new Error("index.html file not found.");
    }

    const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
    const $index = cheerio.load(indexHtmlContent);

    $index('.part-button').each((i, el) => {
        const file = $index(el).attr('data-file');
        const name = $index(el).text();
        if (file && name) {
            yearMap[file] = name;
            fileNames.push(file);
        }
    });

    if (fileNames.length === 0) {
        throw new Error("No '.part-button' elements with 'data-file' found in index.html.");
    }
    console.log(`Found mapping for ${fileNames.length} files.`);

} catch (error) {
    console.error("CRITICAL ERROR reading index.html:", error.message);
    return;
}

const searchIndex = [];
let entryId = 0;
// Define *only* the main article heading selectors
const articleHeadingSelectors = 'h1, p.MsoHeading1';

// --- 2. Loop through each file ---
fileNames.forEach((fileName) => {
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) {
        console.warn(`WARNING: ${fileName} not found. Skipping.`);
        return;
    }

    console.log(`Reading file: ${fileName}...`);
    const htmlContent = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(htmlContent);
    const yearName = yearMap[fileName]; // Get the correct year name

    let currentHeading = `(מאמר פתיחה - ${yearName})`;
    let currentText = ""; // יצבור את כל הטקסט של המאמר
    let entryIdForFile = 0;

    // ** THE CRITICAL FIX (v12.0) **
    // Find *all* relevant elements, no matter how deep
    const elements = $('body').find(articleHeadingSelectors + ', p, h2, h3, h4, h5, h6, .MsoHeading2, .MsoHeading3, .MsoHeading4, .MsoHeading5, .MsoHeading6'); 

    elements.each((i, el) => {
        const $el = $(el);
        const elText = $el.text().trim();

        // 1. Is this element a main heading?
        if ($el.is(articleHeadingSelectors)) {
            // Yes. Save the *previous* article (if it had text)
            if (currentText.length > 0) {
                searchIndex.push({
                    id: entryId++,
                    year: yearName,
                    file: fileName,
                    heading: currentHeading,
                    text: currentText.toLowerCase() // שמור את כל הטקסט באותיות קטנות
                });
                entryIdForFile++;
            }
            // Start new article
            currentHeading = elText.length > 0 ? elText : "(כותרת ריקה)";
            currentText = ""; // Reset text accumulator
        } 
        // 2. Is it a paragraph/subheading with text?
        else if (elText.length > 0) {
            // Yes. Add its text to the current article's text
            currentText += elText + ' ';
        }
    });

    // 3. Save the very last article in the file
    if (currentText.length > 0) {
        searchIndex.push({
            id: entryId++,
            year: yearName,
            file: fileName,
            heading: currentHeading,
            text: currentText.toLowerCase()
        });
        entryIdForFile++;
    }

    console.log(`... Found ${entryIdForFile} articles in ${fileName}.`);
});

// --- 3. Save the file ---
fs.writeFileSync('search-index.json', JSON.stringify(searchIndex));

console.log(`
===================================================
Index build complete!
Created "search-index.json" with ${searchIndex.length} articles.
===================================================
`);