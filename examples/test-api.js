const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Read the sample HTML file
const htmlContent = fs.readFileSync(path.join(__dirname, 'sample.html'), 'utf8');

// Configuration
const API_URL = 'http://100.80.0.56:3050/api/convert';
const OUTPUT_FILE = path.join(__dirname, 'output.pdf');

async function convertHtml() {
  try {
    console.log('Sending HTML content to API...');

    const response = await axios({
      method: 'post',
      url: API_URL,
      data: {
        html: htmlContent,
        filename: 'test-output.pdf',
        format: 'A4',
        printBackground: true
      },
      responseType: 'arraybuffer'
    });

    // Save the PDF to file
    fs.writeFileSync(OUTPUT_FILE, response.data);

    console.log(`PDF successfully saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error converting HTML to PDF:');
    console.error(error);

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
convertHtml(); 