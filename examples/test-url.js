const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/api/convert';
const OUTPUT_FILE = path.join(__dirname, 'example-com.pdf');
const TARGET_URL = 'https://example.com/';

async function convertUrl() {
  try {
    console.log(`Sending URL (${TARGET_URL}) to API for conversion...`);
    
    const response = await axios({
      method: 'post',
      url: API_URL,
      data: {
        url: TARGET_URL,
        filename: 'example-com.pdf',
        format: 'A4',
        printBackground: true
      },
      responseType: 'arraybuffer'
    });

    // Save the PDF to file
    fs.writeFileSync(OUTPUT_FILE, response.data);
    
    console.log(`PDF successfully saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error converting URL to PDF:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      try {
        const data = error.response.data.toString();
        console.error('Response:', data);
      } catch (e) {
        console.error('Cannot parse response data');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
  }
}

// Execute the test
convertUrl(); 