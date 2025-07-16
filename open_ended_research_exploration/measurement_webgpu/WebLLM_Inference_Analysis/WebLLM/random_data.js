const fs = require('fs');
const path = require('path');

// Function to get random objects
function getRandomObjects(jsonArray, numObjects) {
    const arrayCopy = [...jsonArray]; 
    for (let i = arrayCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }
    return arrayCopy.slice(0, numObjects);
}

// Function to create 10 random files
function createRandomFiles(jsonArray, outputDirectory, numFiles, objectsPerFile) {
    for (let i = 1; i <= numFiles; i++) {
        const fileName = `alpaca_${String(i).padStart(3, '0')}.json`;
        const filePath = path.join(outputDirectory, fileName);
        const randomObjects = getRandomObjects(jsonArray, objectsPerFile);
        fs.writeFile(filePath, JSON.stringify(randomObjects, null, 2), (err) => {
            if (err) {
                console.error(`Error writing file ${fileName}:`, err);
            } else {
                console.log(`File created: ${filePath}`);
            }
        });
    }
}

const inputFilePath = path.join(__dirname, 'alpaca_data_cleaned.json'); // Replace with your input file path
const outputDirectory = path.join(__dirname, 'test1'); // Replace with your desired output directory
if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
}

fs.readFile(inputFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    try {
       
        const jsonData = JSON.parse(data);
        createRandomFiles(jsonData, outputDirectory, 5, 10);
    } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
    }
});
