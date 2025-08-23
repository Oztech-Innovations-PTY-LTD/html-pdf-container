# HTML to PDF Microservice API Documentation

## Overview

A Node.js/TypeScript microservice that converts HTML content or web pages to PDF using Puppeteer and Chromium.

## Base URL

- **Local Development**: `http://localhost:3000`
- **Container**: `http://localhost:3050`

## Endpoints

### POST /api/convert

Converts HTML content or a web page URL to PDF format.

#### Request Parameters

| Parameter         | Type    | Required | Default        | Description                                |
| ----------------- | ------- | -------- | -------------- | ------------------------------------------ |
| `html`            | string  | No\*     | -              | HTML content to convert to PDF             |
| `url`             | string  | No\*     | -              | URL of webpage to convert to PDF           |
| `filename`        | string  | No       | "document.pdf" | Name for the downloaded PDF file           |
| `format`          | string  | No       | "A4"           | PDF page format                            |
| `landscape`       | boolean | No       | false          | Whether to render in landscape orientation |
| `printBackground` | boolean | No       | true           | Whether to print background graphics       |
| `margin`          | object  | No       | 1cm all sides  | Page margins                               |
| `waitUntil`       | string  | No       | "networkidle0" | When to consider navigation complete       |

\*Either `html` or `url` must be provided.

#### Format Options

- `A4`, `A3`, `A2`, `A1`, `A0`
- `Letter`, `Legal`, `Tabloid`, `Ledger`

#### Margin Object Structure

```
{
  "top": string,    // e.g., "1cm", "10px", "0.5in"
  "right": string,
  "bottom": string,
  "left": string
}
```

#### waitUntil Options

- `load` - Navigation finished when the load event is fired
- `domcontentloaded` - Navigation finished when DOMContentLoaded event is fired
- `networkidle0` - No network connections for at least 500ms
- `networkidle2` - No more than 2 network connections for at least 500ms

#### Response Headers

- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename={filename}`
- **Content-Length**: `{buffer_length}`

#### Response Body

- **Success**: PDF file as binary data
- **Error**: JSON object with error details

#### Error Response Structure

```
{
  "error": string,
  "message": string (optional, development only)
}
```

#### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (missing required parameters)
- `500` - Internal Server Error

### GET /api/health

Returns the service health status.

#### Response

```
{
  "status": "ok"
}
```

## Environment Variables

| Variable   | Type   | Default      | Description      |
| ---------- | ------ | ------------ | ---------------- |
| `PORT`     | number | 3000         | Server port      |
| `NODE_ENV` | string | "production" | Environment mode |

## Request Limits

- **Body Size**: 50MB maximum
- **Content Types**: `application/json`, `application/x-www-form-urlencoded`

## CORS

Cross-Origin Resource Sharing is enabled for all origins.
