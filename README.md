# Pull Data from Google Sheets

This project utilizes Express, `googleapis`, and `@google-cloud/local-auth` for fetching data from Google Sheets.

## Getting Started

Follow these steps to set up the project:

1. Clone the repository: `git clone git@github.com:itbel/gs-backend.git`
2. Install dependencies: Run `npm install`
3. Create an OAuth 2.0 client for desktop applications.
4. Download the credentials and save them as `credentials.json` in the project's root directory.
5. Start the development server: Execute `npm run dev`
6. On the initial request, a browser window will open for authentication. Once authenticated, `token.json` will be generated and saved.

## API Endpoints

The application provides the following endpoints:

- `/post/:sheetId` - Fetches all posts from the specified Google Sheet.
- `/post/:sheetId/:postId` - Fetches a specific post from the Google Sheet.

### Parameters

- `sheetId`: Your Google Sheet ID, which is available in the URL of your Google Sheet.
- `postId`: The row number in the Google Sheet that you want to retrieve.

## Customization

To add more columns or modify the data retrieval process, you'll need to make changes to the `listPosts` and `listPost` functions.

## Additional Information

- This project is designed primarily for fun and local development purposes.
- Once `credentials.json` is added to the root directory, the application will automatically generate `token.json`.
- For more information on the Google Sheets API, click [here](https://developers.google.com/sheets/api/quickstart/nodejs).
